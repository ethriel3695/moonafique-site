import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import Stripe from "stripe";
import { migrate } from "../../lib/grimmunity/migrations";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { type TierId } from "../../lib/grimmunity/tiers";
import {
  testTiers as sandboxTiers,
  legacyCollectorTiers as launchTiers,
} from "./tier-fixtures";
import { Grimmunity } from "../../lib/grimmunity/service";
import { saveEdition } from "../../lib/grimmunity/editions";
import { FakeBilling, delivery } from "./fake-billing";
import type {
  Fulfillment,
  Invoice,
  Reservation,
} from "../../lib/grimmunity/model";
const notifications = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: notifications.send };
  },
}));
import { drainOutbox } from "../../lib/grimmunity/outbox";
const holder = vi.hoisted(() => ({ service: null as unknown }));
vi.mock("../../lib/grimmunity/runtime", () => ({
  club: () => holder.service,
  grimMode: () => "sandbox",
}));
import { grimWebhook } from "../../lib/grimmunity/webhook";

const url = process.env.GRIM_TEST_DATABASE_URL;
if (!url)
  throw Error(
    "GRIM_TEST_DATABASE_URL is required; use a disposable local PostgreSQL database named grim_test.",
  );
const parsed = new URL(url);
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  parsed.pathname !== "/grim_test"
)
  throw Error("Refusing to truncate a non-local or non-test database.");
const pool = new Pool({ connectionString: url, max: 10 });
let billing: FakeBilling, c: Grimmunity, now: Date;
const input = () => ({
  requestKey: randomUUID(),
  tierId: "entry",
  termsVersion: "sandbox-review-v1",
  country: "US",
  consent: true,
});
const event = (type: string, id: string, eventId = `evt_${randomUUID()}`) =>
  c.process({ id: eventId, type, object_id: id, livemode: false });
async function count(table: string) {
  return Number(
    (await pool.query(`SELECT count(*) FROM grim.${table}`)).rows[0].count,
  );
}
async function join(owner = "collector_1", tierId: TierId = "entry") {
  await c.checkout(
    { id: owner, email: `${owner}@example.invalid` },
    { ...input(), tierId },
  );
  const r = (
    await pool.query<Reservation>(
      "SELECT * FROM grim.reservations ORDER BY created_at DESC LIMIT 1",
    )
  ).rows[0];
  return { ...billing.complete(r.session_id!), r };
}
async function order() {
  return (
    await pool.query<Fulfillment>("SELECT * FROM grim.fulfillments LIMIT 1")
  ).rows[0];
}
beforeAll(async () => {
  await migrate(pool);
  process.env.GRIM_STRIPE_SECRET_KEY = "sk_test_fixture";
  process.env.GRIM_STRIPE_WEBHOOK_SECRET = "whsec_fixture";
});
beforeEach(async () => {
  await pool.query("TRUNCATE grim.program CASCADE");
  await seedSandbox(pool);
  // Keep historical multi-plan regressions independent of the current launch offer.
  await pool.query(
    "UPDATE grim.program SET tiers=$1,amount=$2,price_id=$3,member_cap=3",
    [
      JSON.stringify(sandboxTiers),
      sandboxTiers[0].amount,
      sandboxTiers[0].price_id,
    ],
  );
  await pool.query("UPDATE grim.editions SET capacity=3,tier_allocations=NULL");
  await pool.query("UPDATE grim.program SET enabled=true WHERE id='sandbox'");
  now = new Date("2026-11-02T18:00:00Z");
  billing = new FakeBilling();
  c = new Grimmunity(pool, billing, "sandbox", () => now);
  holder.service = c;
});
afterAll(async () => {
  await pool.end();
});

