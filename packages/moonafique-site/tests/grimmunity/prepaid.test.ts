import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { randomUUID, createHmac } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { Grimmunity } from "../../lib/grimmunity/service";
import {
  membershipBilling,
  type BillingMonths,
} from "../../lib/grimmunity/billing-options";
import { sandboxTiers, type Tier } from "../../lib/grimmunity/tiers";
import { FakeBilling, delivery } from "./fake-billing";
import type {
  Invoice,
  Membership,
  Reservation,
} from "../../lib/grimmunity/model";
import type { ManagedBilling } from "../../lib/grimmunity/managed-stripe";
import {
  prepareRenewal,
  finishRenewal,
  collectRenewal,
  cancelManaged,
  runManagedMember,
  type BillingCycle,
  reissueNotice,
} from "../../lib/grimmunity/renewals";
import { saveEdition } from "../../lib/grimmunity/editions";
import { replaceRenewal } from "../../lib/grimmunity/renewal-replacement";
import { ClubError } from "../../lib/grimmunity/model";
import { receiveNoticeDelivery } from "../../lib/grimmunity/notice-delivery";
import { quoteMembership } from "../../lib/grimmunity/shipping";
import type { ShippingGateway, ShippingRate } from "../../lib/shippo";

const url = new URL(process.env.GRIM_TEST_DATABASE_URL ?? "http://invalid");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/grim_test"
)
  throw Error("Use local grim_test only");
const pool = new Pool({ connectionString: url.toString(), max: 10 });
let now: Date, c: Grimmunity, billing: ManagedFake;
const rate: ShippingRate = {
  id: "rate_fixture",
  amount: 625,
  currency: "usd",
  carrier: "USPS",
  service: "Ground Advantage",
  estimated_days: 4,
};
const shipping: ShippingGateway = {
  quote: async () => ({
    shipment_id: "fixture_shipment",
    rates: [{ ...rate }],
  }),
  buy: async () => {
    throw Error("No labels in billing tests");
  },
  transaction: async () => {
    throw Error("No labels in billing tests");
  },
};
const tiers: Tier[] = sandboxTiers.map((tier) => ({
  ...tier,
  billing_options: ([1, 6, 12] as const).map((months) => {
    const option = membershipBilling(tier.amount, months);
    return {
      months,
      discount: option.discount,
      amount: option.amount,
      price_id: months === 1 ? tier.price_id : `price_${tier.id}_${months}`,
    };
  }),
}));

