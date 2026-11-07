import { z } from "zod";
import type { ShowcaseInventory } from "./grimmunity/showcase-inventory";

// Owner-confirmed listing. New editions need a mapping once, never manual counts.
// All variants of each mapped product belong to that month's edition.
export const monthlyProductMappings = [{ edition: "2026-10", productId: "661335701", title: "October Grimm of the Month" }] as const;
const apiBase = "https://api.whatnot.com/seller-api/rest/v2";
const variantSchema = z.object({
  id: z.string().min(1).max(100), product_id: z.string(),
  inventory: z.object({ available_quantity: z.number().int().nonnegative().max(2_147_483_647) }),
});
const pageSchema = z.object({ data: z.array(variantSchema).max(50), next_cursor: z.string().min(1).max(2048).nullable() });

// Provider bodies, tokens, and underlying network errors never reach public
// responses or logs. The adapter calls only seller/product read endpoints.
export class WhatnotInventoryError extends Error {
  constructor(public readonly code: "configuration" | "authorization" | "connection" | "account" | "response" | "product" | "pagination" | "rate-limit", public readonly retryAfterMs = 60_000) {
    super(`Whatnot inventory sync failed: ${code}.`);
    this.name = "WhatnotInventoryError";
  }
}

export async function fetchWhatnotInventory(token: string, fetcher: typeof fetch = fetch): Promise<ShowcaseInventory> {
  if (!token || /\s/.test(token)) throw new WhatnotInventoryError("configuration");
  const signal = AbortSignal.timeout(10_000);
  async function read(path: string) {
    try {
      const response = await fetcher(apiBase + path, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store", redirect: "error", signal,
      });
      if (response.status === 401 || response.status === 403) throw new WhatnotInventoryError("authorization");
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After") ?? "60";
        const delay = /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
        throw new WhatnotInventoryError("rate-limit", Number.isFinite(delay) ? Math.max(60_000, delay) : 60_000);
      }
      if (response.status === 404) throw new WhatnotInventoryError("product");
      if (!response.ok) throw new WhatnotInventoryError("connection");
      return await response.json();
    } catch (error) {
      throw error instanceof WhatnotInventoryError ? error : new WhatnotInventoryError("connection");
    }
  }
  const user = z.object({ username: z.string() }).safeParse(await read("/users/me"));
  if (!user.success) throw new WhatnotInventoryError("response");
  if (user.data.username.toLowerCase() !== "moonafique") throw new WhatnotInventoryError("account");

  const editions: ShowcaseInventory["editions"] = {};
  for (const mapping of monthlyProductMappings) {
    const product = z.object({ id: z.string(), title: z.string() }).safeParse(await read(`/products/${mapping.productId}`));
    if (!product.success) throw new WhatnotInventoryError("response");
    if (product.data.id !== mapping.productId || product.data.title.trim().toLowerCase() !== mapping.title.toLowerCase()) throw new WhatnotInventoryError("product");
    const quantities = new Map<string, number>();
    let cursor: string | null = null;
    const visited = new Set<string>();
    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const result = pageSchema.safeParse(await read(`/products/${mapping.productId}/variants?${params}`));
      if (!result.success) throw new WhatnotInventoryError("response");
      for (const variant of result.data.data) {
        if (variant.product_id !== mapping.productId || quantities.has(variant.id)) throw new WhatnotInventoryError("response");
        quantities.set(variant.id, variant.inventory.available_quantity);
      }
      cursor = result.data.next_cursor;
      if (!cursor) break;
      if (visited.has(cursor) || page === 9) throw new WhatnotInventoryError("pagination");
      visited.add(cursor);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    const total = [...quantities.values()].reduce((sum, quantity) => sum + quantity, 0);
    if (total > 2_147_483_647) throw new WhatnotInventoryError("response");
    // A product without variants has no readable stock; it is NOT sold out.
    editions[mapping.edition] = quantities.size ? total : null;
  }
  return { editions, syncedAt: new Date().toISOString() };
}
