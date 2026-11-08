import { describe, expect, it } from "vitest";
import { publicTierCopy, sandboxTiers } from "../../lib/grimmunity/tiers";

describe("membership names are presentation only", () => {
  it("updates the premium display name without changing a saved subscription's terms or identifiers", () => {
    const tier = { ...sandboxTiers.find(t => t.id === "grimm_keeper")!, name: "Grimm Keeper", price_id: "price_existing", product_id: "prod_existing", perks: ["Previously saved benefits"] };
    const original = structuredClone(tier);
    const displayed = publicTierCopy(tier);
    expect(displayed.name).toBe("Grimmoire Collection");
    expect(tier).toEqual(original);
    for (const field of ["id", "amount", "price_id", "product_id", "shipping", "shipping_mode", "member_cap", "retained_copies"] as const)
      expect(displayed[field]).toEqual(original[field]);
  });
  it("does not relabel a historical plan with a different price", () => {
    const tier = { ...sandboxTiers[1], name: "Earlier membership", amount: 2500 };
    expect(publicTierCopy(tier)).toBe(tier);
  });
});