class ManagedFake extends FakeBilling {
  replacementRace = false;
  payCalls = 0;
  cancelEnds: Date[] = [];
  paymentUncertain = false;
  managed: ManagedBilling = {
    replace: async (_p, m, intent) => {
      const original = this.invoices.get(intent.original_invoice_id)!;
      if (this.replacementRace) this.markPaid(original.id);
      if (original.status === "paid")
        throw new ClubError("replacement_needs_review");
      original.status = "void";
      const existing = [...this.invoices.values()].find(
        (i) => i.metadata?.grim_replacement === intent.request_key,
      );
      if (existing) return existing.id;
      const id = `in_replacement_${intent.request_key}`;
      const i: Invoice = {
        ...structuredClone(original),
        id,
        status: "draft",
        reason: "manual",
        amountPaid: 0,
        total: 0,
        amountDue: 0,
        totalExcludingTax: 0,
        paidAt: null,
        paymentVerified: false,
        metadata: { grim_replacement: intent.request_key },
        lines: [],
      };
      i.lines.push({
        ...this.line(
          i,
          "price_replacement_delivery",
          "prod_delivery",
          0,
          false,
          intent.period_start.getTime() / 1000,
          intent.period_end.getTime() / 1000,
        ),
        metadata: { grim_delivery: intent.request_key },
      });
      if (intent.base_amount)
        i.lines.push({
          ...this.line(
            i,
            "price_replacement_base",
            m.tier_snapshot.product_id,
            intent.base_amount,
            false,
            intent.base_start!.getTime() / 1000,
            intent.base_end!.getTime() / 1000,
          ),
          metadata: {
            grim_membership_price: m.tier_snapshot.billing!.price_id,
          },
        });
      this.invoices.set(id, i);
      return id;
    },
    deliveryProduct: () => "prod_delivery",
    postageProduct: () => "prod_postage",
    postagePrice: async (_p, amount) => ({
      amount,
      price_id: `price_postage_${amount}`,
      product_id: "prod_postage",
    }),
    start: async (_p, m, r) => {
      const subId = `sub_${r.id}`;
      if (!this.subscriptions.has(subId)) {
        const start = Date.parse("2026-11-02T18:00:00Z") / 1000,
          end = Date.parse("2026-12-02T18:00:00Z") / 1000;
        this.subscriptions.set(subId, {
          id: subId,
          customer: m.customer_id!,
          reservation: r.id,
          status: "active",
          livemode: false,
          cancelAtPeriodEnd: false,
          start,
          end,
          validPlan: true,
          priceId: r.tier_snapshot.billing!.price_id,
        });
        this.makeInvoice(
          m,
          r.tier_snapshot,
          subId,
          "in_initial",
          start,
          end,
          true,
        );
      }
      return { subscription: subId, invoice: "in_initial" };
    },
    pending: async (m) =>
      [...this.invoices.values()]
        .filter(
          (i) =>
            i.subscription === m.subscription_id &&
            ["draft", "open"].includes(i.status!),
        )
        .map((i) => i.id),
    prepare: async (_p, m, id, quote, initial) => {
      const i = this.invoices.get(id)!;
      if (i.status === "draft") {
        if (!initial)
          i.lines.push(
            this.line(
              i,
              "price_postage_" + quote.amount,
              "prod_postage",
              quote.amount,
              false,
            ),
          );
        i.status = "open";
        i.total = i.lines.reduce((total, l) => total + l.amount, 0);
        i.amountDue = i.total;
        i.totalExcludingTax = i.total;
      }
      return structuredClone(i);
    },
    pay: async (id) => {
      this.payCalls++;
      if (this.paymentUncertain) throw Error("Ambiguous provider response");
      this.markPaid(id);
    },
    void: async (id) => {
      const i = this.invoices.get(id)!;
      if (i.status === "paid") return false;
      i.status = "void";
      return true;
    },
    cancel: async (id, end, date) => {
      this.cancelEnds.push(end);
      const s = this.subscriptions.get(id)!;
      s.cancelAtPeriodEnd = true;
      if (end <= date) s.status = "canceled";
    },
  };
  markPaid(id: string) {
    const i = this.invoices.get(id)!;
    Object.assign(i, {
      status: "paid",
      amountPaid: i.total,
      paymentVerified: true,
      paidAt: now.getTime() / 1000,
    });
  }
  line(
    i: Invoice,
    price: string,
    product: string,
    amount: number,
    recurring = true,
    start?: number,
    end?: number,
  ) {
    const sub = this.subscriptions.get(i.subscription!)!;
    return {
      invoice: i.id,
      subscription: recurring ? i.subscription : null,
      price,
      product,
      amount,
      recurring,
      proration: false,
      quantity: 1,
      currency: "usd",
      start: start ?? sub.start,
      end: end ?? sub.end,
    };
  }
  makeInvoice(
    m: Membership,
    tier: Tier,
    sub: string,
    id: string,
    start: number,
    end: number,
    includeBase: boolean,
  ) {
    this.subscriptions.get(sub)!.start = start;
    this.subscriptions.get(sub)!.end = end;
    const i: Invoice = {
      id,
      customer: m.customer_id!,
      subscription: sub,
      livemode: false,
      status: "draft",
      reason:
        id === "in_initial" ? "subscription_create" : "subscription_cycle",
      currency: "usd",
      autoAdvance: false,
      collectionMethod: "send_invoice",
      hostedUrl: "https://invoice.stripe.com/i/fixture",
      amountPaid: 0,
      amountDue: 0,
      total: 0,
      taxExclusive: 0,
      totalExcludingTax: 0,
      automaticTaxComplete: false,
      paidAt: null,
      lines: [],
      adjusted: false,
      paymentVerified: false,
      financialState: "paid",
    };
    i.lines.push(this.line(i, "price_delivery", "prod_delivery", 0));
    if (includeBase) {
      const baseEnd = new Date(start * 1000);
      baseEnd.setUTCMonth(baseEnd.getUTCMonth() + tier.billing!.months);
      i.lines.push(
        this.line(
          i,
          tier.billing!.price_id,
          tier.product_id,
          tier.billing!.amount,
          true,
          start,
          baseEnd.getTime() / 1000,
        ),
      );
    }
    if (id === "in_initial")
      i.lines.push(
        this.line(
          i,
          tier.shipping!.price_id,
          "prod_postage",
          tier.shipping!.amount,
          false,
        ),
      );
    i.total = i.lines.reduce((sum, l) => sum + l.amount, 0);
    i.amountDue = i.total;
    i.totalExcludingTax = i.total;
    this.invoices.set(id, i);
    return i;
  }
}

