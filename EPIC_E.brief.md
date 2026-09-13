# Epic E — Admin UI, Polish & CI (final)

Continue the Retail Store project in /opt/retail-store (Epic A-D done, head d2e38fe). Read the existing backend/app + frontend structure. This is the final epic: production polish, a functional admin UI to manage products/inventory, frontend hardening, and a CI workflow.

## Backend tasks
1. **Admin product/inventory APIs** — verify exist from Epic B (app/api/catalog.py admin router): POST/GET /api/v1/admin/products, PUT/DELETE /{id} (soft-archive), PATCH /{id}/stock {delta}. Add anything missing (e.g. GET admin products must include archived; ensure PATCH stock supports negative delta that clamps at 0 and rejects going below 0).
2. **Seed/scripts** (optional but nice): a small `scripts/seed.py` that creates an initial admin user (from env ADMIN_EMAIL/ADMIN_PASSWORD) and a few sample products. Add ADMIN_EMAIL, ADMIN_PASSWORD to .env.example.
3. Ensure CORS + nginx config already allow /api; confirm Swagger lists admin routes under /api/v1/admin.

## Frontend tasks (React/TS)
1. **Admin area** — new routes under `/admin`:
   - `/admin` (protected, role=admin): product table listing ALL products (incl archived) with columns name, slug, price, stock, archived.
   - Create product form (name, slug/desc auto, price, stock, image_url).
   - Edit product (PUT) — price/description/archived toggle.
   - Adjust stock inline ({delta} step) — calls PATCH /{id}/stock.
   - Client-side guard: fetch current user (GET /api/v1/auth/me); if role != admin redirect to /login or show 403. Server still enforces (defense in depth).
2. **Frontend auth guards** — NavBar shows Admin link only for admins; cart/orders/checkout already auth-gated (ensure they redirect to /login when 401).
3. **Polish** — consistent error handling (display API error messages), loading skeletons on Catalog/Orders, empty states (empty cart, no orders, no products), 404 page for unknown product/route. Ensure mobile-friendly nav (simple responsive tweaks).
4. Keep the existing catalog/cart/checkout flows working (do not regress).

## CI workflow
1. **GitHub Actions** — `.github/workflows/ci.yml`:
   - On push + PR to master:
     - backend job: setup Python 3.12, install deps, run `pytest` (or the repo's test command), run a quick `alembic` autogenerate-check if feasible.
     - frontend job: setup Node 20, `npm ci` (or npm install), `npm run lint` if present, `npm run build`.
   - Both jobs must pass. Use `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4` (or newer majors as available; no deprecated versions).
2. If the backend has no tests yet, add a minimal `tests/test_health.py` (TestClient GET /health -> 200) so CI has something to run; add pytest to requirements (dev) and a `pytest.ini`/config.

## Acceptance criteria
1. Admin UI: admin logs in (role=admin from seed) → /admin lists products → create/edit product → adjust stock (POST /checkout still respects updated stock).
2. Non-admin hitting /admin → frontend redirect/403 AND server 403.
3. Catalog/cart/checkout/orders all still work (no regression).
4. CI workflow runs green (at least lint/build + backend test) — you may not be able to run GitHub Actions locally, but the YAML must be valid (validate with a YAML parser) and steps correct; state clearly it will run on push.
5. `docker compose config` valid; frontend `npm run build` succeeds; backend imports clean.
6. No hardcoded secrets (all in .env.example).
7. Commit conventionally and PUSH to origin master (git pull --rebase first; box is gh-authed). Add the .github/workflows/ci.yml to the commit.

## IMPORTANT (self-contained; no external access)
Stripe CLI is NOT available and you must NOT install/read it or access anything outside /opt/retail-store (no /root/.config, /root/.ssh, /tmp, etc.). Work only inside the workspace. The stripe Python SDK is installed — use it only as already used in Epic D (no live calls needed). **pytest and httpx are ALREADY installed in backend/.venv** — do NOT pip-install anything and do NOT write to /tmp; any dependency you need that is missing, just note it in the report instead of installing.

## Report
List admin endpoints verified, frontend pages/routes added, CI workflow summary + how you validated the YAML, evidence (admin CRUD, stock, guards, build green), files changed, the pushed head commit sha, and any deviations. State whether the repo is now feature-complete for the retail-store project.