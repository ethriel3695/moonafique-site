import { fetchWhatnotInventory, WhatnotInventoryError } from "../lib/whatnot-inventory-api";

// Read-only: no orders, customers, payments, or inventory writes.
async function main() {
  const token = process.env.WHATNOT_INVENTORY_API_TOKEN?.trim();
  if (!token) {
    if (process.env.VERCEL_ENV === "production") throw new WhatnotInventoryError("configuration");
    console.log("Whatnot inventory is not configured for this non-production environment.");
    return;
  }
  const inventory = await fetchWhatnotInventory(token);
  console.log("Whatnot inventory connection verified:", JSON.stringify(inventory.editions));
  if (Object.values(inventory.editions).some(quantity => quantity === null)) console.warn("Whatnot omitted variant inventory; affected editions will link to Whatnot without a remaining count.");
}
main().catch(error => {
  console.error(error instanceof WhatnotInventoryError ? error.message : "Whatnot inventory readiness check failed.");
  process.exitCode = 1;
});
