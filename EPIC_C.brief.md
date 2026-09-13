# Epic C — Shopping Cart (task for opencode)

Continue the Retail Store project in /opt/retail-store (Epic A foundation + Epic B catalog & auth done, head b71a553). Read the existing backend/app structure and the SDD for data-model context.

## Backend tasks (cart API, auth-protected)
Schema: cart_items(id, user_id fk→users, product_id fk→products, quantity, UNIQUE(user_id, product_id)).

1. **Cart router** — app/api/cart.py:
   - GET    /api/v1/cart           → current user's cart with line totals
   - POST   /api/v1/cart/items     → add {product_id, quantity} (upsert: increments if line exists)
   - PATCH  /api/v1/cart/items/{item_id} → update quantity (must be ≥1; >0)
   - DELETE /api/v1/cart/items/{item_id} → remove line
   - Enforce stock: total line quantity (new + existing) must NOT exceed product.stock → else 400.
   - Auth-required (get_current_user). Items reference only the caller's own cart lines (404 if line belongs to another user).
   - Return enriched items: product id, name, slug, unit price (image), quantity, line total.
2. **Schemas**: CartItemAdd(product_id, quantity), CartItemUpdate(quantity), CartItemOut (+ product fields), CartOut(items, total_cents).
3. Wire into app/main.py at /api/v1. Update openapi.

## Frontend tasks (React/TS)
1. **Cart store/context** — extend src/auth/store.tsx or a new src/cart/store.tsx with: add-to-cart, update-qty, remove, fetch cart, computed subtotal + count.
2. **Add-to-cart** on CatalogPage + ProductPage (quantity stepper on product page).
3. **CartDrawer** component (slide-over) showing lines, qty steppers, remove, subtotal, Auth-gated "Checkout →" button (goes to /checkout which is Epic D — stub button for now).
4. **NavBar cart badge** (item count). Reflect optimistic updates; re-fetch cart on open.
5. Wire /api/v1/cart through vite dev proxy (already set up for /api).

## Acceptance criteria
1. uvicorn boots; /api/docs lists cart routes.
2. auth flow: register→login→add item (stock-enforced) → cart lists it → patch qty (cap at stock) → delete.
3. Unauthenticated GET /api/v1/cart → 401.
4. Adding beyond stock → 400 with clear message; patch beyond stock → 400.
5. Frontend builds (npm run build); add-to-cart updates badge; drawer shows lines + subtotal; checkout button present (stub).
6. Persist across requests (server-side cart for logged-in user). Secrets only in .env.example.
7. Commit conventionally (feat: ...) and PUSH to origin master (git pull --rebase first). Box already authed.

## Report
List endpoints added, curl/API evidence, files changed, the pushed head commit sha, and any deviations.