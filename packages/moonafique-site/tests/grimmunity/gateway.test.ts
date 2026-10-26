import { beforeEach, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { StripeGateway, grimStripe } from "../../lib/grimmunity/stripe-gateway";
import {
  reviewProgram,
  reviewMember,
} from "../../lib/grimmunity/review-fixture";
import type { Reservation } from "../../lib/grimmunity/model";
import {
  testTiers,
  legacyCollectorTiers as launchTiers,
} from "./tier-fixtures";
import { tiersSchema } from "../../lib/grimmunity/tiers";
const program = { ...reviewProgram, tiers: testTiers };
const stripe = new Stripe("sk_test_fixture");
const gateway = new StripeGateway(stripe);
beforeEach(() => {
  vi.restoreAllMocks();
  process.env.SERVER_URL = "http://localhost:3000";
});
it.each(program.tiers)(
  "uses the server-owned $id tier Price for delivery-inclusive recurring checkout",
  async (tier) => {
    const create = vi
      .spyOn(stripe.checkout.sessions, "create")
      .mockResolvedValue({
        id: "cs_fixture",
        status: "open",
        customer: reviewMember.customer_id,
        subscription: null,
        metadata: { grim_reservation: "reservation" },
        livemode: false,
        url: "https://checkout.stripe.com/fixture",
      } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    const r = {
      id: "reservation",
      tier_snapshot: tier,
      expires_at: new Date("2026-11-02T19:00:00Z"),
    } as Reservation;
    await gateway.createSession(program, reviewMember, r);
    const [params, options] = create.mock.calls[0];
    expect(params?.mode).toBe("subscription");
    expect(params?.line_items).toEqual([{ price: tier.price_id, quantity: 1 }]);
    expect(params?.subscription_data?.metadata?.grim_tier).toBe(tier.id);
    expect(params?.customer).toBe(reviewMember.customer_id);
    expect(params?.shipping_address_collection?.allowed_countries).toEqual([
      "US",
    ]);
    expect(params?.customer_update?.shipping).toBe("auto");
    expect(params?.allow_promotion_codes).toBe(false);
    expect(params?.shipping_options).toBeUndefined();
    expect(params?.subscription_data?.trial_period_days).toBeUndefined();
    expect(params?.subscription_data?.billing_cycle_anchor).toBeUndefined();
    expect(options?.idempotencyKey).toBe("grim:checkout:reservation");
  },
);
it("verifies shipping updates and disables plan and quantity changes in portal configuration", async () => {
  const configuration = {
    active: true,
    livemode: false,
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["shipping"] },
      subscription_update: { enabled: false },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
      },
    },
  };
  vi.spyOn(stripe.billingPortal.configurations, "retrieve").mockResolvedValue(
    configuration as unknown as Stripe.Response<Stripe.BillingPortal.Configuration>,
  );
  await gateway.checkPortal(program);
  configuration.features.customer_update.allowed_updates = ["address"];
  await expect(gateway.checkPortal(program)).rejects.toThrow("invalid_portal");
  configuration.features.customer_update.allowed_updates = ["shipping"];
  configuration.features.subscription_update.enabled = true;
  await expect(gateway.checkPortal(program)).rejects.toThrow("invalid_portal");
});
it("uses modern invoice line parents/pricing, paginates lines and payments, and detects partial refunds", async () => {
  const inv = {
    id: "in_fixture",
    customer: "cus_fixture",
    parent: { subscription_details: { subscription: "sub_fixture" } },
    livemode: false,
    status: "paid",
    billing_reason: "subscription_cycle",
    amount_paid: program.tiers[0].amount,
    amount_due: program.tiers[0].amount,
    total: program.tiers[0].amount,
    currency: "usd",
    status_transitions: { paid_at: 1793656810 },
    discounts: [],
    starting_balance: 0,
    ending_balance: 0,
    pre_payment_credit_notes_amount: 0,
    post_payment_credit_notes_amount: 0,
    shipping_cost: null,
    total_pretax_credit_amounts: [],
  };
  const price = {
    id: program.tiers[0].price_id,
    product: program.tiers[0].product_id,
    currency: "usd",
    unit_amount: program.tiers[0].amount,
    type: "recurring",
    recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
    billing_scheme: "per_unit",
    livemode: false,
  };
  vi.spyOn(stripe.invoices, "retrieve").mockResolvedValue(
    inv as unknown as Stripe.Response<Stripe.Invoice>,
  );
  vi.spyOn(stripe.prices, "retrieve").mockResolvedValue(
    price as unknown as Stripe.Response<Stripe.Price>,
  );
  const lines = {
    async *[Symbol.asyncIterator]() {
      yield {
        invoice: "in_fixture",
        parent: {
          subscription_item_details: {
            subscription: "sub_fixture",
            proration: false,
          },
        },
        pricing: {
          price_details: {
            price: program.tiers[0].price_id,
            product: program.tiers[0].product_id,
          },
        },
        quantity: 1,
        amount: program.tiers[0].amount,
        currency: "usd",
        period: { start: 1793656800, end: 1796248800 },
        discount_amounts: [],
        discounts: [],
      };
    },
  };
  vi.spyOn(stripe.invoices, "listLineItems").mockReturnValue(
    lines as unknown as ReturnType<typeof stripe.invoices.listLineItems>,
  );
  const payments = {
    async *[Symbol.asyncIterator]() {
      yield {
        payment: { type: "payment_intent", payment_intent: "pi_fixture" },
        amount_paid: program.tiers[0].amount,
        currency: "usd",
      };
    },
  };
  vi.spyOn(stripe.invoicePayments, "list").mockReturnValue(
    payments as unknown as ReturnType<typeof stripe.invoicePayments.list>,
  );
  vi.spyOn(stripe.paymentIntents, "retrieve").mockResolvedValue({
    status: "succeeded",
    currency: "usd",
    latest_charge: "ch_fixture",
  } as unknown as Stripe.Response<Stripe.PaymentIntent>);
  vi.spyOn(stripe.charges, "retrieve").mockResolvedValue({
    disputed: false,
    amount_refunded: 500,
    refunded: false,
  } as unknown as Stripe.Response<Stripe.Charge>);
  const normalized = await gateway.invoice("in_fixture", program);
  expect(normalized.subscription).toBe("sub_fixture");
  expect(normalized.lines[0].recurring).toBe(true);
  expect(normalized.paymentVerified).toBe(true);
  expect(normalized.financialState).toBe("review");
});
it("fails closed for missing credentials or wrong Stripe mode", () => {
  process.env.GRIM_STRIPE_SECRET_KEY = "sk_live_fixture";
  expect(() => grimStripe("sandbox")).toThrow("billing_unavailable");
  process.env.GRIM_STRIPE_SECRET_KEY = "sk_test_fixture";
  expect(() => grimStripe("live")).toThrow("billing_unavailable");
});

