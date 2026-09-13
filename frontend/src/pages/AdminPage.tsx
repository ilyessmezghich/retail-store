import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { Product } from "../api/client";
import { formatPrice } from "./CatalogPage";

export function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listAllProducts(1, 100)
      .then((data) => setProducts(data.items))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load products"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runStock = async (product: Product, delta: number) => {
    setError(null);
    setBusyId(product.id);
    try {
      const updated = await api.adjustStock(product.id, delta);
      setProducts((current) =>
        current.map((p) => (p.id === updated.id ? updated : p)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update stock");
    } finally {
      setBusyId(null);
    }
  };

  const runArchive = async (product: Product) => {
    setError(null);
    setBusyId(product.id);
    try {
      let updated: Product;
      if (product.archived) {
        updated = await api.updateProduct(product.id, { archived: false });
      } else {
        updated = await api.archiveProduct(product.id);
      }
      setProducts((current) =>
        current.map((p) => (p.id === updated.id ? updated : p)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update product");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="admin-header">
        <h1>Admin — Products</h1>
        <Link to="/admin/new" className="cart-checkout-link admin-new-link">
          New product
        </Link>
      </div>
      {error !== null && <p className="error">{error}</p>}
      {loading && <p>Loading products…</p>}
      {!loading && products.length === 0 && (
        <p className="cart-drawer-empty">No products yet. Create one to get started.</p>
      )}
      {!loading && products.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Archived</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className={product.archived ? "admin-row-archived" : ""}>
                  <td>{product.name}</td>
                  <td className="admin-mono">{product.slug}</td>
                  <td>{formatPrice(product)}</td>
                  <td>
                    <div className="admin-stock">
                      <button
                        type="button"
                        className="cart-stepper"
                        disabled={busyId === product.id}
                        aria-label={`Decrease stock of ${product.name}`}
                        onClick={() => runStock(product, -1)}
                      >
                        −
                      </button>
                      <span className="cart-line-qty">{product.stock}</span>
                      <button
                        type="button"
                        className="cart-stepper"
                        disabled={busyId === product.id}
                        aria-label={`Increase stock of ${product.name}`}
                        onClick={() => runStock(product, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>{product.archived ? "Yes" : "No"}</td>
                  <td className="admin-actions">
                    <Link to={`/admin/${product.id}/edit`}>Edit</Link>
                    <button
                      type="button"
                      className="admin-link-button"
                      disabled={busyId === product.id}
                      onClick={() => runArchive(product)}
                    >
                      {product.archived ? "Restore" : "Archive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && error !== null && (
        <p className="admin-hint">See above. If a stock change fails, the row keeps its value.</p>
      )}
    </div>
  );
}