import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page">
      <h1>404 — Page not found</h1>
      <p className="error">That page does not exist.</p>
      <Link to="/">Back to catalog</Link>
    </div>
  );
}