describe("PostgreSQL reservations and payment lifecycle", () => {
  it("allocates the edition when verified exclusive tax is added to the approved base prices", async () => {
    await pool.query("UPDATE grim.program SET tax_mode='exclusive'");
    const { invoice } = await join();
    invoice.totalExcludingTax = invoice.total;
    invoice.taxExclusive = 150;
    invoice.automaticTaxComplete = true;
    invoice.total += 150;
    invoice.amountDue += 150;
    invoice.amountPaid += 150;
    await event("invoice.paid", invoice.id);
    expect(await count("fulfillments")).toBe(1);
    expect(
      (await pool.query("SELECT amount_paid FROM grim.entitlements")).rows[0]
        .amount_paid,
    ).toBe(invoice.total);
  });
  it.each(["incomplete", "wrong_base", "wrong_total"])(
    "holds exclusive-tax invoices with %s calculations",
    async (problem) => {
      await pool.query("UPDATE grim.program SET tax_mode='exclusive'");
      const { invoice } = await join();
      invoice.totalExcludingTax = invoice.total;
      invoice.taxExclusive = 150;
      invoice.automaticTaxComplete = true;
      invoice.total += 150;
      invoice.amountDue += 150;
      invoice.amountPaid += 150;
      if (problem === "incomplete") invoice.automaticTaxComplete = false;
      if (problem === "wrong_base") invoice.totalExcludingTax += 1;
      if (problem === "wrong_total") invoice.amountPaid -= 1;
      await event("invoice.paid", invoice.id);
      expect(await count("fulfillments")).toBe(0);
      expect(await count("exceptions")).toBeGreaterThan(0);
    },
  );
  it("sets a seven-day deadline from payment and permits rolling packing before the batch cutoff", async () => {
    await pool.query("UPDATE grim.program SET fulfillment_lead_days=7");
    const { invoice, sub } = await join();
    await event("invoice.paid", invoice.id);
    expect((await order()).ship_by).toEqual(
      new Date((invoice.paidAt! + 7 * 86400) * 1000),
    );
    billing.customers.get(sub.customer)!.address = {
      ...delivery,
      line1: "Updated before packing",
    };
    await event("customer.updated", sub.customer);
    expect(await count("exceptions")).toBe(0);
    await c.lockOrder("staff", (await order()).id);
    expect((await order()).state).toBe("ready");
    const deadline = (await order()).ship_by;
    now = new Date("2026-11-10T18:00:00Z");
    await event("invoice.paid", invoice.id);
    expect((await order()).ship_by).toEqual(deadline);
    billing.customers.get(sub.customer)!.address = {
      ...delivery,
      line1: "Changed after packing",
    };
    await event("customer.updated", sub.customer);
    expect(await count("exceptions")).toBeGreaterThan(0);
    expect((await order()).address_snapshot?.line1).toBe(
      "Updated before packing",
    );
  });
  it("serializes simultaneous attempts for the final seat", async () => {
    await pool.query("UPDATE grim.program SET member_cap=1");
    await pool.query("UPDATE grim.editions SET capacity=1");
    const attempts = await Promise.allSettled(
      Array.from({ length: 12 }, (_, n) =>
        c.reserve(
          { id: `owner${n}`, email: "fixture@example.invalid" },
          input(),
        ),
      ),
    );
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await count("reservations")).toBe(1);
  });
  it("deduplicates double clicks, different request keys, and resumed checkout", async () => {
    const owner = { id: "one", email: "one@example.invalid" };
    const urls = await Promise.all(
      Array.from({ length: 5 }, () => c.checkout(owner, input())),
    );
    expect(new Set(urls).size).toBe(1);
    expect(await count("reservations")).toBe(1);
    expect(billing.creates).toBe(1);
  });
  it("preserves an ambiguous session creation and recovers with the same reservation", async () => {
    const create = billing.createSession.bind(billing);
    let fail = true;
    billing.createSession = async (...args) => {
      const session = await create(...args);
      if (fail) {
        fail = false;
        throw Error("network timeout after Stripe created session");
      }
      return session;
    };
    const owner = { id: "one", email: "one@example.invalid" };
    await expect(c.checkout(owner, input())).rejects.toThrow();
    await c.checkout(owner, input());
    expect(billing.creates).toBe(1);
    expect(await count("reservations")).toBe(1);
  });
  it("requires configured enrollment, terms, country, and a strict request body", async () => {
    await expect(
      c.reserve(
        { id: "x", email: "x@example.invalid" },
        { ...input(), customer: "cus_forged" },
      ),
    ).rejects.toThrow();
    await expect(
      c.reserve(
        { id: "x", email: "x@example.invalid" },
        { ...input(), quantity: 2, price: 1 },
      ),
    ).rejects.toThrow();
    await expect(
      c.reserve(
        { id: "x", email: "x@example.invalid" },
        { ...input(), country: "CA" },
      ),
    ).rejects.toThrow("unsupported_destination");
    now = new Date("2026-11-06T07:00:00Z");
    await expect(
      c.reserve({ id: "x", email: "x@example.invalid" }, input()),
    ).rejects.toThrow("enrollment_closed");
    now = new Date("2026-11-02T18:00:00Z");
    await pool.query("UPDATE grim.program SET enabled=false");
    await expect(
      c.reserve({ id: "x", email: "x@example.invalid" }, input()),
    ).rejects.toThrow("enrollment_closed");
  });
  it("processes a signed initial payment before checkout completion exactly once", async () => {
    const { r, invoice } = await join();
    invoice.reason = "subscription_create";
    const body = JSON.stringify({
      id: "evt_signed",
      object: "event",
      type: "invoice.paid",
      livemode: false,
      data: { object: { id: invoice.id } },
      created: Date.now() / 1000,
    });
    const stripe = new Stripe("sk_test_fixture");
    const headers = {
      "stripe-signature": stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret: "whsec_fixture",
      }),
    };
    expect(
      (
        await grimWebhook(
          new Request("http://localhost/api/grimmunity/webhook", {
            method: "POST",
            headers,
            body,
          }),
        )
      ).status,
    ).toBe(200);
    await Promise.all([
      event("invoice.paid", invoice.id, "evt_signed"),
      event("invoice.paid", invoice.id),
      event("checkout.session.completed", r.session_id!),
    ]);
    expect(await count("fulfillments")).toBe(1);
    expect(await count("outbox")).toBe(1);
    expect((await c.confirmation("collector_1", r.session_id!)).paid).toBe(
      true,
    );
    await expect(c.confirmation("someone_else", r.session_id!)).rejects.toThrow(
      "checkout_not_found",
    );
  });
  it("rejects bad signatures without writing receipts", async () => {
    const response = await grimWebhook(
      new Request("http://localhost/api/grimmunity/webhook", {
        method: "POST",
        headers: { "stripe-signature": "bad" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(400);
    expect(await count("events")).toBe(0);
  });
  it("does not grant fulfillment from checkout completion or a browser confirmation", async () => {
    const { r } = await join();
    await event("checkout.session.completed", r.session_id!);
    expect(await count("fulfillments")).toBe(0);
    expect((await c.confirmation("collector_1", r.session_id!)).paid).toBe(
      false,
    );
  });
  it("fulfills a renewal without another checkout session", async () => {
    const { invoice, sub } = await join();
    await event("invoice.paid", invoice.id);
    now = new Date("2026-12-02T18:00:30Z");
    const renewal = billing.paidInvoice(
      sub,
      "2026-12-02T18:00:00Z",
      "2027-01-02T18:00:00Z",
    );
    sub.start = renewal.lines[0].start;
    sub.end = renewal.lines[0].end;
    await Promise.all([
      event("invoice.paid", renewal.id),
      event("invoice.paid", renewal.id),
    ]);
    expect(await count("fulfillments")).toBe(2);
    expect(await count("reservations")).toBe(1);
    const months = (
      await pool.query(
        "SELECT e.month,count(*) FROM grim.fulfillments f JOIN grim.editions e ON e.id=f.edition_id GROUP BY e.month ORDER BY e.month",
      )
    ).rows;
    expect(months).toEqual([
      { month: "2026-11", count: "1" },
      { month: "2026-12", count: "1" },
    ]);
  });
  it("keeps failed/unconfirmed payments off packing lists and handles later recovery", async () => {
    const { invoice } = await join();
    invoice.status = "open";
    invoice.amountPaid = 0;
    invoice.paidAt = null;
    await event("invoice.payment_action_required", invoice.id);
    await event("invoice.payment_failed", invoice.id);
    expect(await count("fulfillments")).toBe(0);
    expect(await count("exceptions")).toBe(1);
    invoice.status = "paid";
    invoice.amountPaid = sandboxTiers[0].amount;
    invoice.paidAt = Date.parse("2026-11-05T20:00:00Z") / 1000;
    await event("invoice.paid", invoice.id);
    await event("invoice.payment_failed", invoice.id); // stale failure retrieves paid state
    expect(await count("fulfillments")).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT * FROM grim.exceptions WHERE resolved_at IS NULL",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("maps delayed events to billing period and uses paid_at for recovery cutoff", async () => {
    const { invoice } = await join();
    now = new Date("2026-12-20T00:00:00Z");
    await event("invoice.paid", invoice.id);
    expect(
      (
        await pool.query(
          "SELECT e.month FROM grim.fulfillments f JOIN grim.editions e ON e.id=f.edition_id",
        )
      ).rows[0].month,
    ).toBe("2026-11");
  });
  it("records late payment recovery as review without shipping a vaulted edition", async () => {
    const { invoice } = await join();
    invoice.paidAt = Date.parse("2026-11-20T12:00:00Z") / 1000;
    await event("invoice.paid", invoice.id);
    expect(await count("fulfillments")).toBe(0);
    expect(
      (await pool.query("SELECT review_reason FROM grim.entitlements")).rows[0]
        .review_reason,
    ).toBe("payment_outside_edition_cutoff");
  });
  it("retains the paid copy after cancellation and does not resell its current edition seat", async () => {
    await pool.query("UPDATE grim.program SET member_cap=1");
    await pool.query("UPDATE grim.editions SET capacity=1");
    const { invoice, sub } = await join();
    sub.status = "canceled";
    await event("customer.subscription.deleted", sub.id);
    await event("invoice.paid", invoice.id);
    expect(await count("fulfillments")).toBe(1);
    await expect(
      c.reserve({ id: "next", email: "next@example.invalid" }, input()),
    ).rejects.toThrow("sold_out");
    now = new Date("2026-12-02T18:00:00Z");
    await c.reserve({ id: "next", email: "next@example.invalid" }, input());
    expect(await count("reservations")).toBe(2);
  });
  it("keeps pending receipts recoverable and commits business state with event completion", async () => {
    const { invoice } = await join();
    billing.failInvoice = true;
    await expect(
      event("invoice.paid", invoice.id, "evt_retry"),
    ).rejects.toThrow();
    expect(
      (await pool.query("SELECT state FROM grim.events WHERE id='evt_retry'"))
        .rows[0].state,
    ).toBe("pending");
    expect(await count("fulfillments")).toBe(0);
    billing.failInvoice = false;
    await event("invoice.paid", invoice.id, "evt_retry");
    expect(await count("fulfillments")).toBe(1);
    expect(
      (await pool.query("SELECT state FROM grim.events WHERE id='evt_retry'"))
        .rows[0].state,
    ).toBe("done");
  });
  it("does not free a checkout seat when expiry races successful payment", async () => {
    await pool.query("UPDATE grim.program SET member_cap=1");
    await pool.query("UPDATE grim.editions SET capacity=1");
    await c.checkout({ id: "one", email: "one@example.invalid" }, input());
    now = new Date("2026-11-02T19:00:00Z");
    billing.expiryRace = true;
    await c.expireReservations();
    expect(
      (await pool.query("SELECT state FROM grim.reservations")).rows[0].state,
    ).toBe("converted");
    await expect(
      c.reserve({ id: "two", email: "two@example.invalid" }, input()),
    ).rejects.toThrow("sold_out");
  });
  it("releases a seat only after authoritative session expiry", async () => {
    await c.checkout({ id: "one", email: "one@example.invalid" }, input());
    now = new Date("2026-11-02T19:00:00Z");
    await c.expireReservations();
    expect(
      (await pool.query("SELECT state FROM grim.reservations")).rows[0].state,
    ).toBe("released");
    await c.checkout({ id: "one", email: "one@example.invalid" }, input());
    expect(await count("reservations")).toBe(2);
  });
  it("locks the final valid address and never rewrites packing or shipment history", async () => {
    const { invoice, sub } = await join();
    await event("invoice.paid", invoice.id);
    billing.customers.get(sub.customer)!.address = {
      ...delivery,
      line1: "456 New Fixture Road",
    };
    await event("customer.updated", sub.customer);
    now = new Date("2026-11-12T19:00:00Z");
    await c.lockOrder("staff", (await order()).id);
    expect((await order()).address_snapshot?.line1).toBe(
      "456 New Fixture Road",
    );
    billing.customers.get(sub.customer)!.address = {
      ...delivery,
      line1: "789 After Lock Street",
    };
    await event("customer.updated", sub.customer);
    expect((await order()).address_snapshot?.line1).toBe(
      "456 New Fixture Road",
    );
    expect(
      await c.packingCSV("staff", (await order()).edition_id),
    ).not.toContain("456 New Fixture");
    const x = (
      await pool.query(
        "SELECT id FROM grim.exceptions WHERE resolved_at IS NULL",
      )
    ).rows[0];
    await c.resolveException(
      "staff",
      x.id,
      "Confirmed original packing address with collector.",
    );
    await c.shipOrder("staff", (await order()).id, {
      number: "TEST123",
      url: "https://example.invalid/TEST123",
    });
    billing.customers.get(sub.customer)!.address = {
      ...delivery,
      line1: "New future address",
    };
    await event("customer.updated", sub.customer);
    expect((await order()).state).toBe("shipped");
    expect((await order()).address_snapshot?.line1).toBe(
      "456 New Fixture Road",
    );
  });
  it("holds incomplete or unsupported delivery addresses", async () => {
    const { invoice, sub } = await join();
    billing.customers.get(sub.customer)!.address = {
      ...delivery,
      country: "CA",
    };
    await event("invoice.paid", invoice.id);
    expect((await order()).state).toBe("needs_address");
    now = new Date("2026-11-12T19:00:00Z");
    await expect(c.lockOrder("staff", (await order()).id)).rejects.toThrow(
      "order_not_ready",
    );
    billing.customers.get(sub.customer)!.address = delivery;
    await event("customer.updated", sub.customer);
    await c.lockOrder("staff", (await order()).id);
    expect((await order()).state).toBe("ready");
  });
  it.each(["review", "refunded", "disputed"] as const)(
    "holds %s invoices and preserves paid allocation under replays",
    async (state) => {
      const { invoice } = await join();
      await event("invoice.paid", invoice.id);
      invoice.financialState = state;
      await event("charge.refunded", "ch_fixture");
      await event("invoice.paid", invoice.id);
      expect((await order()).state).toBe("hold");
      expect(await count("fulfillments")).toBe(1);
    },
  );
  it("a refund after shipment leaves tracking and address intact", async () => {
    const { invoice } = await join();
    await event("invoice.paid", invoice.id);
    now = new Date("2026-11-12T19:00:00Z");
    await c.lockOrder("staff", (await order()).id);
    await c.shipOrder("staff", (await order()).id, {
      number: "TRACK1",
      url: "",
    });
    invoice.financialState = "refunded";
    await event("charge.refunded", "ch_fixture");
    expect((await order()).state).toBe("shipped");
    expect((await order()).tracking_number).toBe("TRACK1");
  });
  it("rechecks refunds and sanitizes spreadsheet formulas at packing export", async () => {
    const { invoice, sub } = await join();
    billing.customers.get(sub.customer)!.address = {
      ...delivery,
      name: ' =HYPERLINK("evil")',
    };
    await event("invoice.paid", invoice.id);
    now = new Date("2026-11-12T19:00:00Z");
    await c.lockOrder("staff", (await order()).id);
    expect(await c.packingCSV("staff", (await order()).edition_id)).toContain(
      "' =HYPERLINK",
    );
    invoice.financialState = "refunded";
    expect(
      await c.packingCSV("staff", (await order()).edition_id),
    ).not.toContain("HYPERLINK");
  });
  it.each([
    [
      "zero payment",
      (i: Invoice) => {
        i.amountPaid = 0;
        i.total = 0;
        i.amountDue = 0;
      },
    ],
    [
      "proration",
      (i: Invoice) => {
        i.lines[0].proration = true;
      },
    ],
    [
      "wrong currency",
      (i: Invoice) => {
        i.currency = "eur";
      },
    ],
    [
      "quantity change",
      (i: Invoice) => {
        i.lines[0].quantity = 2;
      },
    ],
    [
      "discount",
      (i: Invoice) => {
        i.adjusted = true;
      },
    ],
    [
      "extra line",
      (i: Invoice) => {
        i.lines.push({ ...i.lines[0] });
      },
    ],
    [
      "out-of-band",
      (i: Invoice) => {
        i.paymentVerified = false;
      },
    ],
    [
      "wrong period",
      (i: Invoice) => {
        i.lines[0].end = i.lines[0].start + 86400;
      },
    ],
  ])("sends %s to review instead of packing", async (_label, mutate) => {
    const { invoice } = await join();
    (mutate as (i: Invoice) => void)(invoice);
    await event("invoice.paid", invoice.id);
    expect(await count("fulfillments")).toBe(0);
    expect(await count("exceptions")).toBe(1);
  });
  it("ignores an unrelated customer invoice", async () => {
    const { invoice, sub } = await join();
    sub.reservation = null;
    sub.customer = "cus_other";
    await event("invoice.paid", invoice.id);
    expect(await count("fulfillments")).toBe(0);
    expect(await count("entitlements")).toBe(0);
  });
  it("a second invoice for the same monthly edition creates a review, not another copy", async () => {
    const { invoice, sub } = await join();
    await event("invoice.paid", invoice.id);
    const duplicate = billing.paidInvoice(
      sub,
      "2026-11-02T18:00:00Z",
      "2026-12-02T18:00:00Z",
    );
    await event("invoice.paid", duplicate.id);
    expect(await count("fulfillments")).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT review_reason FROM grim.entitlements WHERE invoice_id=$1",
          [duplicate.id],
        )
      ).rows[0].review_reason,
    ).toBe("duplicate_edition_payment");
  });
  it("reconciles a missing paid invoice repeatedly without duplicate obligations", async () => {
    const { invoice } = await join();
    await c.reconcileInvoice(invoice.id);
    await c.reconcileInvoice(invoice.id);
    expect(await count("fulfillments")).toBe(1);
    expect(await count("outbox")).toBe(1);
  });
  it("uses a stored customer for the authenticated owner’s billing portal", async () => {
    const { sub } = await join();
    await c.portal("collector_1");
    expect(billing.lastPortalCustomer).toBe(sub.customer);
    await expect(c.portal("someone_else")).rejects.toThrow(
      "membership_not_found",
    );
  });
  it("stores Boise windows correctly across daylight-saving time and locks used schedules", async () => {
    const rows = (
      await pool.query(
        "SELECT enrollment_open,period_close FROM grim.editions WHERE month='2026-11'",
      )
    ).rows;
    expect(rows[0].enrollment_open.toISOString()).toBe(
      "2026-11-01T06:00:00.000Z",
    );
    expect(rows[0].period_close.toISOString()).toBe("2026-12-01T07:00:00.000Z");
    await join();
    await expect(
      saveEdition(c, "staff", {
        action: "edition",
        month: "2026-11",
        title: "Changed",
        enrollment_open: "2026-11-01T00:00",
        enrollment_close: "2026-11-06T00:00",
        payment_cutoff: "2026-11-11T00:00",
        address_cutoff: "2026-11-12T00:00",
        dispatch_start: "2026-11-12T00:00",
        dispatch_end: "2026-11-19T00:00",
        state: "open",
      }),
    ).rejects.toThrow("edition_schedule_locked");
  });
});

