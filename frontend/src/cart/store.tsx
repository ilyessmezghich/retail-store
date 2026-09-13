import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { api } from "../api/client";
import type { Cart, CartItem, Product } from "../api/client";
import { useAuth } from "../auth/store";

interface CartContextValue {
  items: CartItem[];
  count: number;
  totalCents: number;
  drawerOpen: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<Cart>;
  updateQuantity: (itemId: string, quantity: number) => Promise<Cart>;
  removeItem: (itemId: string) => Promise<Cart>;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function optimisticAdd(items: CartItem[], product: Product, quantity: number): CartItem[] {
  const index = items.findIndex((item) => item.product_id === product.id);
  if (index >= 0) {
    const current = items[index];
    const nextQuantity = current.quantity + quantity;
    const next = [...items];
    next[index] = {
      ...current,
      quantity: nextQuantity,
      line_total_cents: current.price_cents * nextQuantity,
    };
    return next;
  }
  return [
    {
      id: `pending-${product.id}`,
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price_cents: product.price_cents,
      currency: product.currency,
      image_url: product.image_url,
      quantity,
      line_total_cents: product.price_cents * quantity,
    },
    ...items,
  ];
}

function optimisticQuantity(items: CartItem[], itemId: string, quantity: number): CartItem[] {
  return items.map((item) =>
    item.id === itemId
      ? { ...item, quantity, line_total_cents: item.price_cents * quantity }
      : item,
  );
}

function totals(items: CartItem[]): { count: number; totalCents: number } {
  return {
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totalCents: items.reduce((sum, item) => sum + item.line_total_cents, 0),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { count, totalCents } = totals(items);

  const fetchCart = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    const cart = await api.getCart();
    setItems(cart.items);
  }, [token]);

  useEffect(() => {
    if (token) {
      api
        .getCart()
        .then((cart) => setItems(cart.items))
        .catch(() => setItems([]));
    } else {
      setItems([]);
    }
  }, [token]);

  const addToCart = useCallback(
    async (product: Product, quantity = 1): Promise<Cart> => {
      const previous = items;
      setItems(optimisticAdd(previous, product, quantity));
      try {
        const cart = await api.addCartItem(product.id, quantity);
        setItems(cart.items);
        return cart;
      } catch (error) {
        setItems(previous);
        throw error;
      }
    },
    [items],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number): Promise<Cart> => {
      const previous = items;
      setItems(optimisticQuantity(previous, itemId, quantity));
      try {
        const cart = await api.updateCartItem(itemId, quantity);
        setItems(cart.items);
        return cart;
      } catch (error) {
        setItems(previous);
        throw error;
      }
    },
    [items],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<Cart> => {
      const previous = items;
      setItems(previous.filter((item) => item.id !== itemId));
      try {
        const cart = await api.removeCartItem(itemId);
        setItems(cart.items);
        return cart;
      } catch (error) {
        setItems(previous);
        throw error;
      }
    },
    [items],
  );

  const openCart = useCallback(() => {
    setDrawerOpen(true);
    void fetchCart();
  }, [fetchCart]);

  const closeCart = useCallback(() => setDrawerOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        totalCents,
        drawerOpen,
        fetchCart,
        addToCart,
        updateQuantity,
        removeItem,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}