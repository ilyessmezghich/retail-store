import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../api/client";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function toCents(dollars: string): number {
  return Math.round(parseFloat(dollars) * 100);
}

export function AdminProductFormPage() {
  const params = useParams();
  const productId = params.id;
  const editing = productId !== undefined;

  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!editing) {
      return;
    }
    let cancelled = false;
    api
      .listAllProducts(1, 100)
      .then((data) => {
        if (cancelled) {
          return;
        }
        const product = data.items.find((p) => p.id === productId);
        if (product === undefined) {
          setNotFound(true);
        } else {
          setName(product.name);
          setSlug(product.slug);
          setDescription(product.description);
          setPrice(toDollars(product.price_cents));
          setStock(String(product.stock));
          setImageUrl(product.image_url);
          setArchived(product.archived);
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
  }, [editing, productId]);

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const onSlugChange = (value: string) => {
    setSlugTouched(value.length > 0);
    setSlug(slugify(value));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const base = {
        name,
        slug: slug || slugify(name),
        description,
        price_cents: toCents(price),
        currency: "usd",
        image_url: imageUrl,
        stock: parseInt(stock, 10) || 0,
      };
      if (editing) {
        await api.updateProduct(productId as string, { ...base, archived });
      } else {
        await api.createProduct(base);
      }
      navigate("/admin");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not save product");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/admin">Admin</Link> / {editing ? "Edit product" : "New product"}
      </p>
      <h1>{editing ? "Edit product" : "Create product"}</h1>
      {loading && <p>Loading product…</p>}
      {!loading && notFound ? (
        <div>
          <p className="error">That product does not exist.</p>
          <Link to="/admin">Back to product list</Link>
        </div>
      ) : (
        <form className="auth-form admin-form" onSubmit={onSubmit}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            required
          />

          <label htmlFor="slug">Slug (auto-generated from name)</label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            required
          />

          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />

          <label htmlFor="price">Price (USD)</label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />

          <label htmlFor="stock">Stock</label>
          <input
            id="stock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            required
          />

          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />

          {editing && (
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={archived}
                onChange={(event) => setArchived(event.target.checked)}
              />
              Archived (hidden from catalog)
            </label>
          )}

          {error !== null && <p className="error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Create product"}
          </button>
        </form>
      )}
      <p className="auth-switch">
        <Link to="/admin">Back to product list</Link>
      </p>
    </div>
  );
}