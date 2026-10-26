// Historical multi-plan fixtures for regression tests, not the current offer.
import type { Tier } from "../../lib/grimmunity/tiers";
export const testTiers: Tier[] = [
  {
    id: "entry",
    name: "Grim Starter",
    description:
      "An approachable way to start your collection, with a surprise each month.",
    amount: 1800,
    perks: [
      "Surprise prebuilt basic Grim + matching pet",
      "Single-color or gradient jacket",
      "Coordinated face, boots, and pants",
    ],
    benefits_confirmed: true,
    price_id: "price_grim_fixture",
    product_id: "prod_grim_fixture",
  },
  {
    id: "mid",
    name: "Grim Collector",
    description:
      "More color for your collection, plus a closer look at what’s coming next.",
    amount: 2300,
    perks: [
      "Two-color or premium color design on your Grim + matching pet",
      "Collectible colorway card",
      "Previews of upcoming club designs",
      "Occasional palette votes",
    ],
    benefits_confirmed: true,
    price_id: "price_grim_mid_fixture",
    product_id: "prod_grim_fixture",
  },
  {
    id: "high",
    name: "Grim Curator",
    description:
      "Our monthly signature design, with the story behind every detail.",
    amount: 3300,
    perks: [
      "Fully custom monthly color design on both your Grim and pet",
      "Signed collectible design card",
      "Behind-the-design notes",
      "Previews of upcoming club designs",
      "Occasional palette votes",
    ],
    benefits_confirmed: true,
    price_id: "price_grim_high_fixture",
    product_id: "prod_grim_fixture",
  },
];
// Former $25 Collector offer, retained to test historical billing obligations.
export const legacyCollectorTiers: Tier[] = [{ ...testTiers[1], amount: 2500 }];
