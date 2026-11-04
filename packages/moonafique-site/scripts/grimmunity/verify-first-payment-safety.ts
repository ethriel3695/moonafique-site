import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { Pool } from "pg";
import { membershipBilling } from "../../lib/grimmunity/billing-options";
import { lockedProgram, one, transaction } from "../../lib/grimmunity/db";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { migrate } from "../../lib/grimmunity/migrations";
import type { Program, Reservation } from "../../lib/grimmunity/model";
import { Grimmunity } from "../../lib/grimmunity/service";
import { quoteMembership } from "../../lib/grimmunity/shipping";
import { grimStripe, StripeGateway, stripeId } from "../../lib/grimmunity/stripe-gateway";
import { sandboxTiers } from "../../lib/grimmunity/tiers";

// Real Stripe sandbox API calls, a synthetic Checkout completion, and a fixed
// shipping quote. The separate browser rehearsal covers hosted Checkout and email.
const dbUrl = new URL(process.env.GRIM_SAFETY_DATABASE_URL ?? "http://invalid");
if (process.env.GRIM_MODE !== "sandbox" || process.env.GRIM_SAFETY_VERIFY !== "approved" ||
    dbUrl.protocol !== "postgresql:" || dbUrl.hostname !== "127.0.0.1" || dbUrl.pathname !== "/grim_safety_provider")
  throw new Error("Use sandbox mode and a new disposable local grim_safety_provider database.");

const pool = new Pool({ connectionString: dbUrl.toString(), max: 3 });
const stripe = grimStripe("sandbox");
const gateway = new StripeGateway(stripe);
const prefix = `prod_moonafique_safety_${randomUUID().replaceAll("-", "")}`;
const products = [prefix, `${prefix}_delivery`, `${prefix}_postage`];
gateway.managed.deliveryProduct = () => products[1];
gateway.managed.postageProduct = () => products[2];
const c = new Grimmunity(pool, gateway, "sandbox");
let customerId: string | undefined;
let subscriptionId: string | undefined;
let checkoutId: string | undefined;
let portalId: string | undefined;
let stripeVerified = false;
let stage = "isolation";
let result: Record<string, unknown> | undefined;

