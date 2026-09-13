export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  currency: string;
  image_url: string;
  stock: number;
  archived: boolean;
  created_at: string;
}

export interface ProductList {
  items: Product[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  image_url: string;
  quantity: number;
  line_total_cents: number;
}

export interface Cart {
  items: CartItem[];
  total_cents: number;
  count: number;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

const TOKEN_KEY = "retail.token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`/api/v1${path}`, { ...init, headers });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && typeof (body as { detail?: unknown }).detail === "string") {
        detail = (body as { detail: string }).detail;
      }
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    apiRequest<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    apiRequest<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiRequest<User>("/auth/me"),
  listProducts: (page = 1, size = 24) =>
    apiRequest<ProductList>(`/products?page=${page}&size=${size}`),
  getProduct: (slug: string) =>
    apiRequest<Product>(`/products/${encodeURIComponent(slug)}`),
  getCart: () => apiRequest<Cart>("/cart"),
  addCartItem: (productId: string, quantity = 1) =>
    apiRequest<Cart>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity }),
    }),
  updateCartItem: (itemId: string, quantity: number) =>
    apiRequest<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (itemId: string) =>
    apiRequest<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    }),
};