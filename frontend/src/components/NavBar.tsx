import { Link } from "react-router-dom";

import { useAuth } from "../auth/store";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Retail Store
      </Link>
      <div className="navbar-actions">
        {user ? (
          <>
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