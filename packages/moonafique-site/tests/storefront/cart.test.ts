import { describe, expect, it } from "vitest";
import { addCartItem, readCartItems } from "@/lib/cart-items";
const item = {
  id: "sample",
  name: "A collectible",
  image: "/placeholder-image.png",
  price: { id: "price_sample", unit_amount: 15 },
};
describe("cart quantities and stored state", () => {
  it("adds and combines the selected quantities without losing another item", () => {
    const first = addCartItem([], item, 3);
    const second = addCartItem(first, { ...item, id: "another" }, 2);
    expect(
      addCartItem(second, item, 4).map((entry) => [entry.id, entry.quantity]),
    ).toEqual([
      ["sample", 7],
      ["another", 2],
    ]);
    expect(first[0].quantity).toBe(3);
  });
  it.each([0, -1, 1.5, 101, NaN, Infinity])(
    "rejects an invalid selected quantity: %s",
    (quantity) => {
      expect(() => addCartItem([], item, quantity)).toThrow();
    },
  );
  it("rejects a combined quantity above the checkout limit", () => {
    expect(() => addCartItem(addCartItem([], item, 99), item, 2)).toThrow(
      "up to 100",
    );
  });
  it("recovers from corrupt and structurally invalid saved carts", () => {
    for (const value of [
      "broken",
      "{}",
      "null",
      JSON.stringify([{ ...item, quantity: -1 }]),
      JSON.stringify([
        { ...item, quantity: 1, price: { id: "price_x", unit_amount: -1 } },
      ]),
    ])
      expect(readCartItems(value)).toEqual([]);
    expect(readCartItems(JSON.stringify([{ ...item, quantity: 3 }]))).toEqual([
      { ...item, quantity: 3 },
    ]);
  });
});
