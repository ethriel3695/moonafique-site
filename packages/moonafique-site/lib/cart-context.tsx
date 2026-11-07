"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";
import { CartItem, useCart } from "./use-cart";

interface CartContextType {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number,
  ) => Promise<void>;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  total: number;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function subscribe() {
  return () => {};
}

export function CartProvider({
  children,
  storageKey = "cart",
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const cart = useCart(storageKey);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  // Render the page on the server. Only the saved cart waits for hydration;
  // its first client snapshot must match the empty server snapshot.
  return (
    <CartContext.Provider value={mounted ? cart : { ...cart, items: [], total: 0, loading: true }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}
