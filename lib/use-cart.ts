'use client';

import { useEffect, useState } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: {
    id: string;
    unit_amount: number;
  };
  image: string;
  quantity: number;
}

function getStoredCartItems(): CartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const storedItems = window.localStorage.getItem('cart');

  if (!storedItems) {
    return [];
  }

  try {
    return JSON.parse(storedItems) as CartItem[];
  } catch {
    return [];
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(getStoredCartItems);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = async (newItem: Omit<CartItem, 'quantity'>) => {
    setLoading(true);
    // Simulate a delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 500));

    setItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (item) => item.id === newItem.id
      );
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1,
        };
        return updatedItems;
      }
      return [...prevItems, { ...newItem, quantity: 1 }];
    });
    setLoading(false);
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const total = items.reduce(
    (sum, item) => sum + item.price.unit_amount * item.quantity,
    0
  );

  return { items, addItem, removeItem, updateQuantity, total, loading };
}
