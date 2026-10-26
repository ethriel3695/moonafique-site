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
      "A new little personality to love every month. Unbox a mystery Grimm in playful colors, with fresh ears and tiny companions to match.",
    amount: 1500,
    member_cap: null,
    retained_copies: 0,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "A mystery Grimm in a colorful finish, with a new ear style each month",
      "All six emotion faces for every little mood",
      "Two pairs of pants and two boots to dress for the monthly theme",
      "Two tiny pets to join the adventure",
      "At least $24 of Grimm goodness for $15",
      "Pick six favorite colors and tell us any you’d rather skip",
    ],
    benefits_confirmed: true,
  },
  {
    id: "grimm_keeper",
    name: "Grimm Keeper",
    description:
      "A little character, a lot of magic. Add a Grimm with an exclusive painted finish to your collection each month.",
    amount: 3000,
    member_cap: 12,
    retained_copies: 1,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "One custom-painted Grimm each month",
      "A painted finish created exclusively for Keeper members",
      "Coordinated accessories worn by your Grimm",
    ],
    benefits_confirmed: true,
  },
  {
    id: "aceo_prints",
    name: "ACEO Prints",
    description:
      "Make your mailbox the happiest part of the month. Collect two tiny art prints and a fresh little world to fall in love with.",
    amount: 1000,
    member_cap: 24,
    retained_copies: 0,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "Two ACEO prints delivered each month",
      "Artwork from our original ACEO collections",
      "Tiny treasures to display, collect, or share",
    ],
    benefits_confirmed: true,
  },
  {
    id: "aceo_originals",
    name: "ACEO Originals",
    description:
      "A tiny original with a story all its own. Bring home a piece from our new monthly collection and grow a little gallery of your own.",
    amount: 2000,
    member_cap: 12,
    retained_copies: 0,
    shipping: null,
    shipping_mode: "shippo",
    perks: [
      "One original ACEO artwork each month",
      "A piece from our brand-new monthly collection",
      "Original art to make your little gallery feel like you",
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

// Refresh public offer wording without rewriting saved paid-member snapshots.
export function publicTierCopy<
  T extends Pick<Tier, "id" | "amount" | "name" | "description" | "perks">,
>(tier: T): T {
  const current = membershipTiers.find(
    (copy) => copy.id === tier.id && copy.amount === tier.amount,
  );
  return current
    ? {
        ...tier,
        name: current.name,
        description: current.description,
        perks: current.perks,
      }
    : tier;
}

export function availabilityLabel(
  tier: Pick<Tier, "id" | "member_cap">,
  availability?: TierAvailability[TierId],
): string | null {
  if (availability?.full || availability?.remaining === 0)
    return tier.id === "grimm_keeper" ? "Vaulted for now" : "Sold out";
  if (typeof availability?.remaining === "number")
    return `${availability.remaining} ${availability.remaining === 1 ? "spot" : "spots"} left`;
  return tier.member_cap ? `${tier.member_cap} spots` : null;
}

export const availabilitySnapshotSchema = z.object({
  editionId: z.string().uuid().nullable(),
  availability: z.partialRecord(
    z.enum(tierIds),
    z.object({
      full: z.boolean(),
      remaining: z.number().int().nonnegative().nullable(),
    }),
  ),
});
