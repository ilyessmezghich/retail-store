import { Link } from "react-router-dom";

export function CheckoutPage() {
  return (
    <div className="page">
      <h1>Checkout</h1>
      <p className="breadcrumb">
        <Link to="/">Catalog</Link> / Checkout
      </p>
      <p className="checkout-stub">
        Checkout is coming in Epic D. Your cart is saved server-side, so you can pick up right
        where you left off.
      </p>
      <Link to="/" className="cart-checkout-link">
        Back to catalog
      </Link>
    </div>
  );
}