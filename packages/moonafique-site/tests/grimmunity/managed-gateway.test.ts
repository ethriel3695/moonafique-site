import { beforeEach, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { StripeGateway } from "../../lib/grimmunity/stripe-gateway";
import {
  reviewProgram,
  reviewMember,
} from "../../lib/grimmunity/review-fixture";
import { sandboxTiers, type Tier } from "../../lib/grimmunity/tiers";
import { membershipBilling } from "../../lib/grimmunity/billing-options";
import type { Reservation } from "../../lib/grimmunity/model";
import { delivery } from "./fake-billing";

const stripe = new Stripe("sk_test_fixture"),
  gateway = new StripeGateway(stripe);
const base = sandboxTiers.find((t) => t.id === "grimm_keeper")!;
const options = ([1, 6, 12] as const).map((months) => {
  const p = membershipBilling(base.amount, months);
  return {
    months,
    amount: p.amount,
    discount: p.discount,
    price_id: `price_${months}`,
  };
});
const tier: Tier = {
  ...base,
  price_id: "price_1",
  billing_options: options,
  billing: options[2],
  shipping: {
    price_id: "price_postage",
    product_id: "prod_postage",
    amount: 625,
  },
};
const p = {
  ...reviewProgram,
  billing_policy: "notice_shipping_v1" as const,
  managed_portal_configuration_id: "bpc_managed",
  tiers: [tier],
};
beforeEach(() => vi.restoreAllMocks());
function subscription() {
  return {
    id: "sub_fixture",
    customer: reviewMember.customer_id,
    status: "active",
    livemode: false,
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: {
      grim_reservation: "reservation",
      grim_billing: "notice_shipping_v1",
    },
    billing_mode: { type: "flexible" },
    collection_method: "send_invoice",
    pause_collection: { behavior: "keep_as_draft" },
    discounts: [],
    trial_start: null,
    trial_end: null,
    schedule: null,
    items: {
      has_more: false,
      data: [
        {
          quantity: 1,
          current_period_start: 1793642400,
          current_period_end: 1825178400,
          price: {
            id: "price_12",
            product: tier.product_id,
            unit_amount: 32400,
            currency: "usd",
            type: "recurring",
            billing_scheme: "per_unit",
            livemode: false,
            recurring: {
              interval: "year",
              interval_count: 1,
              usage_type: "licensed",
            },
          },
        },
        {
          quantity: 1,
          current_period_start: 1793642400,
          current_period_end: 1796234400,
          price: {
            id: "price_delivery",
            product: gateway.managed.deliveryProduct("sandbox"),
            unit_amount: 0,
            currency: "usd",
            type: "recurring",
            billing_scheme: "per_unit",
            livemode: false,
            recurring: {
              interval: "month",
              interval_count: 1,
              usage_type: "licensed",
            },
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}
it("accepts distinct annual membership and monthly delivery periods only with invoice collection held", async () => {
  const raw = subscription();
  vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
    raw as Stripe.Response<Stripe.Subscription>,
  );
  expect((await gateway.subscription(raw.id, p, tier)).validPlan).toBe(true);
  raw.collection_method = "charge_automatically";
  expect((await gateway.subscription(raw.id, p, tier)).validPlan).toBe(false);
  raw.collection_method = "send_invoice";
  raw.pause_collection = null;
  expect((await gateway.subscription(raw.id, p, tier)).validPlan).toBe(false);
});
it("rejects changed plan amount, quantity, or a scheduled resume of automatic advancement", async () => {
  const raw = subscription();
  vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
    raw as Stripe.Response<Stripe.Subscription>,
  );
  raw.items.data[0].price.unit_amount = 32399;
  expect((await gateway.subscription(raw.id, p, tier)).validPlan).toBe(false);
  raw.items.data[0].price.unit_amount = 32400;
  raw.items.data[1].quantity = 2;
  expect((await gateway.subscription(raw.id, p, tier)).validPlan).toBe(false);
  raw.items.data[1].quantity = 1;
  raw.pause_collection!.resumes_at = 1825178400;
  expect((await gateway.subscription(raw.id, p, tier)).validPlan).toBe(false);
});
it("saves a card in setup mode without creating a mixed-interval Checkout payment", async () => {
  vi.spyOn(stripe.customers, "update").mockResolvedValue(
    {} as Stripe.Response<Stripe.Customer>,
  );
  const create = vi
    .spyOn(stripe.checkout.sessions, "create")
    .mockResolvedValue({
      id: "cs_fixture",
      customer: reviewMember.customer_id,
      status: "open",
      livemode: false,
      url: "https://checkout.stripe.com/fixture",
      metadata: { grim_reservation: "reservation" },
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
  await gateway.createSession(p, { ...reviewMember, tier_snapshot: tier }, {
    id: "reservation",
    tier_snapshot: tier,
    shipping_quote_id: "quote",
    shipping_address: delivery,
    expires_at: new Date("2026-11-02T19:00:00Z"),
  } as Reservation);
  const params = create.mock.calls[0][0]!;
  expect(params.mode).toBe("setup");
  expect(params.line_items).toBeUndefined();
  expect(params.subscription_data).toBeUndefined();
  expect(params.setup_intent_data?.metadata?.grim_reservation).toBe(
    "reservation",
  );
});
it("disables portal cancellation so a monthly delivery boundary cannot cancel a prepaid term", async () => {
  const portal = {
    active: true,
    livemode: false,
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["shipping"] },
      subscription_update: { enabled: false },
      subscription_cancel: { enabled: false },
    },
  };
  vi.spyOn(stripe.billingPortal.configurations, "retrieve").mockResolvedValue(
    portal as unknown as Stripe.Response<Stripe.BillingPortal.Configuration>,
  );
  await gateway.checkPortal(p, true);
  portal.features.subscription_cancel.enabled = true;
  await expect(gateway.checkPortal(p, true)).rejects.toThrow("invalid_portal");
});
