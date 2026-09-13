import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../api/client";
import type { Product } from "../api/client";
import { useCart } from "../cart/store";
import { formatPrice } from "./CatalogPage";

export function ProductPage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .getProduct(slug)
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load product");
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
  }, [slug]);

  if (loading) {
    return <div className="page"><p>Loading product…</p></div>;
  }

  if (error !== null || product === null) {
    return (
      <div className="page">
        <h1>Product not found</h1>
        <p className="error">{error ?? "That product does not exist."}</p>
        <Link to="/">Back to catalog</Link>
      </div>
    );
  }

  const onAdd = async () => {
    setAdding(true);
    setFeedback(null);
    try {
      await addToCart(product, quantity);
      setFeedback(`${quantity} added to cart`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login");
      } else {
        setFeedback(err instanceof Error ? err.message : "Could not add to cart");
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/">Catalog</Link> / {product.name}
      </p>
      <img className="product-image" src={product.image_url} alt={product.name} />
      <h1>{product.name}</h1>
      <p className="product-price">{formatPrice(product)}</p>
      <p className="product-stock">
        {product.stock > 0 ? `In stock (${product.stock} available)` : "Out of stock"}
      </p>
      {product.description && <p className="product-description">{product.description}</p>}
      {product.stock > 0 && (
        <div className="product-add-form">
          <div className="product-qty-stepper">
            <button
              type="button"
              className="cart-stepper"
              disabled={quantity <= 1}
              onClick={() => setQuantity(quantity - 1)}
            >
              −
            </button>
            <span className="cart-line-qty">{quantity}</span>
            <button
              type="button"
              className="cart-stepper"
              disabled={quantity >= product.stock}
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
          <button type="button" className="product-add-button" disabled={adding} onClick={onAdd}>
            {adding ? "Adding…" : "Add to cart"}
          </button>
          {feedback !== null && <p className={feedback.startsWith("added") ? "product-feedback-ok" : "error"}>{feedback}</p>}
        </div>
      )}
    </div>
  );
}