beforeAll(() => migrate(pool));
afterAll(() => pool.end());
beforeEach(async () => {
  rate.amount = 625;
  await pool.query("TRUNCATE grim.program CASCADE");
  await seedSandbox(pool);
  await pool.query(
    "UPDATE grim.program SET enabled=true,billing_policy='notice_shipping_v1',tiers=$1",
    [JSON.stringify(tiers)],
  );
  now = new Date("2026-11-02T18:00:00Z");
  billing = new ManagedFake();
  c = new Grimmunity(pool, billing, "sandbox", () => now);
});

it("retains all twelve prepaid monthly deliveries and charges membership again only at annual renewal", async () => {
  const m = await firstPaid();
  for (let month = 1; month <= 12; month++) {
    const start = new Date(Date.UTC(2026, 10 + month, 2, 18));
    const end = new Date(Date.UTC(2026, 11 + month, 2, 18));
    const monthKey = start.toISOString().slice(0, 7),
      nextKey = end.toISOString().slice(0, 7);
    now = start;
    await saveEdition(c, "staff", {
      action: "edition",
      month: monthKey,
      title: `Paid delivery ${month}`,
      enrollment_open: `${monthKey}-01T00:00`,
      enrollment_close: `${nextKey}-01T00:00`,
      payment_cutoff: `${nextKey}-08T00:00`,
      address_cutoff: `${nextKey}-08T00:00`,
      dispatch_start: `${nextKey}-08T00:00`,
      dispatch_end: `${nextKey}-15T00:00`,
      state: "open",
    });
    const invoice = billing.makeInvoice(
      m,
      m.tier_snapshot,
      m.subscription_id!,
      `in_month_${month}`,
      start.getTime() / 1000,
      end.getTime() / 1000,
      month === 12,
    );
    rate.amount = 600 + month;
    await prepareRenewal(c, shipping, m.id, invoice.id);
    await finishRenewal(c, invoice.id);
    const cycle = (
      await pool.query<BillingCycle>(
        "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
        [invoice.id],
      )
    ).rows[0];
    expect(cycle.membership_amount).toBe(month === 12 ? 32400 : 0);
    await delivered(cycle, start);
    now = new Date(cycle.charge_at!);
    await collectRenewal(c, invoice.id, true);
    expect((await pool.query("SELECT * FROM grim.fulfillments")).rowCount).toBe(
      month + 1,
    );
  }
  expect(
    (await pool.query("SELECT * FROM grim.prepaid_periods")).rowCount,
  ).toBe(2);
  expect(billing.payCalls).toBe(12);
});

it("replaying an old completed checkout never turns a later invoice into a new initial payment", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  await c.process({
    id: `evt_${randomUUID()}`,
    type: "checkout.session.completed",
    object_id: [...billing.sessions.keys()][0],
    livemode: false,
  });
  expect(
    (await pool.query("SELECT * FROM grim.billing_cycles WHERE initial"))
      .rowCount,
  ).toBe(1);
  expect(
    (
      await pool.query(
        "SELECT initial FROM grim.billing_cycles WHERE invoice_id=$1",
        [cycle.invoice_id],
      )
    ).rows[0].initial,
  ).toBe(false);
});

it("staff can issue a fresh notice after delivery review, without bypassing the new seven-day wait", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  await delivered(cycle);
  await pool.query("UPDATE grim.outbox SET delivery_failed_at=$2 WHERE id=$1", [
    cycle.notice_id,
    now,
  ]);
  await collectRenewal(c, cycle.invoice_id, true);
  await reissueNotice(
    c,
    "staff",
    cycle.invoice_id,
    "Email delivery reviewed with the member",
  );
  const next = (
    await pool.query<BillingCycle>(
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [cycle.invoice_id],
    )
  ).rows[0];
  expect(next.notice_version).toBe(2);
  expect(next.notice_id).not.toBe(cycle.notice_id);
  now = new Date(next.charge_at!);
  await collectRenewal(c, cycle.invoice_id, true);
  expect(billing.payCalls).toBe(0);
});

