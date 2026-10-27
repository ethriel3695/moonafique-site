import { beforeEach, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { membershipBilling } from "../../lib/grimmunity/billing-options";
import { tierSchema } from "../../lib/grimmunity/tiers";
import { prepareMembershipPrices } from "../../scripts/grimmunity/prepare-membership-prices";

const stripe = new Stripe("sk_test_fixture");
beforeEach(() => vi.restoreAllMocks());

it.each([
  [1500, 8550, 16200],
  [3000, 17100, 32400],
  [1000, 5700, 10800],
  [2000, 11400, 21600],
])(
  "calculates the approved membership-only prices from %i cents",
  (monthly, six, annual) => {
    expect(membershipBilling(monthly, 1)).toMatchObject({
      amount: monthly,
      discount: 0,
    });
    expect(membershipBilling(monthly, 6)).toMatchObject({
      amount: six,
      discount: 5,
      recurring: { interval: "month", interval_count: 6 },
    });
    expect(membershipBilling(monthly, 12)).toMatchObject({
      amount: annual,
      discount: 10,
      recurring: { interval: "year", interval_count: 1 },
    });
  },
);

function setupCatalog() {
  vi.spyOn(stripe.products, "retrieve").mockImplementation(
    async (id) =>
      ({
        id,
        active: false,
        livemode: true,
        metadata: {
          moonafique_offer: "collections-v2",
          grim_subscription: "true",
          tier: id.replace("prod_moonafique_live_", "").replace(/_v2$/, ""),
        },
      }) as unknown as Stripe.Response<Stripe.Product>,
  );
  vi.spyOn(stripe.prices, "list").mockResolvedValue({
    data: [],
  } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Price>>);
  vi.spyOn(stripe.prices, "create").mockImplementation(
    async (params) =>
      ({
        ...params,
        id: `price_${params?.lookup_key}`,
        livemode: true,
        active: true,
        type: "recurring",
        billing_scheme: "per_unit",
        recurring: { ...params?.recurring, usage_type: "licensed" },
      }) as unknown as Stripe.Response<Stripe.Price>,
  );
}

it("prepares all twelve prices without activating products or creating customers or charges", async () => {
  setupCatalog();
  const activate = vi.spyOn(stripe.products, "update");
  const customer = vi.spyOn(stripe.customers, "create");
  const subscription = vi.spyOn(stripe.subscriptions, "create");
  const payment = vi.spyOn(stripe.paymentIntents, "create");
  const tiers = await prepareMembershipPrices(stripe);
  expect(tiers).toHaveLength(4);
  expect(stripe.prices.create).toHaveBeenCalledTimes(12);
  for (const tier of tiers)
    expect(tierSchema.safeParse(tier).success).toBe(true);
  expect(activate).not.toHaveBeenCalled();
  expect(customer).not.toHaveBeenCalled();
  expect(subscription).not.toHaveBeenCalled();
  expect(payment).not.toHaveBeenCalled();
  expect(tiers[0].billing_options?.map((option) => option.amount)).toEqual([
    1500, 8550, 16200,
  ]);
  expect(tiers.every((tier) => tier.shipping === null)).toBe(true);
});

it("reuses catalog prices on retry and refuses a changed amount or cadence", async () => {
  setupCatalog();
  const tiers = await prepareMembershipPrices(stripe);
  const prices = vi.mocked(stripe.prices.create).mock.results;
  const saved = await Promise.all(prices.map((result) => result.value));
  vi.mocked(stripe.prices.create).mockClear();
  vi.mocked(stripe.prices.list).mockImplementation(
    (params) =>
      Promise.resolve({
        data: saved.filter(
          (price) => price.lookup_key === params?.lookup_keys?.[0],
        ),
      }) as unknown as Stripe.ApiListPromise<Stripe.Price>,
  );
  expect(await prepareMembershipPrices(stripe)).toEqual(tiers);
  expect(stripe.prices.create).not.toHaveBeenCalled();
  saved[1].unit_amount = 8551;
  await expect(prepareMembershipPrices(stripe)).rejects.toThrow(
    "price mismatch",
  );
  saved[1].unit_amount = 8550;
  saved[1].recurring!.interval_count = 1;
  await expect(prepareMembershipPrices(stripe)).rejects.toThrow(
    "price mismatch",
  );
});

it("refuses an active product before preparing prices", async () => {
  setupCatalog();
  vi.mocked(stripe.products.retrieve).mockResolvedValue({
    id: "prod_moonafique_live_grimm_starter_v2",
    active: true,
    livemode: true,
    metadata: { moonafique_offer: "collections-v2" },
  } as unknown as Stripe.Response<Stripe.Product>);
  await expect(prepareMembershipPrices(stripe)).rejects.toThrow(
    "inactive live draft product",
  );
  expect(stripe.prices.create).not.toHaveBeenCalled();
});

it("rejects edited discounts and duplicate prepaid cadences in saved configuration", async () => {
  setupCatalog();
  const [tier] = await prepareMembershipPrices(stripe);
  const changed = structuredClone(tier);
  changed.billing_options![1].amount -= 1;
  expect(tierSchema.safeParse(changed).success).toBe(false);
  changed.billing_options = [
    tier.billing_options![0],
    tier.billing_options![1],
    tier.billing_options![1],
  ];
  expect(tierSchema.safeParse(changed).success).toBe(false);
});
