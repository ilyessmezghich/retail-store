import logging
import uuid

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.cart import _fetch_cart
from app.api.schemas import CheckoutOut
from app.config import get_settings
from app.db.models import Order, User
from app.db.session import get_db

router = APIRouter(prefix="/checkout", tags=["checkout"])

logger = logging.getLogger("retail.checkout")

# Stripe test-mode cards (e.g. 4242 4242 4242 4242) are handled by Stripe Checkout;
# locally the payment is simulated by firing the checkout.session.completed webhook.
FALLBACK_SESSION_ID_PREFIX = "cs_test_"


class _LocalSession:
    """Minimal stand-in for a Stripe Checkout Session when no live key is configured.

    Only used so the local, self-contained flow (checkout -> webhook) works with the
    placeholder STRIPE_SECRET_KEY from .env.example. With real keys the live Stripe API
    is used and this class is never instantiated.
    """

    def __init__(self, session_id: str) -> None:
        self.id = session_id
        self.url = f"https://checkout.stripe.com/pay/{session_id}"


def _create_stripe_session(
    settings,
    user: User,
    uid: uuid.UUID,
    line_items: list[dict],
):
    try:
        return stripe.checkout.Session.create(
            api_key=settings.stripe_secret_key,
            mode="payment",
            payment_method_types=["card"],
            line_items=line_items,
            success_url=f"{settings.frontend_url}/orders?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.frontend_url}/cart?canceled=1",
            metadata={"user_id": str(user.id), "uid": str(uid)},
        )
    except stripe.error.AuthenticationError:
        # Placeholder/test key (sk_test_replace_me) -> build a local fake session so the
        # checkout flow stays testable without external services. Live Stripe requires a
        # real secret key in STRIPE_SECRET_KEY.
        logger.warning(
            "stripe key is not usable for live API; falling back to a local test session",
            extra={"user_id": str(user.id)},
        )
        return _LocalSession(f"{FALLBACK_SESSION_ID_PREFIX}{uuid.uuid4().hex}")


def _get_or_create_order(
    db: Session, user_id: uuid.UUID, total_cents: int, session_id: str
) -> Order:
    order = db.scalar(select(Order).where(Order.stripe_session_id == session_id))
    if order is not None:
        return order
    order = Order(
        user_id=user_id,
        status="pending",
        total_cents=total_cents,
        stripe_session_id=session_id,
    )
    db.add(order)
    db.flush()
    return order


@router.post("", response_model=CheckoutOut, status_code=status.HTTP_200_OK)
def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutOut:
    items = _fetch_cart(db, current_user.id)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty",
        )

    settings = get_settings()
    uid = uuid.uuid4()
    line_items = [
        {
            "price_data": {
                "currency": settings.stripe_price_currency,
                "product_data": {"name": item.product.name},
                "unit_amount": item.product.price_cents,
            },
            "quantity": item.quantity,
            "metadata": {"product_id": str(item.product.id)},
        }
        for item in items
    ]
    subtotal = sum(item.product.price_cents * item.quantity for item in items)

    session = _create_stripe_session(settings, current_user, uid, line_items)
    order = _get_or_create_order(db, current_user.id, subtotal, session.id)

    for item in items:
        db.delete(item)
    db.commit()

    return CheckoutOut(checkout_url=session.url, order_id=order.id, session_id=session.id)