it("a staff review note cannot authorize a changed invoice or address", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  billing.invoices.get(cycle.invoice_id)!.total++;
  await expect(
    reissueNotice(c, "staff", cycle.invoice_id, "Reviewed with the customer"),
  ).rejects.toThrow("renewal_needs_review");
  expect(billing.payCalls).toBe(0);
});

it("restored payment after a won dispute requires staff review before a held delivery is released", async () => {
  await firstPaid();
  billing.invoices.get("in_initial")!.financialState = "disputed";
  await c.reconcileInvoice("in_initial");
  await expect(
    c.releaseHold("staff", "in_initial", "Checking the dispute"),
  ).rejects.toThrow("financial_hold_active");
  billing.invoices.get("in_initial")!.financialState = "paid";
  await c.releaseHold(
    "staff",
    "in_initial",
    "Stripe confirmed the dispute is won",
  );
  expect(
    (await pool.query("SELECT financial_state FROM grim.prepaid_periods"))
      .rows[0].financial_state,
  ).toBe("paid");
  expect(
    (await pool.query("SELECT state FROM grim.fulfillments")).rows[0].state,
  ).toBe("paid");
});

it("missing prepaid coverage prevents a shipping-only payment from granting a delivery", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  await delivered(cycle);
  now = new Date(cycle.charge_at!);
  await pool.query(
    "UPDATE grim.prepaid_periods SET period_end='2026-12-02T18:00:00Z'",
  );
  await collectRenewal(c, cycle.invoice_id, true);
  expect(billing.payCalls).toBe(0);
});
async function join(months: BillingMonths = 12) {
  const quote = await quoteMembership(c, shipping, "collector", {
    tierId: "grimm_keeper",
    address: delivery,
  });
  await c.checkout(
    { id: "collector", email: "collector@example.invalid" },
    {
      requestKey: randomUUID(),
      tierId: "grimm_keeper",
      billingMonths: months,
      termsVersion: "sandbox-review-v1",
      country: "US",
      consent: true,
      shippingQuoteId: quote.id,
    },
  );
  const r = (
    await pool.query<Reservation>("SELECT * FROM grim.reservations LIMIT 1")
  ).rows[0];
  const s = billing.sessions.get(r.session_id!)!;
  s.state = "complete";
  s.setupIntent = "seti_fixture";
  await c.process({
    id: `evt_${randomUUID()}`,
    type: "checkout.session.completed",
    object_id: s.id,
    livemode: false,
  });
  return (
    await pool.query<Membership>("SELECT * FROM grim.memberships LIMIT 1")
  ).rows[0];
}
async function firstPaid(months: BillingMonths = 12) {
  const m = await join(months);
  billing.markPaid("in_initial");
  await c.reconcileInvoice("in_initial");
  return m;
}
async function renewal(m: Membership, includeBase = false) {
  now = new Date("2026-12-02T18:00:00Z");
  const i = billing.makeInvoice(
    m,
    m.tier_snapshot,
    m.subscription_id!,
    "in_renewal",
    now.getTime() / 1000,
    Date.parse("2027-01-02T18:00:00Z") / 1000,
    includeBase,
  );
  rate.amount = 695;
  await prepareRenewal(c, shipping, m.id, i.id);
  await finishRenewal(c, i.id);
  return (
    await pool.query<BillingCycle>(
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [i.id],
    )
  ).rows[0];
}
async function delivered(cycle: BillingCycle, when = now) {
  await pool.query(
    "UPDATE grim.outbox SET state='sent',sent_at=$2,delivered_at=$2,provider_id=$3 WHERE id=$1",
    [cycle.notice_id, when, `email_${cycle.notice_id}`],
  );
}