it("checks dispute status so a won dispute can be released by staff without ignoring active or lost disputes", async () => {
  const charge = {
    id: "ch_fixture",
    disputed: true,
    amount_refunded: 0,
    refunded: false,
  } as Stripe.Charge;
  let status = "under_review";
  vi.spyOn(stripe.disputes, "list").mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield { status };
    },
  } as unknown as ReturnType<typeof stripe.disputes.list>);
  expect(await gateway.chargeState(charge)).toBe("disputed");
  status = "lost";
  expect(await gateway.chargeState(charge)).toBe("disputed");
  status = "won";
  expect(await gateway.chargeState(charge)).toBe("paid");
});

it("checks every tier Price, including a broken higher tier, before offering checkout", async () => {
  vi.spyOn(gateway, "checkPortal").mockResolvedValue();
  const retrieve = vi
    .spyOn(stripe.prices, "retrieve")
    .mockImplementation(async (id) => {
      const tier = program.tiers.find((t) => t.price_id === id)!;
      return {
        id,
        active: true,
        product: {
          id: tier.product_id,
          active: true,
          metadata: { grim_subscription: "true" },
        },
        currency: "usd",
        unit_amount: tier.amount,
        type: "recurring",
        recurring: {
          interval: "month",
          interval_count: 1,
          usage_type: "licensed",
        },
        billing_scheme: "per_unit",
        livemode: false,
      } as unknown as Stripe.Response<Stripe.Price>;
    });
  await gateway.checkConfiguration(program);
  expect(retrieve.mock.calls.map(([id]) => id)).toEqual(
    program.tiers.map((t) => t.price_id),
  );
  retrieve.mockResolvedValue({
    id: program.tiers[2].price_id,
    active: false,
  } as Stripe.Response<Stripe.Price>);
  await expect(gateway.checkConfiguration(program)).rejects.toThrow(
    "invalid_price",
  );
});
it("rejects duplicate tier Prices and confirmed premium tiers without perks", async () => {
  const duplicate = structuredClone(program);
  duplicate.tiers[2].price_id = duplicate.tiers[0].price_id;
  await expect(gateway.checkConfiguration(duplicate)).rejects.toThrow(
    "tiers_not_ready",
  );
  const missing = structuredClone(program);
  missing.tiers[2].benefits_confirmed = true;
  missing.tiers[2].perks = [];
  await expect(gateway.checkConfiguration(missing)).rejects.toThrow(
    "tiers_not_ready",
  );
});

