import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { Product } from "../api/client";
import { formatPrice } from "./CatalogPage";

export function ProductPage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}