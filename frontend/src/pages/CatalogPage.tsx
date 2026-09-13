import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, api } from "../api/client";
import type { Product } from "../api/client";
import { useCart } from "../cart/store";

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  eur: "€",
  gbp: "£",
};

export function formatPrice(product: Product): string {
  const symbol = CURRENCY_SYMBOLS[product.currency] ?? `${product.currency.toUpperCase()} `;
  return `${symbol}${(product.price_cents / 100).toFixed(2)}`;
}

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .listProducts(1, 24)
      .then((data) => {
        if (!cancelled) {
          setProducts(data.items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load products");
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
  }, []);

  const onAdd = async (product: Product) => {
    setAddingId(product.id);
    setError(null);
    try {
      await addToCart(product, 1);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login");
      } else {
        setError(err instanceof Error ? err.message : "Could not add to cart");
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="page">
      <h1>Catalog</h1>
      {loading && <p>Loading products…</p>}
      {!loading && error !== null && <p className="error">{error}</p>}
      {!loading && error === null && products.length === 0 && (
        <p>No products yet.</p>
      )}
      {!loading && error === null && products.length > 0 && (
        <div className="product-grid">
          {products.map((product) => (
            <div className="product-card" key={product.id}>
              <Link to={`/products/${product.slug}`} className="product-card-link">
                <img
                  className="product-card-image"
                  src={product.image_url}
                  alt={product.name}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <div className="product-card-body">
                  <h2 className="product-card-name">{product.name}</h2>
                  <p className="product-card-price">{formatPrice(product)}</p>
                </div>
              </Link>
              <button
                type="button"
                className="product-card-add"
                disabled={addingId === product.id || product.stock <= 0}
                onClick={() => onAdd(product)}
              >
                {addingId === product.id ? "Adding…" : product.stock > 0 ? "Add to cart" : "Out of stock"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}