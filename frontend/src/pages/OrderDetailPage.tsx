import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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

export function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id ?? "";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .getOrder(orderId)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            navigate("/login");
          } else {
            setError(err instanceof Error ? err.message : "Order not found");
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
  }, [orderId, user, navigate]);

  if (user === null) {
    return (
      <div className="page">
        <h1>Order</h1>
        <p className="cart-drawer-empty">Sign in to view order details.</p>
        <Link to="/login" className="cart-checkout-link">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="page"><p>Loading order…</p></div>;
  }

  if (error !== null || order === null) {
    return (
      <div className="page">
        <h1>Order not found</h1>
        <p className="error">{error ?? "That order does not exist."}</p>
        <Link to="/orders">Back to orders</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/orders">Orders</Link> / {order.id.slice(0, 8)}
      </p>
      <h1>Order {order.id.slice(0, 8)}</h1>
      <p className="order-card-meta">
        Status: <span className={`order-status order-status-${order.status}`}>{order.status}</span>
      </p>
      <p className="order-card-meta">Placed {new Date(order.created_at).toLocaleString()}</p>
      <ul className="order-card-items">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.product_name} — {formatCents(item.line_total_cents)}
          </li>
        ))}
      </ul>
      <p className="order-card-total">
        Total <strong>{formatCents(order.total_cents)}</strong>
      </p>
      <Link to="/orders">Back to orders</Link>
    </div>
  );
}