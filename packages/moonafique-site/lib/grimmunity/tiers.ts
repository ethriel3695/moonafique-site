import { z } from "zod";

export const tierIds = [
  "entry",
  "mid",
  "high",
  "grimm_starter",
  "grimm_keeper",
  "aceo_prints",
  "aceo_originals",
] as const;
export const clubIds = ["grimm", "aceo"] as const;
export type ClubId = (typeof clubIds)[number];
const shippingSchema = z
  .object({
    price_id: z.string().startsWith("price_"),
    product_id: z.string().startsWith("prod_"),
    amount: z.number().int().positive(),
  })
  .strict();
export const tierSchema = z
  .object({
    id: z.enum(tierIds),
    name: z.string().min(1).max(60),
    description: z.string().min(1).max(240),
    price_id: z.string().startsWith("price_"),
    product_id: z.string().startsWith("prod_"),
    amount: z.number().int().positive(),
    perks: z.array(z.string().min(1).max(240)).max(12),
    benefits_confirmed: z.boolean(),
    member_cap: z.number().int().positive().nullable().optional(),
    retained_copies: z.number().int().nonnegative().optional(),
    shipping_included: z.boolean().optional(),
    shipping_mode: z.literal("shippo").optional(),
    // Missing means a historical bundled price. Null means shipping billing is
    // not configured and checkout must remain closed. A value recurs monthly.
    shipping: shippingSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (tier) =>
      !tier.benefits_confirmed || tier.id === "entry" || tier.perks.length > 0,
    "Confirmed memberships must describe their included benefits.",
  );
export type Tier = z.infer<typeof tierSchema>;
export type TierId = Tier["id"];
export type TierAvailability = Partial<
  Record<TierId, { full: boolean; remaining: number | null }>
>;
export const tiersSchema = z
  .array(tierSchema)
  .min(1)
  .max(4)
  .refine(
    (tiers) =>
      new Set(tiers.map((tier) => tier.id)).size === tiers.length &&
      new Set(tiers.map((tier) => tier.price_id)).size === tiers.length &&
      tiers.every(
        (tier) =>
          !tier.shipping ||
          !tiers.some((other) => other.price_id === tier.shipping!.price_id),
      ),
    "Configure one to four unique memberships with distinct product and shipping Prices.",
  );
export const tierLabels: Record<TierId, string> = {
  entry: "Entry tier",
  mid: "Mid tier",
  high: "High tier",
  grimm_starter: "Grimm subscription",
  grimm_keeper: "Grimm subscription",
  aceo_prints: "ACEO subscription",
  aceo_originals: "ACEO subscription",
};
// Current owner-approved launch offer. Historical tier IDs remain readable.
export const membershipTiers: Omit<Tier, "price_id" | "product_id">[] = [
  {
    id: "grimm_starter",
    name: "Grimm Starter",
    description:
      "A mystery Grimm with a fancy gradient or dual-extrusion finish and a different ear option each month.",
    amount: 1500,
    member_cap: null,
    retained_copies: 0,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "One mystery Grimm with a different ear option each month",
      "All six emotion faces",
      "Two pairs of pants and two boots coordinated with the monthly vibe",
      "Two pets that match the monthly vibe",
      "At least $24 in value for $15",
      "Choose six preferred colors and tell us which colors to avoid",
    ],
    benefits_confirmed: true,
  },
  {
    id: "grimm_keeper",
    name: "Grimm Keeper",
    description:
      "A Grimm with a fancier paint job exclusive to the subscription. Twelve subscriber copies and one for our collection.",
    amount: 3000,
    member_cap: 12,
    retained_copies: 1,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "One custom Grimm with a fancier, subscription-exclusive paint job",
      "Coordinated accessories on the Grimm itself; no separate accessory pack",
      "Limited to 12 members",
      "We make 13: twelve for members and one for our collection",
      "When all 12 memberships are taken, the Grimm is vaulted for now",
    ],
    benefits_confirmed: true,
  },
  {
    id: "aceo_prints",
    name: "ACEO Prints",
    description: "Two physical ink prints of original ACEO artwork each month.",
    amount: 1000,
    member_cap: 24,
    retained_copies: 0,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "Two physical ink prints each month",
      "Artwork reproduced from original ACEOs",
      "Limited to 24 members",
    ],
    benefits_confirmed: true,
  },
  {
    id: "aceo_originals",
    name: "ACEO Originals",
    description: "One original ACEO artwork from the new monthly collection.",
    amount: 2000,
    member_cap: 12,
    retained_copies: 0,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "One original ACEO from the new collection each month",
      "Limited to 12 members",
    ],
    benefits_confirmed: true,
  },
];

export const sandboxTiers: Tier[] = membershipTiers.map((tier) => ({
  ...tier,
  price_id: `price_${tier.id}_fixture`,
  product_id: `prod_${tier.id}_fixture`,
  shipping: null,
}));

export function monthlyAmount(
  tier: Pick<Tier, "amount" | "shipping">,
): number | null {
  return tier.shipping === null
    ? null
    : tier.amount + (tier.shipping?.amount ?? 0);
}

export function shippingLabel(
  tier: Pick<Tier, "shipping" | "shipping_included" | "shipping_mode">,
  currency: string,
): string {
  if (tier.shipping === null)
    return tier.shipping_mode === "shippo"
      ? "Plus shipping calculated for your address"
      : "Plus flat U.S. shipping";
  if (!tier.shipping)
    return tier.shipping_included
      ? "U.S. shipping included"
      : "Shipping included in this saved offer";
  const fee = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(tier.shipping.amount / 100);
  return `Plus ${fee} flat U.S. shipping each month`;
}

export function tierClub(tier: Pick<Tier, "id">): ClubId {
  return tier.id.startsWith("aceo_") ? "aceo" : "grimm";
}
export type TierAllocation = {
  capacity: number | null;
  retained_copies: number;
};
export type TierAllocations = Partial<Record<TierId, TierAllocation>>;
export function tierAllocations(tiers: Tier[]): TierAllocations | null {
  if (!tiers.every((tier) => tier.member_cap !== undefined)) return null;
  return Object.fromEntries(
    tiers.map((tier) => [
      tier.id,
      {
        capacity: tier.member_cap!,
        retained_copies: tier.retained_copies ?? 0,
      },
    ]),
  );
}
