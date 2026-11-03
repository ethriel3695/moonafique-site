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

function HydratedCartProvider({
  children,
  storageKey,
}: {
  children: React.ReactNode;
  storageKey: string;
}) {
  const cart = useCart(storageKey);

  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function CartProvider({
  children,
  storageKey = "cart",
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return null;
  }

  return (
    <HydratedCartProvider storageKey={storageKey}>
      {children}
    </HydratedCartProvider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}
