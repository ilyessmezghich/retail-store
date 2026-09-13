import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.auth import get_current_user
from app.api.schemas import CartItemAdd, CartItemOut, CartItemUpdate, CartOut
from app.db.models import CartItem, Product, User
from app.db.session import get_db

router = APIRouter(prefix="/cart", tags=["cart"])


def _get_active_product_or_404(db: Session, product_id: uuid.UUID) -> Product:
    product = db.get(Product, product_id)
    if product is None or product.archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _get_own_cart_item(db: Session, current_user: User, item_id: uuid.UUID) -> CartItem:
    item = db.scalar(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == current_user.id)
    )
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )
    return item


def _fetch_cart(db: Session, user_id: uuid.UUID) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .where(CartItem.user_id == user_id)
            .options(joinedload(CartItem.product))
            .order_by(CartItem.created_at.asc())
        ).all()
    )


def _to_out(item: CartItem) -> CartItemOut:
    product = item.product
    return CartItemOut(
        id=item.id,
        product_id=product.id,
        name=product.name,
        slug=product.slug,
        price_cents=product.price_cents,
        currency=product.currency,
        image_url=product.image_url,
        quantity=item.quantity,
        line_total_cents=product.price_cents * item.quantity,
    )


def _cart_out(items: list[CartItem]) -> CartOut:
    enriched = [_to_out(item) for item in items]
    return CartOut(
        items=enriched,
        total_cents=sum(item.line_total_cents for item in enriched),
        count=sum(item.quantity for item in enriched),
    )


@router.get("", response_model=CartOut)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartOut:
    return _cart_out(_fetch_cart(db, current_user.id))


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    payload: CartItemAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartOut:
    product = _get_active_product_or_404(db, payload.product_id)

    existing = db.scalar(
        select(CartItem).where(
            CartItem.user_id == current_user.id,
            CartItem.product_id == payload.product_id,
        )
    )
    new_quantity = (existing.quantity if existing is not None else 0) + payload.quantity
    if new_quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock: only {product.stock} available",
        )

    if existing is None:
        existing = CartItem(
            user_id=current_user.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(existing)
    else:
        existing.quantity = new_quantity

    db.commit()
    return _cart_out(_fetch_cart(db, current_user.id))


@router.patch("/items/{item_id}", response_model=CartOut)
def update_cart_item(
    item_id: uuid.UUID,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartOut:
    item = _get_own_cart_item(db, current_user, item_id)
    product = item.product
    if product.archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if payload.quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock: only {product.stock} available",
        )
    item.quantity = payload.quantity
    db.commit()
    return _cart_out(_fetch_cart(db, current_user.id))


@router.delete("/items/{item_id}", response_model=CartOut)
def delete_cart_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartOut:
    item = _get_own_cart_item(db, current_user, item_id)
    db.delete(item)
    db.commit()
    return _cart_out(_fetch_cart(db, current_user.id))