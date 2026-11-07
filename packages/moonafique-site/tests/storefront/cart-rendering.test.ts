import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCartContext } from "../../lib/cart-context";

function Page() {
  const { items, total } = useCartContext();
  return createElement("main", null,
    createElement("h1", null, "Welcome to Moonafique"),
    createElement("span", null, `${items.length} items, ${total} cents`),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("initial page rendering", () => {
  it("includes page content before JavaScript and browser storage are available", () => {
    vi.stubGlobal("window", undefined);
    const html = renderToString(createElement(CartProvider, null, createElement(Page)));
    expect(html).toContain("<h1>Welcome to Moonafique</h1>");
    expect(html).toContain("0 items, 0 cents");
  });

  it("uses a consistent initial cart snapshot even when local storage is present", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => JSON.stringify([{ id: "kept-cart", name: "Saved collectible", image: "", quantity: 2, price: { id: "price_saved", unit_amount: 1500 } }]) } });
    const html = renderToString(createElement(CartProvider, null, createElement(Page)));
    expect(html).toContain("<h1>Welcome to Moonafique</h1>");
    expect(html).toContain("0 items, 0 cents");
  });
});
