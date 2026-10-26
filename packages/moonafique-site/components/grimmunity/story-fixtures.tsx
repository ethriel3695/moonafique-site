// Storybook-only presentation data. Do not import this file into application routes.
import type { ReactNode } from "react";
import { Lora, Manrope } from "next/font/google";
import { sandboxTiers, type TierAvailability } from "@/lib/grimmunity/tiers";
import {
  reviewEdition,
  reviewMember,
  reviewProgram,
} from "@/lib/grimmunity/review-fixture";
import { aceoParcel, grimmParcel } from "@/lib/grimmunity/package-profiles";
import type { AccountView, OrderView } from "@/lib/grimmunity/queries";
import type { ShippingLabel } from "@/lib/grimmunity/shipping";

const lora = Lora({ subsets: ["latin"], variable: "--font-display" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
export const storyTierIds = [
  "grimm_starter",
  "grimm_keeper",
  "aceo_prints",
  "aceo_originals",
] as const;
export type StoryTierId = (typeof storyTierIds)[number];
export const storyNow = new Date("2026-11-02T18:00:00Z");
export const storyProgram = { ...reviewProgram, fulfillment_lead_days: 7 };
export const storyEdition = {
  ...reviewEdition,
  title: "November monthly collection",
};
export const storyAvailability: TierAvailability = {
  grimm_starter: { full: false, remaining: null },
  grimm_keeper: { full: false, remaining: 12 },
  aceo_prints: { full: false, remaining: 24 },
  aceo_originals: { full: false, remaining: 12 },
};
export const storyAddress = {
  name: "Example Collector",
  line1: "123 Example Lane",
  line2: "",
  city: "Boise",
  state: "ID",
  postal_code: "83702",
  country: "US",
};
export const storyPreferences = {
  preferred_colors: ["Purple", "Teal", "Blue", "Black", "Pink", "White"],
  avoided_colors: ["Orange"],
};
export function StoryFrame({
  children,
  note,
  title,
}: {
  children: ReactNode;
  note?: string;
  title?: string;
}) {
  return (
    <main
      className={`${lora.variable} ${manrope.variable} ${manrope.className} grimmunity mx-auto max-w-screen-xl p-4 sm:p-8`}
      onSubmitCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest("a[href]");
        if (link && !link.getAttribute("href")?.startsWith("#"))
          event.preventDefault();
      }}
    >
      <div
        role="note"
        className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
      >
        <strong>Storybook example.</strong> Sample shipping costs are
        illustrative, not live quotes. Payments, emails, navigation, and postage
        purchases are disabled.
        {note && <p className="mt-2">{note}</p>}
      </div>
      {title && <h1 className="mb-6 text-3xl">{title}</h1>}
      {children}
    </main>
  );
}
export function storyTier(id: StoryTierId, shippingCents = 625) {
  const tier = sandboxTiers.find((t) => t.id === id)!;
  return {
    ...tier,
    perks: [...tier.perks],
    shipping: {
      amount: shippingCents,
      price_id: `price_story_shipping_${shippingCents}`,
      product_id: "prod_story_shipping",
    },
  };
}
export function storyMember(id: StoryTierId, shippingCents = 625) {
  const index = storyTierIds.indexOf(id) + 1;
  return {
    ...reviewMember,
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    tier_snapshot: storyTier(id, shippingCents),
    address: { ...storyAddress },
    preferences: id === "grimm_starter" ? storyPreferences : null,
    email: `${id}@example.invalid`,
  };
}
export function storyOrder(
  id: StoryTierId,
  state = "paid",
  shippingCents = 625,
): OrderView {
  const member = storyMember(id, shippingCents);
  const locked = state === "ready" || state === "shipped";
  return {
    id: `10000000-0000-4000-8000-${String(storyTierIds.indexOf(id) + 1).padStart(12, "0")}`,
    invoice_id: `in_story_${id}`,
    membership_id: member.id,
    edition_id: storyEdition.id,
    tier_snapshot: member.tier_snapshot,
    preferences: member.preferences,
    state,
    address_snapshot: locked ? { ...storyAddress } : null,
    locked_at: locked ? new Date("2026-12-03T18:00:00Z") : null,
    shipped_at: state === "shipped" ? new Date("2026-12-04T18:00:00Z") : null,
    tracking_number: state === "shipped" ? "EXAMPLE-TRACKING-001" : null,
    tracking_url: null,
    title: "December monthly collection",
    month: "2026-12",
    ship_by: new Date("2026-12-09T18:00:00Z"),
    dispatch_start: new Date("2026-12-03T18:00:00Z"),
    dispatch_end: new Date("2026-12-10T18:00:00Z"),
    address_cutoff: new Date("2026-12-03T18:00:00Z"),
    financial_state: "paid",
    review_reason: null,
    amount_paid: member.tier_snapshot.amount + shippingCents,
    currency: "usd",
    email: member.email,
    address: { ...storyAddress },
  };
}
export function storyAccount(
  id: StoryTierId,
  shippingCents = 625,
): AccountView {
  return {
    membership: storyMember(id, shippingCents),
    orders: [storyOrder(id, "paid", shippingCents)],
    exceptions: [],
  };
}
export function storyShippingLabel(
  id: StoryTierId = "grimm_keeper",
): ShippingLabel {
  return {
    fulfillment_id: storyOrder(id).id,
    quote_id: "20000000-0000-4000-8000-000000000001",
    shipment_id: "shippo_story_shipment",
    address_snapshot: { ...storyAddress },
    parcel: { ...(id.startsWith("aceo_") ? aceoParcel : grimmParcel) },
    rates: [
      {
        id: "rate_story_usps",
        amount: 625,
        currency: "usd",
        carrier: "USPS",
        service: "Ground Advantage",
        estimated_days: 4,
      },
      {
        id: "rate_story_ups",
        amount: 679,
        currency: "usd",
        carrier: "UPS",
        service: "Ground Saver",
        estimated_days: 5,
      },
      {
        id: "rate_story_priority",
        amount: 895,
        currency: "usd",
        carrier: "USPS",
        service: "Priority Mail",
        estimated_days: 3,
      },
    ],
    quoted_at: new Date("2026-12-03T18:00:00Z"),
    state: "quoted",
    rate_id: null,
    amount: null,
    transaction_id: null,
    label_url: null,
    tracking_number: null,
    tracking_url: null,
    test: true,
  };
}
