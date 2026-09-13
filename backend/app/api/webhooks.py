import logging
from decimal import Decimal

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Order, OrderItem, Product
from app.db.session import get_db

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

logger = logging.getLogger("retail.webhooks")


def _as_dict(value) -> dict:
    if isinstance(value, dict):
        return value
    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        return to_dict()
    return dict(value)


def _line_items_from_payload(session: dict) -> list[dict]:
    line_items = session.get("line_items") or {}
    if not isinstance(line_items, dict):
        return []
    return [_as_dict(item) for item in (line_items.get("data") or [])]


def _fetch_line_items(settings, session: dict) -> list[dict]:
    """Prefer authoritative line items from the Stripe API, fall back to the event payload."""
    try:
        retrieved = stripe.checkout.Session.retrieve(
            session["id"], expand=["line_items"], api_key=settings.stripe_secret_key
        )
        data = _line_items_from_payload(_as_dict(retrieved))
        if data:
            return data
    except stripe.error.StripeError:
        logger.warning(
            "could not retrieve session line items from Stripe API; using event payload",
            extra={"session_id": session.get("id")},
        )
    return _line_items_from_payload(session)


def _extract_product_id(line: dict) -> str | None:
    metadata = line.get("metadata")
    if isinstance(metadata, dict):
        product_id = metadata.get("product_id")
        if product_id:
            return str(product_id)
    return None


def _extract_unit_amount(line: dict) -> int:
    price = line.get("price") or {}
    unit_amount = price.get("unit_amount") if isinstance(price, dict) else None
    if unit_amount is not None:
        return int(unit_amount)
    amount_total = line.get("amount_total")
    quantity = int(line.get("quantity") or 1)
    if amount_total is not None and quantity:
        return int(Decimal(amount_total) // quantity)
    return 0


def _extract_name(line: dict) -> str | None:
    name = line.get("description")
    price = line.get("price") or {}
    if not name and isinstance(price, dict):
        name = price.get("product_name") or price.get("name")
    return str(name) if name else None


def _complete_order(db: Session, order: Order, line_items: list[dict]) -> None:
    for line in line_items:
        quantity = int(line.get("quantity") or 0)
        unit_amount = _extract_unit_amount(line)
        name = _extract_name(line)
        product = None
        product_id = _extract_product_id(line)
        if product_id:
            product = db.get(Product, product_id)
        if product is None and name:
            product = db.scalar(
                select(Product).where(
                    Product.name == name, Product.price_cents == unit_amount
                )
            )
        if product is None:
            raise ValueError(f"Cannot resolve product for line item {line}")

        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=name or product.name,
                price_cents=unit_amount,
                quantity=quantity,
            )
        )
        remaining = max(product.stock - quantity, 0)
        if remaining != product.stock - quantity:
            logger.warning(
                "stock capped at zero while fulfilling order",
                extra={"product_id": str(product.id), "order_id": str(order.id)},
            )
        product.stock = remaining

    order.status = "paid"


@router.post("/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        logger.warning("invalid stripe webhook signature", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe signature",
        )

    if event["type"] != "checkout.session.completed":
        return {"received": True}

    session = _as_dict(event["data"]["object"])
    session_id = session.get("id")
    if not session_id:
        logger.error("checkout.session.completed missing session id")
        return {"received": True}

    order = db.scalar(
        select(Order)
        .where(Order.stripe_session_id == session_id)
        .with_for_update()
    )
    if order is None:
        logger.warning(
            "no order found for checkout session; ignoring",
            extra={"session_id": session_id},
        )
        return {"received": True}

    if order.status == "paid":
        logger.info(
            "order already paid; idempotent replay ignored",
            extra={"order_id": str(order.id)},
        )
        return {"received": True}

    line_items = _fetch_line_items(settings, session)
    if not line_items:
        logger.error(
            "no line items available to fulfill order",
            extra={"order_id": str(order.id), "session_id": session_id},
        )
        return {"received": True}

    try:
        _complete_order(db, order, line_items)
        db.commit()
        logger.info(
            "order completed",
            extra={"order_id": str(order.id), "session_id": session_id},
        )
    except Exception:
        db.rollback()
        logger.exception(
            "failed to complete order; returning 200 so Stripe retries",
            extra={"order_id": str(order.id), "session_id": session_id},
        )
    return {"received": True}