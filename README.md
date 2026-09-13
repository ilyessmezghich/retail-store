# Retail Store

Simple retailing website with a physical-product catalog, cart, and Stripe-powered checkout.

Monorepo layout:

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI + SQLAlchemy 2.0 + Alembic REST API |
| `frontend/` | Vite + React + TypeScript SPA |
| `nginx/` | Reverse proxy (`/` → frontend, `/api` → backend) |
| `docker-compose.yml` | Postgres 16 + backend + frontend + nginx |

## Stack

- **Backend:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16
- **Frontend:** React + TypeScript on Vite
- **Payments:** Stripe Checkout (test mode)
- **Auth:** JWT + bcrypt

## Quick start

```bash
cp .env.example .env          # fill in secrets (JWT_SECRET, Stripe test keys)
docker compose up --build
```

Services:

| Service | URL |
|---------|-----|
| nginx (entrypoint) | http://localhost:8080 |
| frontend (SPA) | http://localhost:3000 |
| backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/api/docs |
| PostgreSQL | localhost:5432 |

Health check:

```bash
curl http://localhost:8080/api/v1/health   # -> {"status":"ok"}
```

## Backend (local, without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://retail:retail_dev_password@localhost:5432/retail
export JWT_SECRET=dev-secret STRIPE_SECRET_KEY=sk_test_x STRIPE_WEBHOOK_SECRET=whsec_x
export FRONTEND_URL=http://localhost:3000 BACKEND_URL=http://localhost:8000
alembic upgrade head
uvicorn app.main:app --reload
```

## Frontend (local)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # type-check + production build to dist/
```

## Migrations

Initial revision `0001_initial` creates `users`, `products`, `cart_items`, `orders`, `order_items`
with unique email, unique product slug, unique `(user_id, product_id)` cart lines, and unique
`stripe_session_id`.

```bash
cd backend
alembic upgrade head          # apply
alembic revision --autogenerate -m "change"   # new migration from models
```

## Configuration

All settings are environment variables — see `.env.example`. Never commit a real `.env`.
Required at runtime: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`FRONTEND_URL`, `BACKEND_URL` (plus `STRIPE_PRICE_CURRENCY=usd`).

## Project status

Epic A (foundation) — backend skeleton with `/health`, DB models + initial Alembic migration,
frontend scaffold, Docker Compose wiring, reverse proxy. Auth/catalog/cart/checkout land in
Epics B–E.