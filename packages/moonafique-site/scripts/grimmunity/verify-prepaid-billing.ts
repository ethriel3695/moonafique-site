// Destructive only to the explicitly disposable local grim_test database.
// All external objects use Stripe/Shippo sandbox keys. No real email is sent.
import { readFile, writeFile } from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { Grimmunity } from "../../lib/grimmunity/service";
import { grimStripe, StripeGateway } from "../../lib/grimmunity/stripe-gateway";
import { membershipBilling } from "../../lib/grimmunity/billing-options";
import { sandboxTiers, type Tier } from "../../lib/grimmunity/tiers";
import { saveEdition } from "../../lib/grimmunity/editions";
import { quoteMembership } from "../../lib/grimmunity/shipping";
import { shippoGateway } from "../../lib/shippo";
import {
  collectRenewal,
  finishRenewal,
  prepareRenewal,
  cancelManaged,
  type BillingCycle,
} from "../../lib/grimmunity/renewals";
import { receiveNoticeDelivery } from "../../lib/grimmunity/notice-delivery";
import type { Membership } from "../../lib/grimmunity/model";
import { one, transaction, lockedProgram } from "../../lib/grimmunity/db";
import { replaceRenewal } from "../../lib/grimmunity/renewal-replacement";

const file = "/private/tmp/moonafique-prepaid-billing-verification.json";
type Receipt = {
  setupIntent?: string;
  clock: string;
  product: string;
  delivery: string;
  postage: string;
  portal: string;
  now: string;
  session: string;
  membership: string;
  initial?: string;
  renewal?: string;
  checkout?: string;
  complete?: boolean;
};
const url = new URL(process.env.GRIM_TEST_DATABASE_URL ?? "http://invalid");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/grim_test" ||
  process.env.GRIM_MODE !== "sandbox" ||
  process.env.GRIM_PREPAID_VERIFY !== "approved"
)
  throw Error(
    "Use sandbox mode and an approved disposable local grim_test database",
  );
const pool = new Pool({ connectionString: url.toString(), max: 5 });
const stripe = grimStripe("sandbox"),
  gateway = new StripeGateway(stripe);
