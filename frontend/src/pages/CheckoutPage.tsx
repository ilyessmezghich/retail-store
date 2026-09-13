import { Link } from "react-router-dom";

export function CheckoutPage() {
  return (
    <div className="page">
      <h1>Checkout</h1>
      <p className="breadcrumb">
        <Link to="/">Catalog</Link> / Checkout
      </p>
      <p className="checkout-stub">
        Checkout is handled with Stripe from your cart. Open the cart and press “Checkout →”
        to pay with a Stripe test card.
      </p>
      <Link to="/" className="cart-checkout-link">
        Back to catalog
      </Link>
    </div>
  );
}