const shipping = {
  price_id: "price_shipping_fixture",
  product_id: "prod_shipping_fixture",
  amount: 700,
};
const launchTier = { ...launchTiers[0], shipping };
const launchProgram = { ...reviewProgram, tiers: [launchTier] };
it("accepts a single configured membership and rejects duplicate membership IDs", () => {
  expect(tiersSchema.safeParse([launchTier]).success).toBe(true);
  expect(
    tiersSchema.safeParse([
      { ...launchTier },
      { ...launchTier, price_id: "price_other" },
    ]).success,
  ).toBe(false);
});
it("adds the flat fee as a monthly recurring checkout item and blocks an undecided fee", async () => {
  const create = vi
    .spyOn(stripe.checkout.sessions, "create")
    .mockResolvedValue({
      id: "cs_fixture",
      status: "open",
      customer: "cus_fixture",
      subscription: null,
      metadata: {},
      livemode: false,
      url: "https://checkout.stripe.com/fixture",
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
  const r = {
    id: "reservation",
    tier_snapshot: launchTier,
    expires_at: new Date("2026-11-02T19:00:00Z"),
  } as Reservation;
  await gateway.createSession(launchProgram, reviewMember, r);
  expect(create.mock.calls[0][0]?.line_items).toEqual([
    { price: launchTier.price_id, quantity: 1 },
    { price: shipping.price_id, quantity: 1 },
  ]);
  expect(create.mock.calls[0][0]?.custom_text?.submit).toMatchObject({
    message: expect.stringContaining("renews monthly"),
  });
  await expect(
    gateway.createSession(launchProgram, reviewMember, {
      ...r,
      tier_snapshot: { ...launchTiers[0], shipping: null },
    }),
  ).rejects.toThrow("shipping_not_ready");
});
it("validates the shipping Price and metadata alongside the membership", async () => {
  const retrieve = vi
    .spyOn(stripe.prices, "retrieve")
    .mockImplementation(async (id) => {
      const charge = id === launchTier.price_id ? launchTier : shipping;
      return {
        id,
        active: true,
        product: {
          id: charge.product_id,
          active: true,
          metadata:
            id === launchTier.price_id
              ? { grim_subscription: "true" }
              : { grim_shipping: "true" },
        },
        currency: "usd",
        unit_amount: charge.amount,
        type: "recurring",
        livemode: false,
        billing_scheme: "per_unit",
        recurring: {
          interval: "month",
          interval_count: 1,
          usage_type: "licensed",
        },
      } as unknown as Stripe.Response<Stripe.Price>;
    });
  vi.spyOn(gateway, "checkPortal").mockResolvedValue();
  await gateway.checkConfiguration(launchProgram);
  expect(retrieve.mock.calls.map(([id]) => id)).toEqual([
    launchTier.price_id,
    shipping.price_id,
  ]);
  await expect(
    gateway.checkConfiguration({
      ...reviewProgram,
      tiers: [{ ...launchTiers[0], shipping: null }],
    }),
  ).rejects.toThrow("shipping_not_ready");
  retrieve.mockResolvedValue({
    id: shipping.price_id,
    active: false,
  } as Stripe.Response<Stripe.Price>);
  await expect(gateway.checkConfiguration(launchProgram)).rejects.toThrow(
    "invalid_price",
  );
});
it("recognizes a two-item monthly subscription regardless of item order and rejects a missing shipping item", async () => {
  const item = (charge: typeof shipping) => ({
    quantity: 1,
    current_period_start: 1793656800,
    current_period_end: 1796248800,
    price: {
      id: charge.price_id,
      product: charge.product_id,
      unit_amount: charge.amount,
      currency: "usd",
      type: "recurring",
      livemode: false,
      billing_scheme: "per_unit",
      recurring: {
        interval: "month",
        interval_count: 1,
        usage_type: "licensed",
      },
    },
  });
  const sub = {
    id: "sub_fixture",
    customer: "cus_fixture",
    metadata: {},
    status: "active",
    livemode: false,
    cancel_at_period_end: false,
    discounts: [],
    items: { has_more: false, data: [item(shipping), item(launchTier)] },
  };
  vi.spyOn(stripe.subscriptions, "retrieve").mockImplementation(
    async () => sub as unknown as Stripe.Response<Stripe.Subscription>,
  );
  expect(
    await gateway.subscription("sub_fixture", launchProgram),
  ).toMatchObject({ validPlan: true, priceId: launchTier.price_id });
  sub.items.data = [item(launchTier)];
  expect(
    (await gateway.subscription("sub_fixture", launchProgram)).validPlan,
  ).toBe(false);
});
