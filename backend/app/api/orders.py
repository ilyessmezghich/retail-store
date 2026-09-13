import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.auth import get_current_user
from app.api.schemas import OrderItemOut, OrderListOut, OrderOut
from app.db.models import Order, User
from app.db.session import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


def _serialize(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        status=order.status,
        total_cents=order.total_cents,
        stripe_session_id=order.stripe_session_id,
        created_at=order.created_at,
        items=[
            OrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                price_cents=item.price_cents,
                quantity=item.quantity,
                line_total_cents=item.price_cents * item.quantity,
            )
            for item in order.items
        ],
    )


@router.get("", response_model=OrderListOut)
def list_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderListOut:
    orders = db.scalars(
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc(), Order.id.desc())
    ).all()
    items = [_serialize(order) for order in orders]
    return OrderListOut(items=items, total=len(items))


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items))
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    return _serialize(order)