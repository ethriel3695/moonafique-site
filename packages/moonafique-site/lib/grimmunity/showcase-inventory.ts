import { z } from "zod";

export const inventoryRefreshSeconds = 120;
export const inventoryMaxAgeMs = 5 * 60_000;
export const showcaseInventorySchema = z.object({
  editions: z.record(z.string().regex(/^\d{4}-\d{2}$/), z.number().int().nonnegative().max(2_147_483_647).nullable()),
  syncedAt: z.iso.datetime().nullable(),
});
export type ShowcaseInventory = z.infer<typeof showcaseInventorySchema>;
export const emptyShowcaseInventory: ShowcaseInventory = { editions: {}, syncedAt: null };

export function editionQuantity(inventory: ShowcaseInventory, edition: string, now: number): number | null {
  const timestamp = inventory.syncedAt ? Date.parse(inventory.syncedAt) : NaN;
  if (!Number.isFinite(timestamp) || now - timestamp > inventoryMaxAgeMs || timestamp > now + 60_000) return null;
  return inventory.editions[edition] ?? null;
}
