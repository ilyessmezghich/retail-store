import { Link } from "react-router-dom";

import { useAuth } from "../auth/store";
import { useCart } from "../cart/store";

export function NavBar() {
  const { user, logout } = useAuth();
  const { count, openCart } = useCart();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Retail Store
      </Link>
      <div className="navbar-actions">
        {user ? (
          <>
            {user.role === "admin" && (
              <Link to="/admin" className="navbar-link">
                Admin
              </Link>
            )}
            {count > 0 && (
              <button
                type="button"
                className="navbar-cart-button"
                onClick={openCart}
                aria-label={`Cart with ${count} items`}
              >
                Cart <span className="navbar-cart-badge">{count}</span>
              </button>
            )}
            <Link to="/orders" className="navbar-link">
              Orders
            </Link>
            <span className="navbar-user">{user.email}</span>
            <button type="button" onClick={logout} className="navbar-link-button">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">
              Sign in
            </Link>
            <Link to="/register" className="navbar-link">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}