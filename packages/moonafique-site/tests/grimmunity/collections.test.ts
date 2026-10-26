import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { Grimmunity } from "../../lib/grimmunity/service";
import { FakeBilling, delivery } from "./fake-billing";
import { sandboxTiers, type TierId } from "../../lib/grimmunity/tiers";
import { preferencesSchema } from "../../lib/grimmunity/preferences";
import { shippingParcel } from "../../lib/grimmunity/shipping-profile";
import {
  buyOrderLabel,
  quoteMembership,
  quoteOrder,
  refreshOrderLabel,
} from "../../lib/grimmunity/shipping";
import type { ShippingGateway, ShippingRate } from "../../lib/shippo";
import type { Edition, Program, Reservation } from "../../lib/grimmunity/model";
import { tierAvailability } from "../../lib/grimmunity/capacity";

const url = process.env.GRIM_TEST_DATABASE_URL;
if (
  !url ||
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  new URL(url).pathname !== "/grim_test"
)
  throw Error("A disposable local grim_test database is required.");
const pool = new Pool({ connectionString: url, max: 12 });
const preferences = {
  preferred_colors: ["Purple", "Teal", "Blue", "Black", "Pink", "White"],
  avoided_colors: ["Orange"],
};
const rate: ShippingRate = {
  id: "rate_fixture",
  amount: 600,
  currency: "usd",
  carrier: "USPS",
  service: "Ground Advantage",
  estimated_days: 4,
};
let c: Grimmunity, billing: FakeBilling, now: Date, buys: number;
const gateway: ShippingGateway = {
  quote: async () => ({ shipment_id: "shipment_fixture", rates: [rate] }),
  buy: async (rateId, reference) => {
    buys++;
    return {
      id: "transaction_fixture",
      status: "SUCCESS",
      test: true,
      reference,
      rate_id: rateId,
      label_url: "https://example.invalid/label.pdf",
      tracking_number: "TRACK-FIXTURE",
      tracking_url: "https://example.invalid/track",
    };
  },
  transaction: async () => {
    throw Error("Unused");
  },
};
beforeAll(async () => {
  await migrate(pool);
});
beforeEach(async () => {
  await pool.query("TRUNCATE grim.program CASCADE");
  await seedSandbox(pool);
  await pool.query(
    "UPDATE grim.program SET enabled=true,fulfillment_lead_days=7",
  );
  now = new Date("2026-11-02T18:00:00Z");
  buys = 0;
  billing = new FakeBilling();
  c = new Grimmunity(pool, billing, "sandbox", () => now);
});
afterAll(async () => {
  await pool.end();
});
async function quote(owner: string, tierId: TierId = "grimm_keeper") {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO grim.shipping_quotes(id,program_id,owner_id,tier_id,address,parcel,shipment_id,rate,created_at,expires_at)
    VALUES($1,'sandbox',$2,$3,$4,$5,'shipment_fixture',$6,$7,$8)`,
    [
      id,
      owner,
      tierId,
      delivery,
      shippingParcel({ id: tierId }),
      rate,
      now,
      new Date(now.getTime() + 3600000),
    ],
  );
  return id;
}
async function input(owner: string, tierId: TierId = "grimm_keeper") {
  return {
    requestKey: randomUUID(),
    tierId,
    termsVersion: "sandbox-review-v1",
    country: "US",
    consent: true,
    shippingQuoteId: await quote(owner, tierId),
    ...(tierId === "grimm_starter" ? { preferences } : {}),
  };
}
async function paid(tierId: TierId = "grimm_keeper") {
  const owner = { id: "collector", email: "collector@example.invalid" };
  await c.checkout(owner, await input(owner.id, tierId));
  const r = (
    await pool.query<Reservation>("SELECT * FROM grim.reservations LIMIT 1")
  ).rows[0];
  const completed = billing.complete(r.session_id!);
  await c.process({
    id: `evt_${randomUUID()}`,
    type: "invoice.paid",
    object_id: completed.invoice.id,
    livemode: false,
  });
  const f = (await pool.query("SELECT * FROM grim.fulfillments LIMIT 1"))
    .rows[0];
  await c.lockOrder("staff", f.id);
  return { ...completed, f, r };
}
it("uses all four approved prices, distinct caps, and the right packing profiles", () => {
  expect(
    sandboxTiers.map((t) => [t.id, t.amount, t.member_cap, t.retained_copies]),
  ).toEqual([
    ["grimm_starter", 1500, null, 0],
    ["grimm_keeper", 3000, 12, 1],
    ["aceo_prints", 1000, 24, 0],
    ["aceo_originals", 2000, 12, 0],
  ]);
  expect(shippingParcel({ id: "grimm_keeper" })).toEqual({
    length: 8,
    width: 8,
    height: 8,
    weight: 8,
  });
  expect(shippingParcel({ id: "aceo_originals" })).toEqual({
    length: 7,
    width: 5,
    height: 1,
    weight: 6,
  });
  expect(sandboxTiers[1].perks.join(" ")).not.toContain("stand");
});
it("serializes simultaneous attempts for each tier's final seat without sharing the old 24-member cap", async () => {
  for (const [tierId, cap] of [
    ["grimm_keeper", 12],
    ["aceo_prints", 24],
    ["aceo_originals", 12],
  ] as const) {
    const inputs = await Promise.all(
      Array.from({ length: cap + 3 }, (_, n) =>
        input(`${tierId}_${n}`, tierId),
      ),
    );
    const results = await Promise.allSettled(
      inputs.map((value, n) =>
        c.reserve(
          { id: `${tierId}_${n}`, email: "fixture@example.invalid" },
          value,
        ),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(cap);
    expect(
      results
        .filter((result) => result.status === "rejected")
        .every(
          (result) =>
            result.status === "rejected" && result.reason.code === "sold_out",
        ),
    ).toBe(true);
  }
  expect(
    Number(
      (await pool.query("SELECT count(*) FROM grim.reservations")).rows[0]
        .count,
    ),
  ).toBe(48);
});
it("lets one owner hold a Grimm and ACEO membership while preventing a second Grimm tier", async () => {
  const owner = { id: "both", email: "both@example.invalid" };
  await c.checkout(owner, await input(owner.id, "grimm_keeper"));
  await c.checkout(owner, await input(owner.id, "aceo_prints"));
  await expect(
    c.checkout(owner, await input(owner.id, "grimm_starter")),
  ).rejects.toThrow("checkout_tier_conflict");
  expect(
    (
      await pool.query("SELECT club FROM grim.memberships ORDER BY club")
    ).rows.map((m) => m.club),
  ).toEqual(["aceo", "grimm"]);
});
it("counts held checkouts and paid members once per tier, and restores spots after an unpaid checkout expires", async () => {
  const program = (
    await pool.query<Program>("SELECT * FROM grim.program WHERE id='sandbox'")
  ).rows[0];
  const edition = (
    await pool.query<Edition>(
      "SELECT * FROM grim.editions WHERE program_id='sandbox' AND month='2026-11'",
    )
  ).rows[0];
  const available = () => tierAvailability(pool, "sandbox", program, edition);
  expect(await available()).toMatchObject({
    grimm_keeper: { remaining: 12 },
    aceo_prints: { remaining: 24 },
    aceo_originals: { remaining: 12 },
  });
  const owner = { id: "spot_test", email: "spot-test@example.invalid" };
  await c.checkout(owner, await input(owner.id, "aceo_prints"));
  expect(await available()).toMatchObject({
    grimm_keeper: { remaining: 12 },
    aceo_prints: { full: false, remaining: 23 },
  });
  const r = (
    await pool.query<Reservation>(
      "SELECT * FROM grim.reservations WHERE tier_snapshot->>'id'='aceo_prints'",
    )
  ).rows[0];
  const completed = billing.complete(r.session_id!);
  await c.process({
    id: "evt_spot_paid",
    type: "invoice.paid",
    object_id: completed.invoice.id,
    livemode: false,
  });
  expect(await available()).toMatchObject({ aceo_prints: { remaining: 23 } });
  await c.checkout(owner, await input(owner.id, "grimm_keeper"));
  expect(await available()).toMatchObject({
    grimm_keeper: { remaining: 11 },
    aceo_prints: { remaining: 23 },
  });
  const pending = (
    await pool.query<Reservation>(
      "SELECT * FROM grim.reservations WHERE tier_snapshot->>'id'='grimm_keeper'",
    )
  ).rows[0];
  billing.sessions.get(pending.session_id!)!.state = "expired";
  now = new Date(pending.expires_at.getTime() + 1000);
  await c.expireReservations();
  expect(await available()).toMatchObject({
    grimm_keeper: { remaining: 12 },
    aceo_prints: { remaining: 23 },
    grimm_starter: { remaining: null, full: false },
  });
});
it("leaves Starter uncapped and requires six distinct preferred colors", async () => {
  expect(
    preferencesSchema.safeParse({
      ...preferences,
      preferred_colors: Array(6).fill("blue"),
    }).success,
  ).toBe(false);
  expect(
    preferencesSchema.safeParse({ ...preferences, avoided_colors: ["purple"] })
      .success,
  ).toBe(false);
  const value = await input("no_colors", "grimm_starter");
  await expect(
    c.reserve(
      { id: "no_colors", email: "fixture@example.invalid" },
      { ...value, preferences: undefined },
    ),
  ).rejects.toThrow("color_preferences_required");
  for (let n = 0; n < 26; n++)
    await c.reserve(
      { id: `starter_${n}`, email: "fixture@example.invalid" },
      await input(`starter_${n}`, "grimm_starter"),
    );
  expect(
    Number(
      (await pool.query("SELECT count(*) FROM grim.reservations")).rows[0]
        .count,
    ),
  ).toBe(26);
});
it("binds a shipping quote to the authenticated owner, tier, address, and expiry", async () => {
  const value = await input("owner");
  await expect(
    c.reserve(
      { id: "different_owner", email: "fixture@example.invalid" },
      value,
    ),
  ).rejects.toThrow("shipping_quote_expired");
  await expect(
    c.reserve(
      { id: "owner", email: "fixture@example.invalid" },
      { ...value, tierId: "aceo_prints" },
    ),
  ).rejects.toThrow("shipping_quote_expired");
  now = new Date(now.getTime() + 31 * 60000);
  await expect(
    c.reserve({ id: "owner", email: "fixture@example.invalid" }, value),
  ).rejects.toThrow("shipping_quote_expired");
});
it("uses the server shipping amount and preserves the preferences saved with a paid order", async () => {
  const { r } = await paid("grimm_starter");
  expect(r.tier_snapshot.shipping?.amount).toBe(600);
  expect(r.shipping_address).toEqual(delivery);
  await pool.query("UPDATE grim.memberships SET preferences=$1", [
    { ...preferences, avoided_colors: ["Yellow"] },
  ]);
  const saved = (
    await pool.query("SELECT preferences,amount_paid FROM grim.entitlements")
  ).rows[0];
  expect(saved.preferences).toEqual(preferences);
  expect(saved.amount_paid).toBe(2100);
  expect(await c.packingCSV("staff", r.edition_id)).toContain(
    "Purple; Teal; Blue; Black; Pink; White",
  );
});
it("quotes membership shipping without buying postage and blocks closed enrollment", async () => {
  const result = await quoteMembership(c, gateway, "new_owner", {
    tierId: "aceo_prints",
    address: delivery,
  });
  expect(result.monthlyTotal).toBe(1600);
  expect(buys).toBe(0);
  await pool.query("UPDATE grim.program SET enabled=false");
  await expect(
    quoteMembership(c, gateway, "new_owner", {
      tierId: "aceo_prints",
      address: delivery,
    }),
  ).rejects.toThrow("enrollment_closed");
});
it("buys one label under concurrent clicks and waits for explicit dispatch", async () => {
  const { f } = await paid();
  const quoted = await quoteOrder(c, gateway, "staff", f.id);
  const value = {
    id: f.id,
    quoteId: quoted.quoteId,
    rateId: rate.id,
    maxAmount: rate.amount,
  };
  const results = await Promise.allSettled([
    buyOrderLabel(c, gateway, "staff", value),
    buyOrderLabel(c, gateway, "staff", value),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(buys).toBe(1);
  expect(
    (await pool.query("SELECT state FROM grim.fulfillments")).rows[0].state,
  ).toBe("ready");
  await expect(
    c.unlockOrder("staff", f.id, "Change the packing address"),
  ).rejects.toThrow("shipping_label_exists");
  await c.shipOrder("staff", f.id, {
    number: "TRACK-FIXTURE",
    url: "https://example.invalid/track",
  });
  expect(
    (await pool.query("SELECT state FROM grim.fulfillments")).rows[0].state,
  ).toBe("shipped");
});
it("rejects altered label prices and holds an uncertain purchase without retrying", async () => {
  const { f } = await paid();
  const quoted = await quoteOrder(c, gateway, "staff", f.id);
  const value = {
    id: f.id,
    quoteId: quoted.quoteId,
    rateId: rate.id,
    maxAmount: rate.amount,
  };
  await expect(
    buyOrderLabel(c, gateway, "staff", { ...value, maxAmount: 1 }),
  ).rejects.toThrow("shipping_rate_changed");
  const uncertain = {
    ...gateway,
    buy: async () => {
      buys++;
      throw Error("Timeout after purchase");
    },
  };
  await expect(buyOrderLabel(c, uncertain, "staff", value)).rejects.toThrow(
    "shipping_purchase_review",
  );
  await expect(buyOrderLabel(c, uncertain, "staff", value)).rejects.toThrow(
    "shipping_label_exists",
  );
  expect(buys).toBe(1);
  expect(
    (await pool.query("SELECT state FROM grim.shipping_labels")).rows[0].state,
  ).toBe("review");
});
it("rechecks financial state before buying a previously quoted label", async () => {
  const { f, invoice } = await paid();
  const quoted = await quoteOrder(c, gateway, "staff", f.id);
  invoice.financialState = "refunded";
  await expect(
    buyOrderLabel(c, gateway, "staff", {
      id: f.id,
      quoteId: quoted.quoteId,
      rateId: rate.id,
      maxAmount: rate.amount,
    }),
  ).rejects.toThrow("order_not_ready");
  expect(buys).toBe(0);
});

it("limits simultaneous shipping quotes before contacting Shippo", async () => {
  let requests = 0;
  const counted = {
    ...gateway,
    quote: async () => {
      requests++;
      return { shipment_id: "shipment_fixture", rates: [rate] };
    },
  };
  const results = await Promise.allSettled(
    Array.from({ length: 24 }, () =>
      quoteMembership(c, counted, "same_owner", {
        tierId: "aceo_prints",
        address: delivery,
      }),
    ),
  );
  expect(requests).toBe(20);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(20);
  expect(
    results
      .filter((r) => r.status === "rejected")
      .every(
        (r) =>
          r.status === "rejected" && r.reason.code === "shipping_rate_limited",
      ),
  ).toBe(true);
});

it("recovers an uncertain transaction only when its order reference and rate match", async () => {
  const { f } = await paid();
  const quoted = await quoteOrder(c, gateway, "staff", f.id);
  const input = {
    id: f.id,
    quoteId: quoted.quoteId,
    rateId: rate.id,
    maxAmount: rate.amount,
  };
  await expect(
    buyOrderLabel(
      c,
      {
        ...gateway,
        buy: async () => {
          throw Error("Timeout");
        },
      },
      "staff",
      input,
    ),
  ).rejects.toThrow("shipping_purchase_review");
  const result = {
    id: "transaction_fixture",
    status: "SUCCESS",
    test: true,
    label_url: "https://example.invalid/label.pdf",
    tracking_number: "TRACK",
    tracking_url: null,
    reference: `order:${f.id}`,
    rate_id: rate.id,
  };
  await expect(
    refreshOrderLabel(
      c,
      {
        ...gateway,
        transaction: async () => ({ ...result, reference: "order:another" }),
      },
      "staff",
      f.id,
      result.id,
    ),
  ).rejects.toThrow("shipping_transaction_mismatch");
  await refreshOrderLabel(
    c,
    { ...gateway, transaction: async () => result },
    "staff",
    f.id,
    result.id,
  );
  expect(
    (await pool.query("SELECT state FROM grim.shipping_labels")).rows[0].state,
  ).toBe("purchased");
  expect(buys).toBe(0);
});
