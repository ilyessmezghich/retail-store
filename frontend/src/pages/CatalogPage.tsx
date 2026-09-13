import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { Product } from "../api/client";

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
            <Link to={`/products/${product.slug}`} key={product.id} className="product-card">
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
          ))}
        </div>
      )}
    </div>
  );
}