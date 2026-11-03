"use client";
import { useEffect, useRef, useState } from "react";
import {
  addCartItem,
  MAX_CART_QUANTITY,
  readCartItems,
  type CartItem,
} from "@/lib/cart-items";
export type { CartItem } from "@/lib/cart-items";
function storedItems(key: string) {
  try {
    return typeof window === "undefined"
      ? []
      : readCartItems(window.localStorage.getItem(key));
  } catch {
    return [];
  }
}
export function useCart(storageKey = "cart") {
  const [items, setItems] = useState<CartItem[]>(() => storedItems(storageKey));
  const currentItems = useRef(items);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* Keep the in-memory cart usable when storage is unavailable. */
    }
  }, [items, storageKey]);
  function replace(next: CartItem[]) {
    currentItems.current = next;
    setItems(next);
  }
  async function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
    replace(addCartItem(currentItems.current, item, quantity));
  }
  function removeItem(id: string) {
    replace(currentItems.current.filter((item) => item.id !== id));
  }
  function updateQuantity(id: string, quantity: number) {
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > MAX_CART_QUANTITY
    )
      return;
    replace(
      currentItems.current
        .map((item) => (item.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }
  const total = items.reduce(
    (sum, item) => sum + item.price.unit_amount * item.quantity,
    0,
  );
  return { items, addItem, removeItem, updateQuantity, total, loading: false };
}
