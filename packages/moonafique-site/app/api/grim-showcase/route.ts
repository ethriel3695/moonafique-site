import { getShowcaseInventory } from "@/lib/grimmunity/showcase-inventory-server";
import { editionQuantity } from "@/lib/grimmunity/showcase-inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const inventory = await getShowcaseInventory();
  return Response.json({
    ...inventory,
    editions: Object.fromEntries(Object.keys(inventory.editions).map(key => [key, editionQuantity(inventory, key, Date.now())])),
  }, { headers: { "Cache-Control": "no-store" } });
}
