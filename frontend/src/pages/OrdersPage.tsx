import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError, api } from "../api/client";
import type { Order } from "../api/client";
import { useAuth } from "../auth/store";

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  eur: "€",
  gbp: "£",
};

function formatCents(cents: number): string {
  return `${CURRENCY_SYMBOLS["usd"] ?? ""}${(cents / 100).toFixed(2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleString();
}

export function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const flash = sessionId ? "Payment successful! Your order has been placed." : null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId && window.history.replaceState) {
      window.history.replaceState({}, "", "/orders");
    }
  }, [sessionId]);

  useEffect(() => {
    if (user === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .listOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data.items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            navigate("/login");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load orders");
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  if (user === null) {
    return (
      <div className="page">
        <h1>Orders</h1>
        <p className="cart-drawer-empty">Sign in to view your order history.</p>
        <Link to="/login" className="cart-checkout-link">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Orders</h1>
      {flash !== null && <p className="order-flash-ok">{flash}</p>}
      {loading && (
        <ul className="order-list" aria-label="Loading orders">
          {Array.from({ length: 3 }, (_, index) => (
            <li className="order-card" key={index}>
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line skeleton-line-short" />
            </li>
          ))}
        </ul>
      )}
      {!loading && error !== null && <p className="error">{error}</p>}
      {!loading && error === null && orders.length === 0 && (
        <p className="cart-drawer-empty">No orders yet.</p>
      )}
      {!loading && error === null && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li className="order-card" key={order.id}>
              <div className="order-card-header">
                <Link to={`/orders/${order.id}`} className="order-card-id">
                  Order {order.id.slice(0, 8)}
                </Link>
                <span className={`order-status order-status-${order.status}`}>{order.status}</span>
              </div>
              <p className="order-card-meta">
                {formatDate(order.created_at)} · {formatCents(order.total_cents)}
              </p>
              <ul className="order-card-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.product_name} — {formatCents(item.line_total_cents)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}