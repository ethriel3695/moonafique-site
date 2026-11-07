import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { fetchWhatnotInventory, monthlyProductMappings, WhatnotInventoryError } from "@/lib/whatnot-inventory-api";
import { editionQuantity, inventoryMaxAgeMs } from "@/lib/grimmunity/showcase-inventory";
import { EditionAvailability, ShowcaseInventoryProvider } from "@/components/grimmunity/showcase-inventory";

const mapping = monthlyProductMappings[0];
const user = { username: "Moonafique" };
const product = { id: mapping.productId, title: mapping.title, description: "private provider copy", url: "https://www.whatnot.com/dashboard/private" };
const variant = (quantity: unknown, id = "variant-1", product_id = mapping.productId as string) => ({ id, product_id, inventory: { available_quantity: quantity }, sku: "private sku", price: { amount: 3000 } });
const page = (data: unknown[], next_cursor: string | null = null) => ({ data, next_cursor });
const api = (...responses: unknown[]) => vi.fn<typeof fetch>().mockImplementation(async () => {
  const next = responses.shift();
  if (next === undefined) throw Error("secret provider failure");
  return next instanceof Response ? next : Response.json(next);
});

describe("Whatnot monthly inventory", () => {
  it("verifies the seller and exact product, paginates variants, and publishes only quantities", async () => {
    const fetcher = api(user, product, page([variant(1)], "page /2?"), page([variant(2, "variant-2")]));
    const result = await fetchWhatnotInventory("test-token", fetcher);
    expect(result.editions).toEqual({ "2026-10": 3 });
    expect(JSON.stringify(result)).not.toMatch(/private|test-token|variant-1|661335701/);
    expect(new URL(String(fetcher.mock.calls[3][0])).searchParams.get("cursor")).toBe("page /2?");
    for (const [url, options] of fetcher.mock.calls) {
      expect(new URL(String(url)).pathname).toMatch(/^\/seller-api\/rest\/v2\/(users\/me|products\/661335701(?:\/variants)?)$/);
      expect(options).toMatchObject({ redirect: "error", cache: "no-store", headers: { Authorization: "Bearer test-token" } });
      expect(options?.method ?? "GET").toBe("GET");
    }
  });
  it("distinguishes verified zero stock from missing variants", async () => {
    expect((await fetchWhatnotInventory("token", api(user, product, page([variant(0)])))).editions["2026-10"]).toBe(0);
    expect((await fetchWhatnotInventory("token", api(user, product, page([])))).editions["2026-10"]).toBeNull();
  });
  it.each([-1, 1.5, "1", null, 2_147_483_648])("rejects invalid quantity %s", async quantity => {
    await expect(fetchWhatnotInventory("token", api(user, product, page([variant(quantity)])))).rejects.toMatchObject({ code: "response" });
  });
  it("does not expose another seller or a repurposed product", async () => {
    const fetcher = api({ username: "other" });
    await expect(fetchWhatnotInventory("token", fetcher)).rejects.toMatchObject({ code: "account" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(fetchWhatnotInventory("token", api(user, { ...product, title: "November Grimm of the Month" }))).rejects.toMatchObject({ code: "product" });
    await expect(fetchWhatnotInventory("token", api(user, product, page([variant(1, "v", "other-product")])))).rejects.toMatchObject({ code: "response" });
  });
  it("rejects duplicate variants and looping pages instead of publishing a wrong total", async () => {
    await expect(fetchWhatnotInventory("token", api(user, product, page([variant(1), variant(1)])))).rejects.toMatchObject({ code: "response" });
    await expect(fetchWhatnotInventory("token", api(user, product, page([], "repeat"), page([], "repeat")))).rejects.toMatchObject({ code: "pagination" });
  });
  it.each([401, 403, 404, 429, 500])("safely handles HTTP %s, including failures after a partial page", async status => {
    const fetcher = api(user, product, page([variant(1)], "next"), new Response("secret provider detail", { status, headers: { "Retry-After": "180" } }));
    let error: unknown;
    try { await fetchWhatnotInventory("test-token", fetcher); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(WhatnotInventoryError);
    expect(String(error)).not.toMatch(/secret|test-token/);
    if (status === 429) expect((error as WhatnotInventoryError).retryAfterMs).toBe(180_000);
  });
  it("sanitizes network errors and rejects malformed credentials without making requests", async () => {
    const fetcher = api();
    await expect(fetchWhatnotInventory("Bearer token", fetcher)).rejects.toMatchObject({ code: "configuration" });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(fetchWhatnotInventory("token", fetcher)).rejects.toThrow("Whatnot inventory sync failed: connection.");
  });
});

describe("monthly stock presentation", () => {
  const now = Date.parse("2026-11-07T17:00:00Z");
  function render(quantity: number | null, age = 0, vaulted = false) {
    const inventory = { editions: { "2026-10": quantity }, syncedAt: new Date(now - age).toISOString() };
    return renderToString(createElement(ShowcaseInventoryProvider, { initialInventory: inventory, initialNow: now }, createElement(EditionAvailability, { edition: "2026-10", vaulted })));
  }
  it("updates remaining/sold-out states but never labels missing or stale inventory sold out", () => {
    expect(render(1)).toContain("1 left on Whatnot");
    expect(render(0)).toContain("Sold out on Whatnot");
    expect(render(null)).toContain("Check availability on Whatnot");
    expect(render(null)).not.toContain("Sold out on Whatnot");
    expect(render(1, inventoryMaxAgeMs + 1)).not.toContain("1 left on Whatnot");
    expect(render(0, inventoryMaxAgeMs + 1)).not.toContain("Sold out on Whatnot");
    expect(render(5, 0, true)).toContain("Vaulted · sold out");
    expect(render(5, 0, true)).not.toContain("5 left");
  });
  it("ignores missing, malformed, and future-dated snapshots", () => {
    for (const syncedAt of [null, "bad-date", new Date(now + 61_000).toISOString()]) {
      expect(editionQuantity({ editions: { "2026-10": 1 }, syncedAt }, "2026-10", now)).toBeNull();
    }
  });
});
