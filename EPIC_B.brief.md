# Epic B — Catalog & Auth (task for opencode)

Continue the Retail Store project already scaffolded in /opt/retail-store (Epic A done). Read SDD.md context (kept in docs/ if present; else rely on existing backend/app structure).

Build on the existing FastAPI backend (SQLAlchemy 2.0 models already defined: User, Product, CartItem, Order, OrderItem).

## Backend tasks
1. **Auth module** — app/api/auth.py:
   - POST /api/v1/auth/register  → create user (email, password), bcrypt-hash password, role default 'user'
   - POST /api/v1/auth/login     → verify credentials, return JWT {access_token, token_type}
   - GET  /api/v1/auth/me        → current user (JWT-protected)
   - Dependencies: passlib[bcrypt], python-jose, pydantic-settings for JWT_SECRET; token is Bearer in Authorization header.
   - Add a get_current_user dependency + admin_required dependency (checks role=='admin').
2. **Catalog + product admin** — app/api/catalog.py:
   - GET  /api/v1/products?page=&size=  → paginated list of non-archived products (order by created desc)
   - GET  /api/v1/products/{slug}      → product detail (404 if archived/not found)
   - Admin-only:
     - POST   /api/v1/admin/products            → create product
     - GET    /api/v1/admin/products            → list all incl archived (paginated)
     - PUT    /api/v1/admin/products/{id}       → update product
     - DELETE /api/v1/admin/products/{id}       → soft-archive (set archived=true)
     - PATCH  /api/v1/admin/products/{id}/stock → adjust stock {delta:int}
   - Pydantic schemas in app/api/schemas.py (ProductCreate, ProductUpdate, ProductOut, StockDelta, UserCreate, Token).
   - Wire routers into app/main.py create_app (include at /api/v1).

## Frontend tasks (React/TS)
1. Bootstrap API client (fetch wrapper) hitting /api/v1 via the nginx /api proxy.
2. Catalog page (/) — fetch & render product grid (name, price, image), link to detail.
3. Product detail page (/products/:slug) — fetch by slug, show description + stock + price.
4. Auth pages: /login and /register forms calling the auth endpoints; store token (localStorage or cookie helper); NavBar shows Sign in / Log out.
5. React Router for routes; a simple auth context/store.

## Acceptance criteria
1. `uvicorn` boots with all new routes; Swagger /docs lists auth + products + admin endpoints.
2. Register→login→GET /me works end-to-end (curl-verified).
3. Admin creates a product; anonymous GET /products shows it; GET /{slug} returns detail.
4. Protected endpoints return 401 without token; admin endpoints return 403 for non-admin.
5. Frontend builds (npm run build) and routes render (catalog + login).
6. All secrets still only in .env.example.
7. Commit conventionally (feat: ...) and PUSH to the existing remote origin (github.com/ilyessmezghich/retail-store.git, branch master). Git/GH already authed on the box — fetch latest first (git pull --rebase origin master) then push.

Report: endpoints added, tests/curl evidence, files changed, push confirmed (head commit sha), deviations if any.