it.each([1, 6, 12] as const)(
  "saves the %i-month choice and requires a separate first invoice payment",
  async (months) => {
    rate.amount = 625;
    const m = await join(months);
    expect(m.tier_snapshot.billing?.months).toBe(months);
    expect(billing.payCalls).toBe(0);
    expect((await pool.query("SELECT * FROM grim.fulfillments")).rowCount).toBe(
      0,
    );
    const info = await c.confirmation(
      "collector",
      [...billing.sessions.keys()][0],
    );
    expect(info.invoiceUrl).toBe("https://invoice.stripe.com/i/fixture");
    billing.markPaid("in_initial");
    await c.reconcileInvoice("in_initial");
    expect((await pool.query("SELECT * FROM grim.fulfillments")).rowCount).toBe(
      1,
    );
    expect(
      (await pool.query("SELECT * FROM grim.prepaid_periods")).rows[0].amount,
    ).toBe(membershipBilling(3000, months).amount);
  },
);
it("quotes monthly postage, itemizes a shipping-only renewal, and charges once after a delivered seven-day notice", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  expect(cycle).toMatchObject({
    membership_amount: 0,
    shipping_amount: 695,
    total: 695,
    state: "noticed",
  });
  const message = (
    await pool.query("SELECT * FROM grim.outbox WHERE id=$1", [cycle.notice_id])
  ).rows[0];
  expect(message.body).toContain("Membership: $0.00 (already prepaid)");
  expect(message.body).toContain("Shipping: $6.95");
  expect(message.body).toContain("Total: $6.95");
  now = new Date(cycle.charge_at!);
  await collectRenewal(c, cycle.invoice_id, true);
  expect(billing.payCalls).toBe(0);
  await delivered(cycle, new Date("2026-12-02T18:00:00Z"));
  now = new Date("2026-12-08T18:00:00Z");
  await collectRenewal(c, cycle.invoice_id, true);
  expect(billing.payCalls).toBe(0);
  now = new Date(cycle.charge_at!);
  await Promise.all([
    collectRenewal(c, cycle.invoice_id, true),
    collectRenewal(c, cycle.invoice_id, true),
  ]);
  expect(billing.payCalls).toBe(1);
  expect((await pool.query("SELECT tier_snapshot FROM grim.entitlements WHERE invoice_id='in_renewal'")).rows[0].tier_snapshot.shipping.amount).toBe(695);
  expect((await pool.query("SELECT * FROM grim.fulfillments")).rowCount).toBe(
    2,
  );
  expect(
    (
      await pool.query(
        "SELECT coverage_invoice_id FROM grim.entitlements WHERE invoice_id='in_renewal'",
      )
    ).rows[0].coverage_invoice_id,
  ).toBe("in_initial");
});
it("includes membership again in each monthly renewal", async () => {
  const m = await firstPaid(1),
    cycle = await renewal(m, true);
  expect(cycle.membership_amount).toBe(3000);
  expect(cycle.total).toBe(3695);
});
it.each([
  "address",
  "amount",
  "delivery_failed",
  "subscription",
  "collection_disabled",
])(
  "blocks automatic payment when %s changes or is unavailable",
  async (kind) => {
    const m = await firstPaid(),
      cycle = await renewal(m);
    await delivered(cycle);
    now = new Date(cycle.charge_at!);
    if (kind === "address")
      billing.customers.get(m.customer_id!)!.address!.postal_code = "83442";
    if (kind === "amount") billing.invoices.get(cycle.invoice_id)!.total++;
    if (kind === "delivery_failed")
      await pool.query(
        "UPDATE grim.outbox SET delivery_failed_at=$2 WHERE id=$1",
        [cycle.notice_id, now],
      );
    if (kind === "subscription")
      billing.subscriptions.get(m.subscription_id!)!.validPlan = false;
    await collectRenewal(c, cycle.invoice_id, kind !== "collection_disabled");
    expect(billing.payCalls).toBe(0);
  },
);
it("sends a new notice when delivery is too late for the scheduled date", async () => {
  await pool.query(
    "UPDATE grim.editions SET payment_cutoff='2027-01-08T00:00:00Z',address_cutoff='2027-01-08T00:00:00Z',dispatch_start='2027-01-08T00:00:00Z',dispatch_end='2027-01-15T00:00:00Z' WHERE month='2026-12'",
  );
  const m = await firstPaid(),
    cycle = await renewal(m);
  now = new Date(cycle.charge_at!);
  await delivered(cycle, now);
  await collectRenewal(c, cycle.invoice_id, true);
  const next = (
    await pool.query<BillingCycle>(
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [cycle.invoice_id],
    )
  ).rows[0];
  expect(next.notice_id).not.toBe(cycle.notice_id);
  expect(next.notice_version).toBe(2);
  expect(billing.payCalls).toBe(0);
});
it("does not retry an ambiguous payment", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  await delivered(cycle);
  now = new Date(cycle.charge_at!);
  billing.paymentUncertain = true;
  await collectRenewal(c, cycle.invoice_id, true);
  await collectRenewal(c, cycle.invoice_id, true);
  expect(billing.payCalls).toBe(1);
  expect(
    (
      await pool.query(
        "SELECT state FROM grim.billing_cycles WHERE invoice_id=$1",
        [cycle.invoice_id],
      )
    ).rows[0].state,
  ).toBe("hold");
});
it("cancels annual membership renewal at the end of paid coverage while retaining monthly delivery", async () => {
  const m = await firstPaid();
  await cancelManaged(c, "collector", m.id);
  expect(billing.cancelEnds[0].toISOString()).toBe("2027-11-02T18:00:00.000Z");
  const cycle = await renewal(m);
  expect(cycle.state).toBe("noticed");
  expect(cycle.membership_amount).toBe(0);
});
it("blocks cancellation by a different account", async () => {
  const m = await firstPaid();
  await expect(cancelManaged(c, "somebody_else", m.id)).rejects.toThrow(
    "membership_not_found",
  );
  expect(billing.cancelEnds).toHaveLength(0);
});
it("a refund of prepaid membership holds remaining deliveries even if its webhook was missed", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  await delivered(cycle);
  now = new Date(cycle.charge_at!);
  billing.invoices.get("in_initial")!.financialState = "refunded";
  await collectRenewal(c, cycle.invoice_id, true);
  expect(billing.payCalls).toBe(0);
  expect(
    (await pool.query("SELECT financial_state FROM grim.prepaid_periods"))
      .rows[0].financial_state,
  ).toBe("hold");
  expect(
    (await pool.query("SELECT state FROM grim.fulfillments")).rows[0].state,
  ).toBe("hold");
});
it("expires an unpaid initial invoice without buying postage or charging a card", async () => {
  const m = await join();
  now = new Date("2026-11-02T20:00:00Z");
  await runManagedMember(c, shipping, m, true);
  expect(billing.invoices.get("in_initial")!.status).toBe("void");
  expect(billing.payCalls).toBe(0);
  expect(
    (await pool.query("SELECT seat_held FROM grim.memberships")).rows[0]
      .seat_held,
  ).toBe(false);
  expect(
    (await pool.query("SELECT state FROM grim.reservations")).rows[0].state,
  ).toBe("released");
});