async function verify() {
  assert.equal((await stripe.balance.retrieve()).livemode, false);
  stripeVerified = true;
  assert.equal((await one<{ existing: boolean }>(pool, "SELECT to_regnamespace('grim') IS NOT NULL AS existing"))!.existing, false);
  await migrate(pool);
  await seedSandbox(pool);
  stage = "sandbox offer";
  const offer = sandboxTiers.find((tier) => tier.id === "grimm_keeper")!;
  const product = await stripe.products.create({ id: prefix, name: "TEST ONLY Moonafique payment safety", metadata: { grim_subscription: "true" } });
  const billingOptions = [];
  for (const months of [1, 6, 12] as const) {
    const option = membershipBilling(offer.amount, months);
    const price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: option.amount, recurring: option.recurring });
    billingOptions.push({ months, amount: option.amount, discount: option.discount, price_id: price.id });
  }
  const tier = { ...offer, product_id: product.id, price_id: billingOptions[0].price_id, billing_options: billingOptions };
  const portal = await stripe.billingPortal.configurations.create({ features: {
    payment_method_update: { enabled: true }, invoice_history: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["shipping"] },
    subscription_update: { enabled: false }, subscription_cancel: { enabled: false },
  } });
  portalId = portal.id;
  await pool.query("UPDATE grim.program SET enabled=true,tiers=$1,billing_policy='notice_shipping_v1',managed_portal_configuration_id=$2", [JSON.stringify([tier]), portal.id]);
  // Keep the disposable edition aligned with Stripe's real calendar clock.
  await pool.query("UPDATE grim.editions SET enrollment_open=now()-interval '1 day',enrollment_close=now()+interval '2 days',period_open=now()-interval '1 day',period_close=now()+interval '20 days',payment_cutoff=now()+interval '3 days',address_cutoff=now()+interval '3 days',dispatch_start=now()+interval '3 days',dispatch_end=now()+interval '10 days' WHERE month='2026-11'");
  const p = (await one<Program>(pool, "SELECT * FROM grim.program WHERE id='sandbox'"))!;
  const owner = { id: prefix, email: "payment-safety@example.invalid" };
  const address = { name: "Moonafique Sandbox", line1: "100 Test Street", line2: "", city: "Boise", state: "ID", postal_code: "83702", country: "US" };
  const rate = { id: "rate_safety_fixture", carrier: "USPS", service: "Ground Advantage", amount: 628, currency: "usd" as const, estimated_days: 4 };
  const quote = await quoteMembership(c, {
    quote: async () => ({ shipment_id: "ship_safety_fixture", rates: [rate] }),
    buy: async () => { throw new Error("No labels may be purchased"); },
    transaction: async () => { throw new Error("No labels may be purchased"); },
  }, owner.id, { tierId: tier.id, address });
  stage = "checkout and card setup";
  const input = { requestKey: randomUUID(), tierId: tier.id, billingMonths: 1, country: "US", consent: true, termsVersion: p.terms_version, shippingQuoteId: quote.id };
  const r = await c.reserve(owner, input);
  assert.equal((await c.reserve(owner, { ...input, requestKey: randomUUID() })).id, r.id);
  await c.materialize(r.id);
  const saved = (await one<Reservation>(pool, "SELECT * FROM grim.reservations WHERE id=$1", [r.id]))!;
  checkoutId = saved.session_id!;
  const session = await stripe.checkout.sessions.retrieve(checkoutId);
  customerId = stripeId(session.customer);
  assert.equal(session.mode, "setup");
  assert.equal(session.livemode, false);
  assert.equal(await count("fulfillments"), 0);
  const setup = await stripe.setupIntents.create({
    customer: customerId, payment_method: "pm_card_chargeCustomerFail", payment_method_types: ["card"],
    confirm: true, usage: "off_session", metadata: { grim_reservation: r.id },
  });
  assert.equal(setup.status, "succeeded");
  await transaction(pool, async (db) => c.applySession(db, await lockedProgram(db, "sandbox"), saved, {
    id: checkoutId!, state: "complete", setupIntent: setup.id, subscription: null, reservation: r.id,
    customer: customerId!, url: null, livemode: false,
  }));
  const cycle = (await one<{ invoice_id: string }>(pool, "SELECT invoice_id FROM grim.billing_cycles WHERE membership_id=$1 AND initial", [r.membership_id]))!;
  subscriptionId = (await one<{ subscription_id: string }>(pool, "SELECT subscription_id FROM grim.memberships WHERE id=$1", [r.membership_id]))!.subscription_id;
  assert.equal(await count("fulfillments"), 0);
  assert.equal(await count("entitlements"), 0);
  stage = "declined invoice";
  await assert.rejects(stripe.invoices.pay(cycle.invoice_id, { payment_method: stripeId(setup.payment_method), off_session: true }), { code: "card_declined" });
  const declined = await gateway.invoice(cycle.invoice_id, p);
  assert.equal(declined.status, "open");
  assert.equal(declined.amountPaid, 0);
  assert.equal(declined.paymentVerified, false);
  const failure = await invoiceEvent("invoice.payment_failed", cycle.invoice_id);
  await c.process(failure);
  assert.equal(await count("fulfillments"), 0);
  assert.equal(await count("entitlements"), 0);
  const messagesBeforePayment = await count("outbox");
  // Even a premature processing attempt cannot create a shipment from an unpaid invoice.
  await c.reconcileInvoice(cycle.invoice_id);
  assert.equal(await count("fulfillments"), 0);
  stage = "successful retry and duplicate event";
  const good = await stripe.paymentMethods.attach("pm_card_visa", { customer: customerId });
  await stripe.invoices.pay(cycle.invoice_id, { payment_method: good.id, off_session: true });
  const payment = await invoiceEvent("invoice.paid", cycle.invoice_id);
  await c.process(payment);
  await c.process(payment);
  await c.process(failure);
  assert.equal(await count("fulfillments"), 1);
  assert.equal(await count("entitlements"), 1);
  assert.equal(await count("outbox"), messagesBeforePayment + 1);
  assert.equal((await c.confirmation(owner.id, checkoutId)).paid, true);
  assert.equal((await gateway.invoice(cycle.invoice_id, p)).paymentVerified, true);
  stage = "refund hold";
  const payments = await stripe.invoicePayments.list({ invoice: cycle.invoice_id, status: "paid", limit: 1 });
  const intent = stripeId(payments.data[0]?.payment.payment_intent);
  assert.ok(intent);
  await stripe.refunds.create({ payment_intent: intent });
  await c.reconcileInvoice(cycle.invoice_id);
  assert.equal((await one<{ state: string }>(pool, "SELECT state FROM grim.fulfillments WHERE invoice_id=$1", [cycle.invoice_id]))?.state, "hold");
  const confirmation = await c.confirmation(owner.id, checkoutId);
  assert.equal(confirmation.paid, false);
  assert.equal(confirmation.review, true);
  result = { stripeMode: "sandbox", cardSetup: "succeeded", firstCharge: "card_declined", fulfillmentsAfterDecline: 0,
    fulfillmentsAfterRecoveryAndReplay: 1, paidEmailsQueued: 1, refundPlacedShipmentOnHold: true, liveCharges: 0, emailsSent: 0, labelsPurchased: 0 };
}

async function count(table: "fulfillments" | "entitlements" | "outbox") {
  return Number((await one<{ count: string }>(pool, `SELECT count(*) FROM grim.${table}`))!.count);
}
async function invoiceEvent(type: "invoice.payment_failed" | "invoice.paid", id: string) {
  // Event publication may lag the successful invoices.pay API response.
  for (let attempt = 0; attempt < 15; attempt++) {
    const events = await stripe.events.list({ type, limit: 30 });
    const event = events.data.find((candidate) => "id" in candidate.data.object && candidate.data.object.id === id);
    if (event) return { id: event.id, object_id: id, type, livemode: event.livemode };
    await wait(1_000);
  }
  throw new Error(`Stripe did not report ${type} within the verification window`);
}

async function main() {
  try {
    await verify();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "check_failed";
    console.error(`Sandbox verification failed at ${stage}: ${code}`);
    process.exitCode = 1;
  } finally {
    const cleanup: (() => Promise<unknown>)[] = [];
    if (checkoutId) cleanup.push(() => stripe.checkout.sessions.expire(checkoutId!));
    if (subscriptionId) cleanup.push(() => stripe.subscriptions.cancel(subscriptionId!));
    if (customerId) cleanup.push(() => stripe.customers.del(customerId!));
    if (portalId) cleanup.push(() => stripe.billingPortal.configurations.update(portalId!, { active: false }));
    if (stripeVerified) for (const id of products) cleanup.push(async () => {
      for await (const price of stripe.prices.list({ product: id, active: true, limit: 100 }))
        await stripe.prices.update(price.id, { active: false });
      await stripe.products.update(id, { active: false });
    });
    let cleanupFailures = 0;
    for (const run of cleanup) {
      try { await run(); }
      catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "resource_missing")) cleanupFailures++; }
    }
    await pool.end();
    if (cleanupFailures) { console.error(`Sandbox cleanup requires review (${cleanupFailures}).`); process.exitCode = 1; }
    if (result) console.log(JSON.stringify({ ...result, cleanupFailures }));
  }
}

void main();
