import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/store";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (!cancelled) {
          if (me.role === "admin") {
            setIsAdmin(true);
          } else {
            setForbidden(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (checking) {
    return (
      <div className="page">
        <p>Checking access…</p>
      </div>
    );
  }

  if (forbidden || !isAdmin) {
    return (
      <div className="page">
        <h1>403 Forbidden</h1>
        <p className="error">You need administrator privileges to view this page.</p>
        <Link to="/">Back to catalog</Link>
      </div>
    );
  }

  return <>{children}</>;
}