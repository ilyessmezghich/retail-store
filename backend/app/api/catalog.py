import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Product, User
from app.db.session import get_db
from app.api.auth import admin_required
from app.api.schemas import (
    ProductCreate,
    ProductListOut,
    ProductOut,
    ProductUpdate,
    StockDelta,
)

public_router = APIRouter(prefix="/products", tags=["catalog"])
admin_router = APIRouter(prefix="/admin/products", tags=["admin"])


def _get_product_or_404(db: Session, product_id: uuid.UUID, *, archived: bool | None = None) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if archived is not None and product.archived != archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _paginate(db: Session, stmt, page: int, size: int) -> tuple[list[Product], int]:
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Product.created_at.desc(), Product.id.desc()).offset((page - 1) * size).limit(size)
    ).all()
    return list(rows), total


@public_router.get("", response_model=ProductListOut)
def list_products(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ProductListOut:
    stmt = select(Product).where(Product.archived.is_(False))
    rows, total = _paginate(db, stmt, page, size)
    return ProductListOut(
        items=rows,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size if total else 0,
    )


@public_router.get("/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)) -> Product:
    product = db.scalar(
        select(Product).where(Product.slug == slug, Product.archived.is_(False))
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@admin_router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> Product:
    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product with this slug already exists",
        )
    db.refresh(product)
    return product


@admin_router.get("", response_model=ProductListOut)
def list_all_products(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> ProductListOut:
    stmt = select(Product)
    rows, total = _paginate(db, stmt, page, size)
    return ProductListOut(
        items=rows,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size if total else 0,
    )


@admin_router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> Product:
    product = _get_product_or_404(db, product_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product with this slug already exists",
        )
    db.refresh(product)
    return product


@admin_router.delete("/{product_id}", response_model=ProductOut)
def archive_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> Product:
    product = _get_product_or_404(db, product_id)
    product.archived = True
    db.commit()
    db.refresh(product)
    return product


@admin_router.patch("/{product_id}/stock", response_model=ProductOut)
def adjust_stock(
    product_id: uuid.UUID,
    payload: StockDelta,
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> Product:
    product = _get_product_or_404(db, product_id)
    new_stock = product.stock + payload.delta
    if new_stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock cannot go below zero",
        )
    db.execute(
        update(Product).where(Product.id == product_id).values(stock=new_stock)
    )
    db.commit()
    db.refresh(product)
    return product