it("verifies signed delivery receipts, rejects forgeries, and never clears a later bounce", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  const email = "email_signed_fixture",
    secret = Buffer.from("a-strong-fixture-webhook-secret").toString("base64");
  process.env.GRIM_RESEND_WEBHOOK_SECRET = `whsec_${secret}`;
  await pool.query(
    "UPDATE grim.outbox SET state='sent',provider_id=$2 WHERE id=$1",
    [cycle.notice_id, email],
  );
  const req = (type: string, valid = true) => {
    const payload = JSON.stringify({
      type,
      created_at: new Date().toISOString(),
      data: {
        email_id: email,
        tags: { grim_outbox: cycle.notice_id, grim_mode: "sandbox" },
      },
    });
    const stamp = String(Math.floor(Date.now() / 1000)),
      id = "msg_fixture";
    const signature = createHmac("sha256", Buffer.from(secret, "base64"))
      .update(`${id}.${stamp}.${payload}`)
      .digest("base64");
    return new Request("http://localhost/api/grimmunity/notice-delivery", {
      method: "POST",
      body: payload,
      headers: {
        "svix-id": id,
        "svix-timestamp": stamp,
        "svix-signature": `v1,${valid ? signature : "invalid"}`,
      },
    });
  };
  await expect(
    receiveNoticeDelivery(
      pool,
      "sandbox",
      req("email.delivered", false),
      new Date("2026-12-03"),
    ),
  ).rejects.toThrow("invalid_webhook");
  await receiveNoticeDelivery(
    pool,
    "sandbox",
    req("email.delivered"),
    new Date("2026-12-03"),
  );
  await receiveNoticeDelivery(
    pool,
    "sandbox",
    req("email.bounced"),
    new Date("2026-12-04"),
  );
  await receiveNoticeDelivery(
    pool,
    "sandbox",
    req("email.delivered"),
    new Date("2026-12-05"),
  );
  const record = (
    await pool.query("SELECT * FROM grim.outbox WHERE id=$1", [cycle.notice_id])
  ).rows[0];
  expect(record.delivered_at.toISOString()).toBe("2026-12-03T00:00:00.000Z");
  expect(record.delivery_failed_at).not.toBeNull();
});

