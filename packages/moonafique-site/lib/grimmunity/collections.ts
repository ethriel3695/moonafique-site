import { tierClub, type Tier } from "./tiers";

export const collectionPages = {
  grimm: { name: "Grimmunity", href: "/grimmunity" },
  aceo: { name: "ACEOs", href: "/aceos" },
} as const;

export function membershipPage(tier: Pick<Tier, "id">) {
  return collectionPages[tierClub(tier)].href;
}
