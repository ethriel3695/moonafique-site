import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { emptyShowcaseInventory, inventoryRefreshSeconds, type ShowcaseInventory } from "./showcase-inventory";
import { fetchWhatnotInventory, monthlyProductMappings, WhatnotInventoryError } from "../whatnot-inventory-api";

const token = process.env.WHATNOT_INVENTORY_API_TOKEN?.trim() ?? "";
const connection = createHash("sha256").update(token).update(JSON.stringify(monthlyProductMappings)).digest("hex");
let pending: Promise<ShowcaseInventory> | undefined;
let retryAfter = 0;
const cachedInventory = unstable_cache(async () => {
  if (Date.now() < retryAfter) throw new WhatnotInventoryError("connection");
  if (!pending) {
    pending = fetchWhatnotInventory(token).catch(error => {
      retryAfter = Date.now() + (error instanceof WhatnotInventoryError ? error.retryAfterMs : 60_000);
      throw error;
    }).finally(() => { pending = undefined; });
  }
  return pending;
}, ["whatnot-monthly-inventory-v1", connection], { revalidate: inventoryRefreshSeconds });

export async function getShowcaseInventory(): Promise<ShowcaseInventory> {
  if (!token) return emptyShowcaseInventory;
  try { return await cachedInventory(); }
  catch (error) {
    console.warn(error instanceof WhatnotInventoryError ? error.message : "Whatnot inventory is temporarily unavailable.");
    return emptyShowcaseInventory;
  }
}