it.each([1, 12] as const)(
  "replaces an unpaid %i-month member's invoice after a new address and quote, with a fresh notice",
  async (months) => {
    const m = await firstPaid(months),
      old = await renewal(m, months === 1);
    await delivered(old);
    billing.customers.get(m.customer_id!)!.address!.postal_code = "83442";
    now = new Date(old.charge_at!);
    await collectRenewal(c, old.invoice_id, true);
    expect(billing.payCalls).toBe(0);
    await pool.query(
      "UPDATE grim.editions SET payment_cutoff='2027-01-08T00:00:00Z',address_cutoff='2027-01-08T00:00:00Z',dispatch_start='2027-01-08T00:00:00Z',dispatch_end='2027-01-15T00:00:00Z' WHERE month='2026-12'",
    );
    rate.amount = 825;
    const replacement = await replaceRenewal(
      c,
      shipping,
      "staff",
      old.invoice_id,
      "New delivery address confirmed with the member",
    );
    expect(billing.invoices.get(old.invoice_id)!.status).toBe("void");
    const cycle = (
      await pool.query<BillingCycle>(
        "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
        [replacement],
      )
    ).rows[0];
    expect(cycle.state).toBe("noticed");
    expect(cycle.address_snapshot.postal_code).toBe("83442");
    expect(cycle.shipping_amount).toBe(825);
    expect(cycle.membership_amount).toBe(months === 1 ? 3000 : 0);
    expect(cycle.notice_id).not.toBe(old.notice_id);
    expect(
      await replaceRenewal(
        c,
        shipping,
        "staff",
        old.invoice_id,
        "Retry after confirming provider result",
      ),
    ).toBe(replacement);
    expect(
      (await pool.query("SELECT * FROM grim.billing_cycles")).rowCount,
    ).toBe(3);
    await collectRenewal(c, replacement, true);
    expect(billing.payCalls).toBe(0);
    await delivered(cycle, now);
    now = new Date(cycle.charge_at!);
    await collectRenewal(c, replacement, true);
    expect(billing.payCalls).toBe(1);
    expect((await pool.query("SELECT * FROM grim.fulfillments")).rowCount).toBe(
      2,
    );
  },
);

it("a payment racing invoice replacement blocks the replacement without charging twice", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  billing.replacementRace = true;
  await expect(
    replaceRenewal(
      c,
      shipping,
      "staff",
      cycle.invoice_id,
      "Confirm address before sending another notice",
    ),
  ).rejects.toThrow("replacement_needs_review");
  expect(
    (await pool.query("SELECT state FROM grim.billing_replacements")).rows[0]
      .state,
  ).toBe("review");
  expect(billing.payCalls).toBe(0);
  expect(
    [...billing.invoices.values()].filter((i) => i.reason === "manual"),
  ).toHaveLength(0);
});

it("a failed carrier quote is visible and safely retryable without payment or a notice", async () => {
  const m = await firstPaid();
  now = new Date("2026-12-02T18:00:00Z");
  const i = billing.makeInvoice(
    m,
    m.tier_snapshot,
    m.subscription_id!,
    "in_quote_failed",
    now.getTime() / 1000,
    Date.parse("2027-01-02T18:00:00Z") / 1000,
    false,
  );
  await prepareRenewal(
    c,
    {
      ...shipping,
      quote: async () => {
        throw Error("Provider unavailable");
      },
    },
    m.id,
    i.id,
  );
  await finishRenewal(c, i.id);
  let cycle = (
    await pool.query<BillingCycle>(
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [i.id],
    )
  ).rows[0];
  expect(cycle.state).toBe("preparing");
  expect(cycle.rate).toBeNull();
  expect(cycle.notice_id).toBeNull();
  expect(cycle.hold_reason).toBe("shipping_quote_failed");
  await prepareRenewal(c, shipping, m.id, i.id);
  await finishRenewal(c, i.id);
  cycle = (
    await pool.query<BillingCycle>(
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [i.id],
    )
  ).rows[0];
  expect(cycle.state).toBe("noticed");
  expect(billing.payCalls).toBe(0);
});

it("does not automatically charge for an edition after its payment cutoff", async () => {
  const m = await firstPaid(),
    cycle = await renewal(m);
  await delivered(cycle);
  now = new Date("2026-12-12T18:00:00Z");
  await collectRenewal(c, cycle.invoice_id, true);
  expect(billing.payCalls).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT hold_reason FROM grim.billing_cycles WHERE invoice_id=$1",
        [cycle.invoice_id],
      )
    ).rows[0].hold_reason,
  ).toBe("edition_not_ready_for_payment");
});