it("can correct an unshipped locked address with an audit trail, but never a shipped address", async () => {
  const { invoice, sub } = await join();
  await event("invoice.paid", invoice.id);
  now = new Date("2026-11-12T19:00:00Z");
  await c.lockOrder("staff", (await order()).id);
  billing.customers.get(sub.customer)!.address = {
    ...delivery,
    line1: "Approved new address",
  };
  await event("customer.updated", sub.customer);
  await c.unlockOrder(
    "staff",
    (await order()).id,
    "Collector confirmed the updated destination.",
  );
  await c.lockOrder("staff", (await order()).id);
  const x = (
    await pool.query("SELECT id FROM grim.exceptions WHERE resolved_at IS NULL")
  ).rows[0];
  await c.resolveException(
    "staff",
    x.id,
    "Address confirmed and new packing label prepared.",
  );
  expect((await order()).address_snapshot?.line1).toBe("Approved new address");
  expect(
    (
      await pool.query(
        "SELECT detail FROM grim.audit WHERE action='packing_unlocked'",
      )
    ).rows[0].detail.previous_address.line1,
  ).toBe(delivery.line1);
  await c.shipOrder("staff", (await order()).id, {
    number: "TESTCORRECTED",
    url: "",
  });
  await expect(
    c.unlockOrder("staff", (await order()).id, "Attempt after dispatch."),
  ).rejects.toThrow("order_not_editable");
});
it("re-evaluates a paid invoice after its missing edition is configured without skipping eligibility", async () => {
  const { sub } = await join();
  const invoice = billing.paidInvoice(
    sub,
    "2027-02-02T18:00:00Z",
    "2027-03-02T18:00:00Z",
  );
  await event("invoice.paid", invoice.id);
  expect(await count("fulfillments")).toBe(0);
  await saveEdition(c, "staff", {
    action: "edition",
    month: "2027-02",
    title: "February fixture",
    enrollment_open: "2027-02-01T00:00",
    enrollment_close: "2027-02-06T00:00",
    payment_cutoff: "2027-02-11T00:00",
    address_cutoff: "2027-02-12T00:00",
    dispatch_start: "2027-02-12T00:00",
    dispatch_end: "2027-02-19T00:00",
    state: "open",
  });
  await c.reconsiderInvoice(
    "staff",
    invoice.id,
    "The approved February schedule is now saved.",
  );
  await c.reconsiderInvoice(
    "staff",
    invoice.id,
    "Repeat verification for the same invoice.",
  );
  expect(await count("fulfillments")).toBe(1);
});
it("rolls back order and notification writes when completing the event transaction fails", async () => {
  const { invoice } = await join();
  await pool.query(
    `CREATE FUNCTION grim.test_fail_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='done' THEN RAISE EXCEPTION 'simulated commit failure'; END IF; RETURN NEW; END $$`,
  );
  await pool.query(
    "CREATE TRIGGER test_fail_completion BEFORE UPDATE ON grim.events FOR EACH ROW EXECUTE FUNCTION grim.test_fail_completion()",
  );
  try {
    await expect(
      event("invoice.paid", invoice.id, "evt_atomic"),
    ).rejects.toThrow();
    expect(await count("fulfillments")).toBe(0);
    expect(await count("outbox")).toBe(0);
    expect(
      (await pool.query("SELECT state FROM grim.events WHERE id='evt_atomic'"))
        .rows[0].state,
    ).toBe("pending");
  } finally {
    await pool.query("DROP TRIGGER test_fail_completion ON grim.events");
    await pool.query("DROP FUNCTION grim.test_fail_completion()");
  }
  await event("invoice.paid", invoice.id, "evt_atomic");
  expect(await count("fulfillments")).toBe(1);
});
it("migration can be applied repeatedly without changing existing records", async () => {
  await join();
  await migrate(pool);
  expect(await count("reservations")).toBe(1);
});

