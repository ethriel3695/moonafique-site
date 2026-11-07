// Read-only discovery for connecting the owner's existing monthly editions.
// No order, customer, payment, or inventory-write endpoints are called.
async function main() {
  if (process.env.WHATNOT_INVENTORY_DISCOVERY !== "approved") return;
  const token = process.env.WHATNOT_INVENTORY_API_TOKEN?.trim();
  if (!token || /\s/.test(token)) throw Error("Inventory token is missing or invalid.");
  const base = "https://api.whatnot.com/seller-api/rest/v2";
  async function read(path: string) {
    const response = await fetch(base + path, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw Error(`Inventory read failed with HTTP ${response.status}.`);
    return response.json();
  }
  const user = await read("/users/me");
  if (user.username?.toLowerCase() !== "moonafique") throw Error("Inventory token is not for Moonafique.");
  let cursor: string | null = null;
  const visited = new Set<string>();
  let found = 0;
  for (let page = 0; page < 100; page++) {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const products = await read(`/products?${params}`);
    if (!Array.isArray(products.data)) throw Error("Unexpected product response.");
    for (const product of products.data) {
      if (!/grimm?\b/i.test(product.title) || !/month|october|september|august/i.test(product.title)) continue;
      if (!/^[1-9][0-9]{0,18}$/.test(product.id)) throw Error("Unexpected product ID.");
      if (++found > 30) throw Error("Too many matching editions; narrow the inventory search.");
      const variants = await read(`/products/${product.id}/variants?limit=50`);
      console.log("Monthly edition candidate:", JSON.stringify({
        id: product.id, title: product.title, createdAt: product.created_at,
        variants: variants.data?.map((variant: { id: string; inventory: unknown; selected_options: unknown }) => ({ id: variant.id, inventory: variant.inventory, options: variant.selected_options })),
        hasMoreVariants: !!variants.next_cursor,
      }));
    }
    cursor = products.next_cursor;
    if (!cursor) { console.log(`Inventory account verified; ${found} monthly edition candidates.`); return; }
    if (visited.has(cursor)) throw Error("Repeated product cursor.");
    visited.add(cursor);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw Error("Product discovery reached its page limit.");
}

main().catch(error => {
  // Fixed errors only; network errors may include sensitive request details.
  console.error(error instanceof Error && /^(Inventory|Unexpected|Too many|Repeated|Product)/.test(error.message) ? error.message : "Inventory connection check failed.");
  process.exitCode = 1;
});
