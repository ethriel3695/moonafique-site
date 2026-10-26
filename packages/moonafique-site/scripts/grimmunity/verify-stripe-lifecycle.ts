import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { one } from "../../lib/grimmunity/db";
import { migrate } from "../../lib/grimmunity/migrations";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { saveEdition } from "../../lib/grimmunity/editions";
import { Grimmunity } from "../../lib/grimmunity/service";
import { grimStripe, StripeGateway, stripeId } from "../../lib/grimmunity/stripe-gateway";
import type { Fulfillment, Program } from "../../lib/grimmunity/model";

// Explicit operator verification only. Uses a separate database and newly created
// Stripe test-clock customer. No user membership or production data is modified.
export async function verifyStripeLifecycle() {
  assert.equal(process.env.VERCEL_ENV, "preview");
  assert.equal(process.env.GRIM_MODE, "sandbox");
  assert.equal(process.env.GRIM_VERIFY_STRIPE, "approved");
  assert.equal(process.env.GRIM_NEON_PROJECT_ID, "noisy-silence-66981734");
  const stripe = grimStripe("sandbox");
  assert.equal((await stripe.accounts.retrieve("acct_1UU6YpDXCSFYFpTT")).id, "acct_1UU6YpDXCSFYFpTT");
  assert.equal((await stripe.balance.retrieve()).livemode, false);
  const name = `grim_verify_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.GRIM_DATABASE_URL!);
  url.hostname = url.hostname.replace("-pooler.", ".");
  const control = new Pool({ connectionString: url.toString(), max: 1 });
  let pool: Pool | undefined;
  let clockId: string | undefined;
  let stage = "isolated database";
  try {
    await control.query("DROP DATABASE IF EXISTS grim_verify_0d778fb3616c4759b958aaa8a1f831f9 WITH (FORCE)");
    await control.query(`CREATE DATABASE ${name}`);
    url.pathname = `/${name}`;
    pool = new Pool({ connectionString: url.toString(), max: 3 });
    await migrate(pool);
    await seedSandbox(pool);
    stage = "test tax registration";
    if ((await stripe.tax.settings.retrieve()).status !== "active") {
      // Fictional address in the test account only; never a live business setting.
      await stripe.tax.settings.update({ head_office: { address: { line1: "100 Test Street", city: "Rexburg", state: "ID", postal_code: "83440", country: "US" } }, defaults: { tax_code: "txcd_99999999", tax_behavior: "exclusive" } });
    }
    const registrations = await stripe.tax.registrations.list({ limit: 100 });
    if (!registrations.data.some((r) => r.country === "US" && r.country_options.us?.state === "ID" && r.status === "active"))
      await stripe.tax.registrations.create({ country: "US", country_options: { us: { state: "ID", type: "state_sales_tax" } }, active_from: "now" });
    const prices = [];
    for (const [kind, amount, taxCode] of [["collector", 2500, "txcd_99999999"], ["shipping", 921, "txcd_92010001"]] as const) {
      const product = await stripe.products.create({ name: `Grimmunity lifecycle test ${kind}`, tax_code: taxCode, metadata: { grim_verification: name, [kind === "collector" ? "grim_subscription" : "grim_shipping"]: "true" } });
      prices.push(await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: amount, tax_behavior: "exclusive", recurring: { interval: "month" } }));
    }
    const original = (await one<Program>(pool, "SELECT * FROM grim.program WHERE id='sandbox'"))!;
    const tier = { ...original.tiers[0], price_id: prices[0].id, product_id: stripeId(prices[0].product), shipping: { price_id: prices[1].id, product_id: stripeId(prices[1].product), amount: 921 } };
    await pool.query("UPDATE grim.program SET tiers=$1,tax_mode='exclusive',fulfillment_lead_days=7,enabled=true,portal_configuration_id='bpc_1UU6fWDXCSFYFpTTAAMF5Art' WHERE id='sandbox'", [JSON.stringify([tier])]);
    const program = (await one<Program>(pool, "SELECT * FROM grim.program WHERE id='sandbox'"))!;
    const gateway = new StripeGateway(stripe);
    await gateway.checkConfiguration(program);
    let clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(new Date("2026-11-02T18:00:00Z").getTime() / 1000), name });
    clockId = clock.id;
    const club = new Grimmunity(pool, gateway, "sandbox", () => new Date(clock.frozen_time * 1000));
    for (const [month, next] of [["2026-11", "2026-12"], ["2026-12", "2027-01"], ["2027-01", "2027-02"], ["2027-02", "2027-03"]])
      await saveEdition(club, "verification", { action: "edition", month, title: `TEST ONLY ${month}`, enrollment_open: `${month}-01T00:00`, enrollment_close: `${next}-01T00:00`, payment_cutoff: `${next}-07T00:00`, address_cutoff: `${next}-07T00:00`, dispatch_start: `${next}-07T00:00`, dispatch_end: `${next}-14T00:00`, state: "open" });
    const owner = { id: name, email: `${name}@example.invalid` };
    const reservation = await club.reserve(owner, { requestKey: randomUUID(), tierId: "mid", termsVersion: program.terms_version, country: "US", consent: true });
    const shipping = { name: "Grimmunity TEST ONLY", address: { line1: "100 Test Street", city: "Rexburg", state: "ID", postal_code: "83440", country: "US" } };
    const customer = await stripe.customers.create({ name: shipping.name, shipping, address: shipping.address, test_clock: clock.id, metadata: { grim_verification: name } });
    await pool.query("UPDATE grim.memberships SET customer_id=$1 WHERE id=$2", [customer.id, reservation.membership_id]);
    const good = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: good.id } });
    stage = "initial taxed payment";
    let sub = await stripe.subscriptions.create({ customer: customer.id, items: prices.map((p) => ({ price: p.id, quantity: 1 })), automatic_tax: { enabled: true }, payment_behavior: "error_if_incomplete", metadata: { grim_reservation: reservation.id, grim_program: "sandbox", grim_verification: name } });
    const firstId = stripeId(sub.latest_invoice);
    const first = await gateway.invoice(firstId, program);
    assert.equal(first.amountPaid, 3571);
    assert.equal(first.taxExclusive, 150);
    assert.equal(first.totalExcludingTax, 3421);
    assert.equal(first.automaticTaxComplete, true);
    await club.reconcileInvoice(firstId);
    await club.reconcileInvoice(firstId);
    let orders = (await pool.query<Fulfillment>("SELECT * FROM grim.fulfillments ORDER BY invoice_id")).rows;
    assert.equal(orders.length, 1);
    assert.equal(orders[0].ship_by!.getTime(), first.paidAt! * 1000 + 7 * 86400000);
    console.log("Stripe lifecycle: initial Idaho payment $35.71, $1.50 tax, one order, seven-day dispatch verified.");
    stage = "packing and address update";
    await club.lockOrder("verification", orders[0].id);
    const csv = await club.packingCSV("verification", orders[0].edition_id);
    assert.ok(csv.includes("100 Test Street"));
    await stripe.customers.update(customer.id, { shipping: { ...shipping, address: { ...shipping.address, line1: "200 Updated Test Street" } } });
    await club.refreshMember(owner.id);
    assert.equal((await one<Fulfillment>(pool, "SELECT * FROM grim.fulfillments WHERE id=$1", [orders[0].id]))!.address_snapshot!.line1, "100 Test Street");
    assert.ok(await one(pool, "SELECT id FROM grim.exceptions WHERE resolved_at IS NULL AND reason LIKE 'Address changed%'"));
    assert.ok((await club.portal(owner.id)).startsWith("https://billing.stripe.com/"));
    console.log("Stripe lifecycle: packing export, locked address protection, shipping update, and portal configuration verified.");
    async function advance(time: number) {
      await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: time });
      for (let attempt = 0; attempt < 90; attempt++) {
        clock = await stripe.testHelpers.testClocks.retrieve(clock.id);
        if (clock.status === "ready") return;
        assert.notEqual(clock.status, "internal_failure");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      throw Error("clock_timeout");
    }
    stage = "successful renewal";
    await advance(sub.items.data[0].current_period_end + 7200);
    sub = await stripe.subscriptions.retrieve(sub.id);
    const secondId = stripeId(sub.latest_invoice);
    assert.notEqual(secondId, firstId);
    const second = await gateway.invoice(secondId, program);
    assert.equal(second.status, "paid");
    assert.equal(second.amountPaid, 3571);
    await club.reconcileInvoice(secondId);
    const paidEvents = await stripe.events.list({ type: "invoice.paid", limit: 100 });
    const event = paidEvents.data.find((e) => "id" in e.data.object && e.data.object.id === secondId);
    assert.ok(event);
    const receipt = { id: event.id, type: event.type, object_id: secondId, livemode: false };
    await club.process(receipt);
    await club.process(receipt);
    assert.equal((await one<{ count: string }>(pool, "SELECT count(*) FROM grim.fulfillments"))!.count, "2");
    console.log("Stripe lifecycle: real monthly renewal and duplicate paid-event replay create exactly one second order.");
    stage = "failed renewal";
    const bad = await stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: bad.id } });
    await advance(sub.items.data[0].current_period_end + 7200);
    sub = await stripe.subscriptions.retrieve(sub.id);
    const thirdId = stripeId(sub.latest_invoice);
    assert.equal((await stripe.invoices.retrieve(thirdId)).status, "open");
    assert.equal(sub.status, "past_due");
    await club.reconcileInvoice(thirdId);
    assert.equal((await one<{ count: string }>(pool, "SELECT count(*) FROM grim.fulfillments"))!.count, "2");
    stage = "payment recovery";
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: good.id } });
    await stripe.invoices.pay(thirdId, { payment_method: good.id });
    await club.reconcileInvoice(thirdId);
    assert.equal((await one<{ count: string }>(pool, "SELECT count(*) FROM grim.fulfillments"))!.count, "3");
    console.log("Stripe lifecycle: failed renewal creates no shipment; recovery creates exactly one paid order.");
    stage = "refund hold";
    const payments = await stripe.invoicePayments.list({ invoice: thirdId, status: "paid", limit: 10 });
    const pi = stripeId(payments.data[0].payment.payment_intent);
    assert.ok(pi);
    await stripe.refunds.create({ payment_intent: pi });
    await club.reconcileInvoice(thirdId);
    assert.equal((await one<{ financial_state: string }>(pool, "SELECT financial_state FROM grim.entitlements WHERE invoice_id=$1", [thirdId]))!.financial_state, "refunded");
    assert.equal((await one<Fulfillment>(pool, "SELECT * FROM grim.fulfillments WHERE invoice_id=$1", [thirdId]))!.state, "hold");
    stage = "cancellation";
    sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
    await club.refreshMember(owner.id);
    assert.equal((await one(pool, "SELECT cancel_at_period_end FROM grim.memberships WHERE id=$1", [reservation.membership_id]))!.cancel_at_period_end, true);
    await advance(sub.items.data[0].current_period_end + 7200);
    await club.refreshMember(owner.id);
    assert.equal((await one(pool, "SELECT status FROM grim.memberships WHERE id=$1", [reservation.membership_id]))!.status, "canceled");
    orders = (await pool.query<Fulfillment>("SELECT * FROM grim.fulfillments")).rows;
    assert.equal(orders.length, 3);
    assert.equal(orders.filter((o) => o.state !== "hold").length, 2);
    console.log("Stripe lifecycle: full refund holds packing; period-end cancellation stops renewal and preserves earlier paid orders.");
    console.log("GRIM_STRIPE_LIFECYCLE_PASSED", JSON.stringify({ clock: clock.id, customer: customer.id, subscription: sub.id, invoices: [firstId, secondId, thirdId], realCharges: false, messagesSent: 0 }));
  } catch (error) {
    const detail = error instanceof Error ? error.message.replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|postgres(?:ql)?:\/\/\S+/g, "[redacted]").slice(0, 400) : "operator_review_required";
    console.error("Stripe lifecycle verification failed:", stage, error instanceof assert.AssertionError ? `${error.actual} !== ${error.expected}` : detail);
    throw Error("Stripe lifecycle verification failed; see the sanitized stage above.");
  } finally {
    if (clockId) await stripe.testHelpers.testClocks.del(clockId).catch(() => console.error("Test clock cleanup needs operator review:", clockId));
    if (pool) await pool.end();
    await control.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(() => console.error("Isolated test database cleanup needs operator review:", name));
    await control.end();
  }
}
