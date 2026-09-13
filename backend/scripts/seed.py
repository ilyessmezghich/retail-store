"""Seed an initial admin user and a few sample products.

Run from the backend directory with the venv active:

    source .venv/bin/activate
    ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret python scripts/seed.py

Defaults to ADMIN_EMAIL/ADMIN_PASSWORD from the environment (or .env).
The admin user is created only if no user with that email exists.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.api.auth import hash_password
from app.db.models import Product, User
from app.db.session import SessionLocal

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin-password-123")

SAMPLE_PRODUCTS = [
    {
        "name": "Stainless Steel Water Bottle",
        "slug": "stainless-steel-water-bottle",
        "description": "Insulated 750ml bottle that keeps drinks cold for 24 hours.",
        "price_cents": 2499,
        "currency": "usd",
        "image_url": "https://picsum.photos/seed/bottle/600/450",
        "stock": 25,
    },
    {
        "name": "Canvas Tote Bag",
        "slug": "canvas-tote-bag",
        "description": "Heavy-duty 100% cotton tote, perfect for groceries or the beach.",
        "price_cents": 1599,
        "currency": "usd",
        "image_url": "https://picsum.photos/seed/tote/600/450",
        "stock": 40,
    },
    {
        "name": "Ceramic Coffee Mug",
        "slug": "ceramic-coffee-mug",
        "description": "12oz hand-glazed ceramic mug with a comfortable handle.",
        "price_cents": 1299,
        "currency": "usd",
        "image_url": "https://picsum.photos/seed/mug/600/450",
        "stock": 60,
    },
    {
        "name": "Wireless Charging Pad",
        "slug": "wireless-charging-pad",
        "description": "15W Qi-certified fast wireless charger with a non-slip surface.",
        "price_cents": 2999,
        "currency": "usd",
        "image_url": "https://picsum.photos/seed/charger/600/450",
        "stock": 15,
    },
]


def _create_admin() -> None:
    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == ADMIN_EMAIL.lower()))
        if existing is not None:
            print(f"Admin user already exists: {existing.email}")
            return
        user = User(
            email=ADMIN_EMAIL.lower(),
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"Created admin user: {user.email} (role=admin)")


def _create_products() -> None:
    with SessionLocal() as db:
        created = 0
        for payload in SAMPLE_PRODUCTS:
            existing = db.scalar(
                select(Product).where(Product.slug == payload["slug"])
            )
            if existing is not None:
                continue
            db.add(Product(**payload))
            created += 1
        db.commit()
        print(f"Created {created} sample products")


def main() -> None:
    _create_admin()
    _create_products()


if __name__ == "__main__":
    main()