it("delivers the outbox only to the sandbox sink and deduplicates completed notifications", async () => {
  const { invoice } = await join();
  await event("invoice.paid", invoice.id);
  delete process.env.GRIM_TEST_EMAIL;
  await expect(drainOutbox(pool, "sandbox", true)).rejects.toThrow(
    "test_email_required",
  );
  process.env.GRIM_TEST_EMAIL = "verified-sink@example.invalid";
  process.env.RESEND_API_KEY = "re_fixture";
  process.env.RESEND_FROM_EMAIL = "Fixture <sender@example.invalid>";
  notifications.send.mockResolvedValue({
    data: { id: "email_fixture" },
    error: null,
  });
  await drainOutbox(pool, "sandbox", true);
  await drainOutbox(pool, "sandbox", true);
  expect(notifications.send).toHaveBeenCalledTimes(1);
  expect(notifications.send.mock.calls[0][0].to).toBe(
    "verified-sink@example.invalid",
  );
  expect(notifications.send.mock.calls[0][1].idempotencyKey).toMatch(/^grim\//);
  expect(
    (await pool.query("SELECT state FROM grim.outbox")).rows[0].state,
  ).toBe("sent");
});
it("moves ambiguous old notification attempts to review without resending", async () => {
  const { invoice } = await join();
  await event("invoice.paid", invoice.id);
  process.env.GRIM_TEST_EMAIL = "verified-sink@example.invalid";
  process.env.RESEND_API_KEY = "re_fixture";
  process.env.RESEND_FROM_EMAIL = "Fixture <sender@example.invalid>";
  notifications.send.mockClear();
  await pool.query(
    "UPDATE grim.outbox SET first_attempt_at=now()-interval '25 hours'",
  );
  await drainOutbox(pool, "sandbox", true);
  expect(notifications.send).not.toHaveBeenCalled();
  expect(
    (await pool.query("SELECT state FROM grim.outbox")).rows[0].state,
  ).toBe("review");
});

it("a failed future renewal does not block an earlier paid shipment", async () => {
  const { invoice, sub } = await join();
  await event("invoice.paid", invoice.id);
  const renewal = billing.paidInvoice(
    sub,
    "2026-12-02T18:00:00Z",
    "2027-01-02T18:00:00Z",
  );
  renewal.status = "open";
  renewal.amountPaid = 0;
  renewal.paidAt = null;
  await event("invoice.payment_failed", renewal.id);
  now = new Date("2026-12-03T19:00:00Z");
  await c.lockOrder("staff", (await order()).id);
  await c.shipOrder("staff", (await order()).id, {
    number: "PAID-NOVEMBER",
    url: "",
  });
  expect((await order()).state).toBe("shipped");
});
it("persists a newly discovered refund even when staff shipping is rejected", async () => {
  const { invoice } = await join();
  await event("invoice.paid", invoice.id);
  now = new Date("2026-11-12T19:00:00Z");
  await c.lockOrder("staff", (await order()).id);
  invoice.financialState = "refunded";
  await expect(
    c.shipOrder("staff", (await order()).id, {
      number: "SHOULD-NOT-SHIP",
      url: "",
    }),
  ).rejects.toThrow("order_not_ready");
  expect((await order()).state).toBe("hold");
  const x = (
    await pool.query("SELECT id FROM grim.exceptions WHERE resolved_at IS NULL")
  ).rows[0];
  await c.resolveException(
    "staff",
    x.id,
    "Refund settled; the unshipped order remains on hold.",
  );
  await c.reconcileInvoice(invoice.id);
  expect(
    (
      await pool.query(
        "SELECT id FROM grim.exceptions WHERE resolved_at IS NULL",
      )
    ).rows,
  ).toHaveLength(0);
  expect((await order()).state).toBe("hold");
});

it("holds the current edition seat when cancellation arrives before the initial paid webhook", async () => {
  await pool.query("UPDATE grim.program SET member_cap=1");
  await pool.query("UPDATE grim.editions SET capacity=1");
  const { invoice, sub } = await join();
  sub.status = "canceled";
  await event("customer.subscription.deleted", sub.id);
  await expect(
    c.reserve(
      { id: "replacement", email: "replacement@example.invalid" },
      input(),
    ),
  ).rejects.toThrow("sold_out");
  await event("invoice.paid", invoice.id);
  expect(await count("fulfillments")).toBe(1);
});
it("future members do not consume the capacity of a delayed earlier paid edition", async () => {
  await pool.query("UPDATE grim.program SET member_cap=1");
  await pool.query("UPDATE grim.editions SET capacity=1");
  const first = await join();
  first.sub.status = "canceled";
  await event("customer.subscription.deleted", first.sub.id);
  now = new Date("2026-12-02T18:00:00Z");
  await c.checkout(
    { id: "replacement", email: "replacement@example.invalid" },
    input(),
  );
  const r = (
    await pool.query<Reservation>(
      "SELECT r.* FROM grim.reservations r JOIN grim.memberships m ON m.id=r.membership_id WHERE m.owner_id='replacement'",
    )
  ).rows[0];
  const second = billing.complete(
    r.session_id!,
    "2026-12-02T18:00:00Z",
    "2027-01-02T18:00:00Z",
  );
  await event("invoice.paid", second.invoice.id);
  await event("invoice.paid", first.invoice.id);
  expect(await count("fulfillments")).toBe(2);
  expect(
    (
      await pool.query(
        "SELECT review_reason FROM grim.entitlements WHERE review_reason IS NOT NULL",
      )
    ).rows,
  ).toHaveLength(0);
});

it.each(["entry", "mid", "high"] as const)(
  "keeps the %s tier on initial payment and renewal with one Grim per edition",
  async (tierId) => {
    const tier = sandboxTiers.find((t) => t.id === tierId)!;
    const { invoice, sub, r } = await join(`collector_${tierId}`, tierId);
    expect(r.tier_snapshot).toEqual(tier);
    expect(invoice.amountPaid).toBe(tier.amount);
    expect(invoice.lines[0].price).toBe(tier.price_id);
    await event("invoice.paid", invoice.id);
    now = new Date("2026-12-02T18:00:30Z");
    const renewal = billing.paidInvoice(
      sub,
      "2026-12-02T18:00:00Z",
      "2027-01-02T18:00:00Z",
    );
    sub.start = renewal.lines[0].start;
    sub.end = renewal.lines[0].end;
    await event("invoice.paid", renewal.id);
    await event("invoice.paid", renewal.id);
    const rows = (
      await pool.query(
        "SELECT tier_snapshot,amount_paid FROM grim.entitlements ORDER BY period_start",
      )
    ).rows;
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        (r) => r.tier_snapshot.id === tierId && r.amount_paid === tier.amount,
      ),
    ).toBe(true);
    expect(await count("fulfillments")).toBe(2);
  },
);
it("shares the final seat across tiers instead of selling three separate editions", async () => {
  await pool.query("UPDATE grim.program SET member_cap=1");
  await pool.query("UPDATE grim.editions SET capacity=1");
  const results = await Promise.allSettled(
    sandboxTiers.map((t) =>
      c.reserve(
        { id: t.id, email: `${t.id}@example.invalid` },
        { ...input(), tierId: t.id },
      ),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await count("reservations")).toBe(1);
});
it("rejects unknown tiers, injected prices, and changing an unfinished checkout's tier", async () => {
  const owner = { id: "chooser", email: "chooser@example.invalid" };
  await expect(
    c.reserve(owner, { ...input(), tierId: "secret" }),
  ).rejects.toThrow();
  await expect(
    c.reserve(owner, {
      ...input(),
      tierId: "high",
      price_id: sandboxTiers[0].price_id,
    }),
  ).rejects.toThrow();
  const request = { ...input(), tierId: "high" };
  const url = await c.checkout(owner, request);
  await expect(
    c.checkout(owner, { ...request, tierId: "entry" }),
  ).rejects.toThrow("checkout_tier_conflict");
  await expect(
    c.checkout(owner, { ...input(), tierId: "entry" }),
  ).rejects.toThrow("checkout_tier_conflict");
  expect(await c.checkout(owner, request)).toBe(url);
  expect(billing.creates).toBe(1);
});
it("allows a different tier after authoritative checkout expiry", async () => {
  const owner = { id: "chooser", email: "chooser@example.invalid" };
  await c.checkout(owner, { ...input(), tierId: "entry" });
  now = new Date("2026-11-02T19:00:00Z");
  await c.expireReservations();
  await c.checkout(owner, { ...input(), tierId: "high" });
  expect(
    (await pool.query("SELECT tier_snapshot FROM grim.memberships")).rows[0]
      .tier_snapshot.id,
  ).toBe("high");
  expect(billing.creates).toBe(2);
});
it("holds an invoice for a different allowed tier instead of granting the selected tier", async () => {
  const { invoice, sub } = await join("collector", "high");
  Object.assign(invoice, {
    amountPaid: sandboxTiers[0].amount,
    amountDue: sandboxTiers[0].amount,
    total: sandboxTiers[0].amount,
  });
  Object.assign(invoice.lines[0], {
    price: sandboxTiers[0].price_id,
    amount: sandboxTiers[0].amount,
  });
  sub.priceId = sandboxTiers[0].price_id;
  await event("invoice.paid", invoice.id);
  expect(await count("fulfillments")).toBe(0);
  expect(
    (await pool.query("SELECT review_reason FROM grim.entitlements")).rows[0]
      .review_reason,
  ).toBe("unexpected_recurring_line");
  expect(await count("exceptions")).toBe(2);
});
it("retains paid tier perks in history and sanitizes them in packing exports", async () => {
  const tiers = structuredClone(sandboxTiers);
  tiers[2].perks = ["=Fixture perk"];
  await pool.query("UPDATE grim.program SET tiers=$1", [JSON.stringify(tiers)]);
  const { invoice } = await join("collector", "high");
  await event("invoice.paid", invoice.id);
  // Even a later configuration edit cannot rewrite a saved order's benefits.
  tiers[2].name = "Renamed";
  tiers[2].perks = ["Different fixture perk"];
  await pool.query("UPDATE grim.program SET tiers=$1", [JSON.stringify(tiers)]);
  now = new Date("2026-11-12T19:00:00Z");
  const f = await order();
  await c.lockOrder("staff", f.id);
  const csv = await c.packingCSV("staff", f.edition_id);
  expect(csv).toContain('"Grim Curator"');
  expect(csv).toContain('"\'=Fixture perk"');
  expect(csv).not.toContain("Renamed");
  expect(csv).not.toContain("Different fixture perk");
});
it("does not enable live tier sales with unconfirmed benefits", async () => {
  const unconfirmedTiers = sandboxTiers.map((tier) => ({
    ...tier,
    benefits_confirmed: false,
  }));
  await pool.query("UPDATE grim.program SET tiers=$1", [
    JSON.stringify(unconfirmedTiers),
  ]);
  await pool.query(`INSERT INTO grim.program(id,enabled,approved_at,tiers,currency,member_cap,retained_copies,countries,shipping_text,tax_mode,terms_version,cancellation_text,recovery_text,support_email,portal_configuration_id)
    SELECT 'live',true,now(),tiers,currency,member_cap,retained_copies,countries,shipping_text,tax_mode,terms_version,cancellation_text,recovery_text,support_email,portal_configuration_id FROM grim.program WHERE id='sandbox'`);
  const live = new Grimmunity(pool, billing, "live", () => now, true);
  await expect(
    live.reserve({ id: "live", email: "fixture@example.invalid" }, input()),
  ).rejects.toThrow("tiers_not_ready");
});

it("migrates a paid single-plan order to an entry-tier snapshot without changing its obligation", async () => {
  const db = await pool.connect();
  const schema = `grim_migration_${randomUUID().replaceAll("-", "")}`;
  const initial = (await readFile("db/grimmunity/001_initial.sql", "utf8"))
    .replaceAll("grim.", `${schema}.`)
    .replace("EXISTS grim;", `EXISTS ${schema};`);
  const upgrade = (
    await readFile("db/grimmunity/002_tiers.sql", "utf8")
  ).replaceAll("grim.", `${schema}.`);
  try {
    await db.query("BEGIN");
    await db.query(initial);
    await db.query(`INSERT INTO ${schema}.program(id,enabled,price_id,product_id,currency,amount,member_cap,retained_copies,countries,shipping_text,tax_mode,terms_version,cancellation_text,recovery_text,support_email,portal_configuration_id)
      SELECT id,true,price_id,product_id,currency,amount,member_cap,retained_copies,countries,shipping_text,tax_mode,terms_version,cancellation_text,recovery_text,support_email,portal_configuration_id FROM grim.program`);
    const { invoice } = await join();
    await event("invoice.paid", invoice.id);
    await db.query(
      `INSERT INTO ${schema}.editions SELECT id,program_id,month,title,capacity,retained_copies,enrollment_open,enrollment_close,period_open,period_close,payment_cutoff,address_cutoff,dispatch_start,dispatch_end,state FROM grim.editions`,
    );
    await db.query(`INSERT INTO ${schema}.memberships(id,program_id,owner_id,email,customer_id,subscription_id,status,seat_held)
      SELECT id,program_id,owner_id,email,customer_id,subscription_id,status,seat_held FROM grim.memberships`);
    await db.query(`INSERT INTO ${schema}.reservations(id,program_id,membership_id,edition_id,request_key,state,expires_at)
      SELECT id,program_id,membership_id,edition_id,request_key,state,expires_at FROM grim.reservations`);
    await db.query(`INSERT INTO ${schema}.entitlements(invoice_id,membership_id,edition_id,amount_paid,currency,allocated)
      SELECT invoice_id,membership_id,edition_id,amount_paid,currency,allocated FROM grim.entitlements`);
    await db.query(
      `INSERT INTO ${schema}.fulfillments SELECT id,invoice_id,membership_id,edition_id,state,address_snapshot,locked_at,shipped_at,tracking_number,tracking_url FROM grim.fulfillments`,
    );
    await db.query(upgrade);
    expect(
      (await db.query(`SELECT enabled,tiers FROM ${schema}.program`)).rows[0],
    ).toMatchObject({
      enabled: false,
      tiers: [{ id: "entry", amount: sandboxTiers[0].amount }],
    });
    for (const table of ["memberships", "reservations", "entitlements"]) {
      expect(
        (await db.query(`SELECT tier_snapshot FROM ${schema}.${table}`)).rows[0]
          .tier_snapshot,
      ).toMatchObject({
        id: "entry",
        price_id: "price_grim_fixture",
        amount: sandboxTiers[0].amount,
      });
    }
    expect(
      (await db.query(`SELECT invoice_id,state FROM ${schema}.fulfillments`))
        .rows,
    ).toEqual([{ invoice_id: invoice.id, state: "paid" }]);
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
});

const launchShipping = {
  price_id: "price_shipping_fixture",
  product_id: "prod_shipping_fixture",
  amount: 700, // Deliberately differs from the launch fee to test stored configuration.
};
async function useLaunchOffer(
  shipping: typeof launchShipping | null = launchShipping,
) {
  const tier = { ...launchTiers[0], shipping };
  await pool.query("UPDATE grim.program SET tiers=$1", [
    JSON.stringify([tier]),
  ]);
  return tier;
}
it("keeps launch checkout closed until the flat shipping fee is configured", async () => {
  await useLaunchOffer(null);
  await expect(join("pending_shipping", "mid")).rejects.toThrow(
    "shipping_not_ready",
  );
  expect(billing.creates).toBe(0);
  expect(await count("memberships")).toBe(0);
});
it("offers only Collector and rejects retired membership choices", async () => {
  await useLaunchOffer();
  for (const tierId of ["entry", "high"] as const) {
    await expect(join(`retired_${tierId}`, tierId)).rejects.toThrow(
      "membership_unavailable",
    );
  }
  expect(billing.creates).toBe(0);
  const { r } = await join("collector", "mid");
  expect(r.tier_snapshot.amount).toBe(2500);
  expect(r.tier_snapshot.shipping).toEqual(launchShipping);
});
it("charges membership and flat shipping on signup and renewal but creates one shipment per month", async () => {
  const tier = await useLaunchOffer();
  const { invoice, sub } = await join("flat_shipping", "mid");
  expect(invoice.amountPaid).toBe(3200);
  expect(invoice.lines).toHaveLength(2);
  invoice.lines.reverse(); // Stripe item order is not a billing identity.
  await event("invoice.paid", invoice.id);
  now = new Date("2026-12-02T18:00:30Z");
  const renewal = billing.paidInvoice(
    sub,
    "2026-12-02T18:00:00Z",
    "2027-01-02T18:00:00Z",
  );
  sub.start = renewal.lines[0].start;
  sub.end = renewal.lines[0].end;
  await event("invoice.paid", renewal.id);
  await event("invoice.paid", renewal.id);
  expect(await count("fulfillments")).toBe(2);
  const rows = (
    await pool.query("SELECT amount_paid,tier_snapshot FROM grim.entitlements")
  ).rows;
  expect(
    rows.every(
      (row) =>
        row.amount_paid === 3200 &&
        row.tier_snapshot.shipping.price_id === tier.shipping!.price_id,
    ),
  ).toBe(true);
});
it.each([
  "missing",
  "duplicate",
  "wrong_amount",
  "wrong_price",
  "wrong_period",
  "wrong_quantity",
])(
  "holds a paid invoice with %s shipping instead of packing it",
  async (problem) => {
    await useLaunchOffer();
    const { invoice } = await join("shipping_hold", "mid");
    const shipping = invoice.lines[1];
    if (problem === "missing") invoice.lines.pop();
    if (problem === "duplicate") invoice.lines[0] = { ...shipping };
    if (problem === "wrong_amount") shipping.amount++;
    if (problem === "wrong_price") shipping.price = "price_other_fixture";
    if (problem === "wrong_period") shipping.start++;
    if (problem === "wrong_quantity") shipping.quantity = 2;
    await event("invoice.paid", invoice.id);
    expect(await count("fulfillments")).toBe(0);
    expect(
      (await pool.query("SELECT review_reason FROM grim.entitlements")).rows[0]
        .review_reason,
    ).toBeTruthy();
  },
);
