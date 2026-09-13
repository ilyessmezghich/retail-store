import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/store";
import { useCart } from "../cart/store";

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  eur: "€",
  gbp: "£",
};

function formatCents(cents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency.toUpperCase()} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function CartDrawer() {
  const { user } = useAuth();
  const { items, totalCents, drawerOpen, closeCart, updateQuantity, removeItem } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();

  if (!drawerOpen) {
    return null;
  }

  const runCheckout = async () => {
    setError(null);
    setCheckingOut(true);
    try {
      const response = await api.checkout();
      window.location.href = response.checkout_url;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login");
      } else {
        setError(err instanceof Error ? err.message : "Could not start checkout");
      }
      setCheckingOut(false);
    }
  };

  const runUpdate = async (itemId: string, quantity: number) => {
    setError(null);
    setBusyItemId(itemId);
    try {
      await updateQuantity(itemId, quantity);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update quantity");
    } finally {
      setBusyItemId(null);
    }
  };

  const runRemove = async (itemId: string) => {
    setError(null);
    setBusyItemId(itemId);
    try {
      await removeItem(itemId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove item");
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="cart-backdrop" onClick={closeCart}>
      <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="cart-drawer-header">
          <h2>Your cart</h2>
          <button type="button" className="cart-drawer-close" onClick={closeCart}>
            ×
          </button>
        </div>

        {user === null ? (
          <div className="cart-drawer-empty">
            <p>Sign in to view your cart.</p>
            <Link to="/login" className="cart-checkout-link">
              Sign in
            </Link>
          </div>
        ) : items.length === 0 ? (
          <p className="cart-drawer-empty">Your cart is empty.</p>
        ) : (
          <ul className="cart-drawer-lines">
            {items.map((item) => (
              <li className="cart-line" key={item.id}>
                <img className="cart-line-image" src={item.image_url} alt={item.name} />
                <div className="cart-line-body">
                  <Link to={`/products/${item.slug}`} className="cart-line-name">
                    {item.name}
                  </Link>
                  <p className="cart-line-price">
                    {formatCents(item.price_cents, item.currency)} each
                  </p>
                  <div className="cart-line-actions">
                    <button
                      type="button"
                      className="cart-stepper"
                      disabled={item.quantity <= 1 || busyItemId === item.id}
                      onClick={() => runUpdate(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="cart-line-qty">{item.quantity}</span>
                    <button
                      type="button"
                      className="cart-stepper"
                      disabled={busyItemId === item.id}
                      onClick={() => runUpdate(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="cart-line-remove"
                      disabled={busyItemId === item.id}
                      onClick={() => runRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <span className="cart-line-total">
                  {formatCents(item.line_total_cents, item.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {error !== null && <p className="error">{error}</p>}

        {user !== null && items.length > 0 && (
          <div className="cart-drawer-footer">
            <p className="cart-subtotal">
              Subtotal <strong>{formatCents(totalCents, items[0]?.currency ?? "usd")}</strong>
            </p>
            <button
              type="button"
              className="cart-checkout-link"
              disabled={checkingOut}
              onClick={runCheckout}
            >
              {checkingOut ? "Starting checkout…" : "Checkout →"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}