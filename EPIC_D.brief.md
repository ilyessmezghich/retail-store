# Epic D — Checkout & Orders (Stripe)

Continue the Retail Store project in /opt/retail-store (Epic A foundation, Epic B catalog & auth, Epic C cart — all done). Read the existing backend/app structure and SSD data model context.

**Goal:** real payment checkout (Stripe test mode) → on successful payment, create an order, snapshot line items, decrement stock. Authenticated users can view order history.

Existing data model orders(id, user_id, status, total_cents, stripe_session_id UNIQUE, created_at) + order_items(id, order_id, product_id, product_name snapshot, price_cents snapshot, quantity).

## Backend tasks

1. **Environment**: add stripe + python-jose already present. Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_CURRENCY=usd, FRONTEND_URL, BACKEND_URL to .env.example + config.

2. **Stripe Checkout session endpoint** — app/api/checkout.py:
   - POST /api/v1/checkout  (auth): builds the user's cart → creates a Stripe Checkout Session:
     - line_items: one item per cart line {price_data: {currency, product_data: {name}, unit_amount: price_cents}, quantity}
     - mode: "payment"
     - payment_method_types: ["card"]
     - success_url: {FRONTEND_URL}/orders?session_id={CHECKOUT_SESSION_ID}
     - cancel_url:  {FRONTEND_URL}/cart?canceled=1
     - metadata: {user_id, uid} for traceability
   - Creates a local Order row in DB with status='pending', total_cents = cart subtotal, stripe_session_id = session.id (upsert-safe). Returns {checkout_url, order_id}.
   - Clear the cart after session creation.
   - If cart empty → 400.

3. **Stripe webhook handler** — app/api/webhooks.py:
   - POST /api/v1/webhooks/stripe (public, no auth; verify Stripe-Signature header with STRIPE_WEBHOOK_SECRET using stripe.Webhook.construct_event)
   - Handle event type 'checkout.session.completed':
     - Idempotency: look up Order by stripe_session_id; if already 'paid' → return 200 (no-op).
     - In a SINGLE DB transaction: set order status='paid'; create order_items snapshots from the cart/line data (or from session line items via Stripe API); decrement product.stock by purchased qty (guard against negative).
     - On any error → log and return 200 (Stripe will retry) or appropriate.
   - Return 200 quickly; 400 on signature failure.

4. **Order history API** — app/api/orders.py:
   - GET  /api/v1/orders        (auth): list caller's orders (newest first), each with items + total + status + created_at.
   - GET  /api/v1/orders/{id}   (auth): detail; 404 if not caller's own.
   - Wire routers into app/main.py at /api/v1.

5. **stripe.Session.retrieve** (or retrieve from session line items) to build accurate order_items snapshots in the webhook.

## Frontend tasks (React/TS)
1. **Checkout button**: on CartDrawer, when cart non-empty → POST /api/v1/checkout → redirect to returned checkout_url.
2. **Orders page** (/orders): if ?session_id present, show a success flash; list user's orders w/ items, totals, status. Fetch GET /api/v1/orders.
3. **Order detail** (/orders/:id) — optional; reuse list if time.
4. Add to router; NavBar link "Orders" for authed users.

## Acceptance criteria
1. uvicorn boots; /api/docs lists checkout, webhooks, orders routes.
2. End-to-end (curl): auth → add cart item → POST /checkout returns Stripe URL (status 200) → simulate success by firing the webhook with the session (or use Stripe test card 4242 4242 4242 4242) → order flips to paid, stock decremented, order_items snapshot created.
3. Idempotency: replaying the same session.completed webhook does NOT double-decrement stock / duplicate order_items.
4. GET /orders shows the paid order; detail fetch works; non-owner → 404.
5. Empty cart checkout → 400. Unauthenticated checkout/orders → 401.
6. Frontend builds; orders page renders list + success flash.
7. Secrets only in .env.example.
8. Commit conventionally (feat: ...) and PUSH to origin master (git pull --rebase first). Box already authed.

## Notes / test guidance (IMPORTANT — self-contained, no external tools)
- Stripe Python SDK (stripe) is already installed in the backend venv (v15.6.1). Use it in code. The stripe CLI is NOT installed and you must NOT try to install/read it, and MUST NOT read or write anything under /root/.config, ~/.config, /root/.ssh, or any path outside the current workspace (/opt/retail-store). Work only inside the workspace.
- Do not try to shell out to the `stripe` CLI. To verify the webhook locally WITHOUT a public endpoint or CLI:
  1. Create a Checkout Session with the Stripe Python SDK using dummy/placeholder STRIPE_SECRET_KEY from .env.example (test key sk_test_...) — you can generate a session object; if the key is a placeholder, mock/stub the checkout session creation and instead directly test the webhook logic.
  2. Test the webhook handler by constructing the event payload with `stripe.Webhook.construct_event` using a real signature computed with the code's webhook secret: craft the JSON body for `checkout.session.completed`, compute the HMAC signature header (timestamp.raw_body signed with STRIPE_WEBHOOK_SECRET), and POST it to /api/v1/webhooks/stripe. Verify: 200, order flips pending->paid, stock decremented, order_items snapshot created.
  3. Replay the SAME webhook body/signature and assert idempotency (no double decrement, no duplicate order_items, still 200).
- Use Stripe test card 4242 4242 4242 4242 only in comments/docs; card-level payment flow is simulated via the webhook POST described above.
- If a real Stripe secret isn't available, implement with test-mode placeholders in .env (documented), but ensure config code, schema, and handler work; state clearly in the report that live Stripe requires real keys.

## Report
List endpoints added, evidence (order lifecycle pending->paid via webhook replay, stock decrement, order_items snapshot, idempotency replay both 200), files changed, the pushed head commit sha, and any deviations.