let receipt: Receipt;
let now = new Date();
const c = new Grimmunity(pool, gateway, "sandbox", () => now);
function configure() {
  now = new Date(receipt.now);
  gateway.managed.deliveryProduct = () => receipt.delivery;
  gateway.managed.postageProduct = () => receipt.postage;
}
async function persist() {
  await writeFile(file, JSON.stringify(receipt, null, 2), { mode: 0o600 });
}
async function advance(date: Date) {
  await stripe.testHelpers.testClocks.advance(receipt.clock, {
    frozen_time: Math.floor(date.getTime() / 1000),
  });
  for (let n = 0; n < 80; n++) {
    if (
      (await stripe.testHelpers.testClocks.retrieve(receipt.clock)).status ===
      "ready"
    ) {
      now = date;
      receipt.now = date.toISOString();
      await persist();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Error("Stripe test clock is still advancing");
}
async function setup() {
  await migrate(pool);
  if (
    await readFile(file, "utf8").then(
      () => true,
      () => false,
    )
  )
    throw Error(
      "A verification receipt already exists; inspect or clean it up first",
    );
  await pool.query("TRUNCATE grim.program CASCADE");
  await seedSandbox(pool);
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: "Moonafique prepaid billing verification",
  });
  const prefix = `prod_moonafique_probe_${Date.now()}`;
  const product = await stripe.products.create({
    id: prefix,
    name: "SANDBOX Grimm Keeper prepaid verification",
    metadata: { grim_subscription: "true" },
  });
  const portal = await stripe.billingPortal.configurations.create({
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["shipping"] },
      subscription_update: { enabled: false },
      subscription_cancel: { enabled: false },
    },
  });
  receipt = {
    clock: clock.id,
    product: product.id,
    delivery: `${prefix}_delivery`,
    postage: `${prefix}_postage`,
    portal: portal.id,
    now: new Date(clock.frozen_time * 1000).toISOString(),
    session: "",
    membership: "",
  };
  await persist();
  configure();
  const offer = sandboxTiers.find((tier) => tier.id === "grimm_keeper")!;
  const options = [];
  for (const months of [1, 6, 12] as const) {
    const billing = membershipBilling(offer.amount, months);
    const price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: billing.amount,
      recurring: billing.recurring,
      tax_behavior: "exclusive",
    });
    options.push({
      months,
      amount: billing.amount,
      discount: billing.discount,
      price_id: price.id,
    });
  }
  const tier: Tier = {
    ...offer,
    product_id: product.id,
    price_id: options[0].price_id,
    billing_options: options,
  };
  await pool.query(
    "UPDATE grim.program SET enabled=true,tiers=$1,billing_policy='notice_shipping_v1',managed_portal_configuration_id=$2",
    [JSON.stringify([tier]), portal.id],
  );
  if (process.env.GRIM_VERIFY_TAX === "exclusive")
    await pool.query("UPDATE grim.program SET tax_mode='exclusive'");
  // The test runs at the current time, independently of launch edition dates.
  for (let offset = 0; offset < 18; offset++) {
    const begin = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1),
    );
    const month = begin.toISOString().slice(0, 7),
      next = end.toISOString().slice(0, 7);
    await saveEdition(c, "sandbox-verifier", {
      action: "edition",
      month,
      title: `Sandbox verification ${month}`,
      enrollment_open: `${month}-01T00:00`,
      enrollment_close: `${next}-01T00:00`,
      payment_cutoff: `${next}-08T00:00`,
      address_cutoff: `${next}-08T00:00`,
      dispatch_start: `${next}-08T00:00`,
      dispatch_end: `${next}-15T00:00`,
      state: "open",
    });
  }
  const owner = {
    id: `prepaid-probe-${clock.id}`,
    email: "prepaid-billing-verification@example.invalid",
  };
  // A test-clock customer has no real email recipient.
  const customer = await stripe.customers.create({
    test_clock: clock.id,
    name: "Moonafique Sandbox",
    metadata: { grim_program: "sandbox" },
  });
  const address = {
    name: "Moonafique Sandbox",
    line1: "798 N 4000 E",
    line2: "",
    city: "Rigby",
    state: "ID",
    postal_code: "83442",
    country: "US",
  };
  const membership = randomUUID();
  await pool.query(
    "INSERT INTO grim.memberships(id,program_id,owner_id,email,tier_snapshot,customer_id,address,address_valid) VALUES($1,'sandbox',$2,$3,$4,$5,$6,true)",
    [membership, owner.id, owner.email, tier, customer.id, address],
  );
  const quote = await quoteMembership(c, shippoGateway("sandbox"), owner.id, {
    tierId: tier.id,
    address,
  });
  const checkout = await c.checkout(owner, {
    requestKey: randomUUID(),
    tierId: tier.id,
    billingMonths: 12,
    termsVersion: "sandbox-review-v1",
    country: "US",
    consent: true,
    shippingQuoteId: quote.id,
  });
  const reservation = await one<{ session_id: string }>(
    pool,
    "SELECT session_id FROM grim.reservations WHERE membership_id=$1",
    [membership],
  );
  receipt.session = reservation!.session_id;
  receipt.membership = membership;
  receipt.checkout = checkout;
  await persist();
  console.log(
    JSON.stringify({
      stage: "setup_card_in_stripe_sandbox",
      checkout,
      firstMembership: 32400,
      firstShipping: quote.rate.amount,
      liveEnrollment: false,
    }),
  );
}
async function firstInvoice() {
  const m = (await one<Membership>(
    pool,
    "SELECT * FROM grim.memberships WHERE id=$1",
    [receipt.membership],
  ))!;
  const session = await gateway.session(receipt.session);
  if (session.state !== "complete")
    throw Error("Complete the sandbox card setup in Stripe first");
  const result = await c.confirmation(m.owner_id, receipt.session);
  receipt.initial = (await one<BillingCycle>(
    pool,
    "SELECT * FROM grim.billing_cycles WHERE membership_id=$1 AND initial",
    [m.id],
  ))!.invoice_id;
  await persist();
  console.log(
    JSON.stringify({
      stage: "review_and_pay_first_sandbox_invoice",
      invoice: receipt.initial,
      url: result.invoiceUrl,
    }),
  );
}
async function renewal(replace = false) {
  await c.reconcileInvoice(receipt.initial!);
  if (
    !(await one(
      pool,
      "SELECT invoice_id FROM grim.entitlements WHERE invoice_id=$1 AND allocated",
      [receipt.initial],
    ))
  )
    throw Error("Initial sandbox invoice must be paid and allocated");
  const m = (await one<Membership>(
    pool,
    "SELECT * FROM grim.memberships WHERE id=$1",
    [receipt.membership],
  ))!;
  const sub = await gateway.subscription(
    m.subscription_id!,
    (await one(pool, "SELECT * FROM grim.program WHERE id='sandbox'"))!,
    m.tier_snapshot,
  );
  await advance(new Date((sub.end + 60) * 1000));
  const pending = await gateway.managed.pending(m);
  if (pending.length !== 1)
    throw Error("Expected one held monthly renewal draft");
  receipt.renewal = pending[0];
  await persist();
  await prepareRenewal(c, shippoGateway("sandbox"), m.id, receipt.renewal);
  await finishRenewal(c, receipt.renewal);
  let cycle = (await one<BillingCycle>(
    pool,
    "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
    [receipt.renewal],
  ))!;
  if (cycle.state !== "noticed" || cycle.membership_amount !== 0)
    throw Error("Expected shipping-only noticed invoice");
  if (replace) {
    await stripe.customers.update(m.customer_id!, {
      shipping: {
        name: "Sandbox Collector",
        address: {
          line1: "215 Fremont St",
          city: "San Francisco",
          state: "CA",
          postal_code: "94105",
          country: "US",
        },
      },
    });
    const original = receipt.renewal;
    receipt.renewal = await replaceRenewal(
      c,
      shippoGateway("sandbox"),
      "sandbox-verifier",
      original,
      "Verified new sandbox delivery address and refreshed shipping quote",
    );
    if ((await stripe.invoices.retrieve(original)).status !== "void")
      throw Error("Original invoice was not voided");
    cycle = (await one<BillingCycle>(
      pool,
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [receipt.renewal],
    ))!;
    if (cycle.state !== "noticed")
      throw Error("Replacement notice was not prepared");
    await persist();
  }
  // No email is sent. Exercise the real SDK's signature verifier with a signed
  // fixture receipt and the exact pending outbox ID.
  const provider = `email_fixture_${randomUUID()}`;
  await pool.query(
    "UPDATE grim.outbox SET state='sent',provider_id=$2,sent_at=$3 WHERE id=$1",
    [cycle.notice_id, provider, now],
  );
  const secret = Buffer.from("sandbox-prepaid-delivery-verification").toString(
    "base64",
  );
  process.env.GRIM_RESEND_WEBHOOK_SECRET = `whsec_${secret}`;
  const payload = JSON.stringify({
    type: "email.delivered",
    created_at: now.toISOString(),
    data: {
      email_id: provider,
      tags: { grim_outbox: cycle.notice_id, grim_mode: "sandbox" },
    },
  });
  const stamp = String(Math.floor(Date.now() / 1000)),
    event = "msg_fixture";
  const signature = createHmac("sha256", Buffer.from(secret, "base64"))
    .update(`${event}.${stamp}.${payload}`)
    .digest("base64");
  await receiveNoticeDelivery(
    pool,
    "sandbox",
    new Request("http://localhost/api/grimmunity/notice-delivery", {
      method: "POST",
      body: payload,
      headers: {
        "svix-id": event,
        "svix-timestamp": stamp,
        "svix-signature": `v1,${signature}`,
      },
    }),
    now,
  );
  const delivered = new Date(now);
  await advance(new Date(delivered.getTime() + 6 * 86400000));
  await collectRenewal(c, receipt.renewal, true);
  if (
    (
      await gateway.invoice(
        receipt.renewal,
        (await one(pool, "SELECT * FROM grim.program WHERE id='sandbox'"))!,
      )
    ).status === "paid"
  )
    throw Error("Charged before seven days");
  await advance(new Date(cycle.charge_at!.getTime() + 60000));
  await collectRenewal(c, receipt.renewal, true);
  const paid = await gateway.invoice(
    receipt.renewal,
    (await one(pool, "SELECT * FROM grim.program WHERE id='sandbox'"))!,
  );
  if (paid.status !== "paid" || !paid.paymentVerified)
    throw Error("Sandbox renewal was not verified as paid");
  if (
    Number(
      (await one<{ count: string }>(
        pool,
        "SELECT count(*) FROM grim.fulfillments WHERE membership_id=$1",
        [m.id],
      ))!.count,
    ) !== 2
  )
    throw Error("Expected exactly two monthly deliveries");
  await cancelManaged(c, m.owner_id, m.id);
  const canceled = await stripe.subscriptions.retrieve(m.subscription_id!);
  const coverage = await one<{ period_end: Date }>(
    pool,
    "SELECT period_end FROM grim.prepaid_periods WHERE invoice_id=$1",
    [receipt.initial],
  );
  if (canceled.cancel_at !== coverage!.period_end.getTime() / 1000)
    throw Error("Cancellation lost paid coverage");
  console.log(
    JSON.stringify({
      stage: "verified",
      shippingOnly: paid.amountPaid,
      blockedAtSixDays: true,
      paidAfterNotice: true,
      monthlyDeliveries: 2,
      annualCoverageRetained: true,
      replacementInvoiceVerified: replace,
      noRealEmailSent: true,
      liveEnrollment: false,
    }),
  );
  receipt.complete = true;
  await persist();
}
async function cleanup() {
  await stripe.testHelpers.testClocks.del(receipt.clock);
  for (const id of [receipt.product, receipt.delivery, receipt.postage]) {
    try {
      await stripe.products.update(id, { active: false });
    } catch (error) {
      if ((error as { code?: string }).code !== "resource_missing") throw error;
    }
  }
  await stripe.billingPortal.configurations.update(receipt.portal, {
    active: false,
  });
  await pool.query("TRUNCATE grim.program CASCADE");
  console.log(
    "Disposable sandbox customer/subscription removed; verification products and portal archived. Production was not used.",
  );
}
async function apiProbe(fresh: boolean) {
  if (fresh) await setup();
  const m = (await one<Membership>(
    pool,
    "SELECT * FROM grim.memberships WHERE id=$1",
    [receipt.membership],
  ))!;
  if (
    (await stripe.checkout.sessions.retrieve(receipt.session)).status === "open"
  )
    await stripe.checkout.sessions.expire(receipt.session);
  await stripe.customers.update(m.customer_id!, {
    email: "prepaid-billing-verification@example.invalid",
  });
  const r = (await one<import("../../lib/grimmunity/model").Reservation>(
    pool,
    "SELECT * FROM grim.reservations WHERE session_id=$1",
    [receipt.session],
  ))!;
  const setupIntent = receipt.setupIntent
    ? await stripe.setupIntents.retrieve(receipt.setupIntent)
    : await stripe.setupIntents.create({
        customer: m.customer_id!,
        payment_method: "pm_card_visa",
        payment_method_types: ["card"],
        confirm: true,
        usage: "off_session",
        metadata: { grim_reservation: r.id },
      });
  receipt.setupIntent = setupIntent.id;
  await persist();
  await transaction(pool, async (db) => {
    const p = await lockedProgram(db, "sandbox");
    await c.applySession(db, p, r, {
      id: receipt.session,
      customer: m.customer_id!,
      subscription: null,
      reservation: r.id,
      state: "complete",
      url: null,
      livemode: false,
      setupIntent: setupIntent.id,
    });
  });
  receipt.initial = (await one<BillingCycle>(
    pool,
    "SELECT * FROM grim.billing_cycles WHERE membership_id=$1 AND initial",
    [m.id],
  ))!.invoice_id;
  await gateway.managed.pay(receipt.initial);
  await persist();
  return renewal(true);
}

async function main() {
  const stage = process.argv[2];
  if (stage === "setup") return setup();
  if (stage === "api-replacement-probe") return apiProbe(true);
  receipt = JSON.parse(await readFile(file, "utf8"));
  configure();
  if (stage === "resume-api-probe") return apiProbe(false);
  if (stage === "first-invoice") return firstInvoice();
  if (stage === "renewal") return renewal();
  if (stage === "cleanup") return cleanup();
  throw Error("Use setup, first-invoice, renewal, or cleanup");
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Sandbox verification failed",
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
