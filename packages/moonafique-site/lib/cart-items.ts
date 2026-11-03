import { z } from "zod";
export const MAX_CART_QUANTITY = 100;
const cartItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  price: z.object({
    id: z.string().startsWith("price_"),
    unit_amount: z.number().finite().nonnegative(),
  }),
  image: z.string(),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
});
export type CartItem = z.infer<typeof cartItemSchema>;
export function readCartItems(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed = z
      .array(cartItemSchema)
      .max(100)
      .safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
export function addCartItem(
  items: CartItem[],
  item: Omit<CartItem, "quantity">,
  quantity = 1,
): CartItem[] {
  const incoming = cartItemSchema.safeParse({ ...item, quantity });
  if (!incoming.success)
    throw new Error("Choose a whole quantity between 1 and 100.");
  const existing = items.find((entry) => entry.id === item.id);
  const combined = (existing?.quantity ?? 0) + quantity;
  if (combined > MAX_CART_QUANTITY)
    throw new Error(
      "You can add up to 100 of an item. Please check your cart.",
    );
  return existing
    ? items.map((entry) =>
        entry.id === item.id ? { ...incoming.data, quantity: combined } : entry,
      )
    : [...items, incoming.data];
}
