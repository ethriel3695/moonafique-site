import { beforeEach, expect, it, vi } from "vitest";
import { availabilityLabel, membershipTiers } from "../../lib/grimmunity/tiers";
const source = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/grimmunity/queries", () => ({ publicOffer: source.read }));
import { GET } from "../../app/api/grimmunity/availability/route";
beforeEach(() => vi.clearAllMocks());

it("publishes anonymous spot counts without exposing program or customer information", async () => {
  const availability = { aceo_prints: { full: false, remaining: 23 } };
  source.read.mockResolvedValue({
    availability,
    availabilityEditionId: "edition",
    program: { secret: "private" },
    customers: ["private"],
    unavailable: false,
  });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ availability, editionId: "edition" });
});
it("does not fabricate a remaining count when storage is unavailable", async () => {
  source.read.mockResolvedValue({
    availability: {},
    availabilityEditionId: null,
    unavailable: true,
  });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ availability: {}, editionId: null });
  const prints = membershipTiers.find((tier) => tier.id === "aceo_prints")!;
  expect(availabilityLabel(prints)).toBe("24 spots");
});
it("uses singular spots, sold-out art, and the Keeper vault without inventing a cap for Starter", () => {
  const prints = membershipTiers.find((tier) => tier.id === "aceo_prints")!;
  const keeper = membershipTiers.find((tier) => tier.id === "grimm_keeper")!;
  const starter = membershipTiers.find((tier) => tier.id === "grimm_starter")!;
  expect(availabilityLabel(prints, { remaining: 23, full: false })).toBe(
    "23 spots left",
  );
  expect(availabilityLabel(prints, { remaining: 1, full: false })).toBe(
    "1 spot left",
  );
  expect(availabilityLabel(prints, { remaining: 0, full: true })).toBe(
    "Sold out",
  );
  expect(availabilityLabel(keeper, { remaining: 0, full: true })).toBe(
    "Vaulted for now",
  );
  expect(
    availabilityLabel(starter, { remaining: null, full: false }),
  ).toBeNull();
});
