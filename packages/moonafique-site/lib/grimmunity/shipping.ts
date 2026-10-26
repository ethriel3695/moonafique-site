import { randomUUID } from "node:crypto";
import type { ShippingGateway, ShippingRate, LabelResult } from "../shippo";
import { lockedProgram, one, transaction, type DB } from "./db";
import {
  addressValid,
  ClubError,
  type Address,
  type Fulfillment,
  type Mode,
} from "./model";
import {
  deliveryAddressSchema,
  shippingParcel,
  type Parcel,
} from "./shipping-profile";
import type { Grimmunity } from "./service";
import { tierIds, type Tier } from "./tiers";
import { z } from "zod";

export type ShippingQuote = {
  id: string;
  program_id: Mode;
  owner_id: string;
  tier_id: Tier["id"];
  address: Address;
  parcel: Parcel;
  shipment_id: string;
  rate: ShippingRate;
  expires_at: Date;
};
export type ShippingLabel = {
  fulfillment_id: string;
  quote_id: string;
  shipment_id: string;
  address_snapshot: Address;
  parcel: Parcel;
  rates: ShippingRate[];
  quoted_at: Date;
  state: "quoted" | "purchasing" | "purchased" | "review";
  rate_id: string | null;
  amount: number | null;
  transaction_id: string | null;
  label_url: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  test: boolean;
};
export const shippingQuoteInput = z
  .object({ tierId: z.enum(tierIds), address: deliveryAddressSchema })
  .strict();
export async function quoteMembership(
  c: Grimmunity,
  gateway: ShippingGateway,
  owner: string,
  raw: unknown,
) {
  const input = shippingQuoteInput.parse(raw);
  const id = randomUUID();
  const { tier, parcel } = await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    if (
      !p.enabled ||
      (c.mode === "live" && (!p.approved_at || !c.allowLiveEnrollment))
    )
      throw new ClubError("enrollment_closed");
    const tier = p.tiers.find(
      (t) =>
        t.id === input.tierId &&
        t.shipping_mode === "shippo" &&
        t.benefits_confirmed,
    );
    if (!tier) throw new ClubError("membership_unavailable", 400);
    if (!addressValid(input.address, p.countries))
      throw new ClubError("unsupported_destination", 400);
    const edition = await one<import("./model").Edition>(
      db,
      "SELECT * FROM grim.editions WHERE program_id=$1 AND state='open' AND enrollment_open<=$2 AND enrollment_close>$2 ORDER BY enrollment_open LIMIT 1",
      [c.mode, c.now()],
    );
    if (!edition) throw new ClubError("enrollment_closed");
    const allocation = edition.tier_allocations?.[tier.id];
    if (tier.member_cap !== undefined && !allocation)
      throw new ClubError("edition_configuration_mismatch", 503);
    const cap = allocation
      ? allocation.capacity
      : Math.min(p.member_cap, edition.capacity);
    if (
      cap !== null &&
      (await c.occupants(
        db,
        edition,
        undefined,
        allocation ? tier.id : undefined,
      )) >= cap
    )
      throw new ClubError("sold_out");
    const count = await one<{ count: string }>(
      db,
      "SELECT count(*) FROM grim.audit WHERE program_id=$1 AND actor=$2 AND action='shipping_quote_requested' AND created_at>now()-interval '1 hour'",
      [c.mode, owner],
    );
    if (Number(count!.count) >= 20)
      throw new ClubError("shipping_rate_limited", 429);
    // Commit a counted request under the program lock before the external API
    // call, so simultaneous requests cannot all bypass the limit.
    await c.audit(db, owner, "shipping_quote_requested", id, { tier: tier.id });
    return { tier, parcel: shippingParcel(tier) };
  });
  const result = await gateway.quote(input.address, parcel, `membership:${id}`);
  // Ground Advantage keeps the standard shipping promise consistent. Other carriers
  // can still be chosen by staff when buying postage for a paid order.
  const rate = result.rates.find(
    (r) =>
      r.carrier.toUpperCase() === "USPS" && /ground advantage/i.test(r.service),
  );
  if (!rate) throw new ClubError("shipping_quote_failed", 503);
  const expires = new Date(c.now().getTime() + 60 * 60000);
  await c.pool.query(
    `INSERT INTO grim.shipping_quotes(id,program_id,owner_id,tier_id,address,parcel,shipment_id,rate,created_at,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id,
      c.mode,
      owner,
      tier.id,
      input.address,
      parcel,
      result.shipment_id,
      rate,
      c.now(),
      expires,
    ],
  );
  return {
    id,
    rate,
    expiresAt: expires.toISOString(),
    monthlyTotal: tier.amount + rate.amount,
  };
}

async function readyOrder(c: Grimmunity, db: DB, id: string) {
  const p = await lockedProgram(db, c.mode);
  const f = await one<Fulfillment & { tier_snapshot: Tier }>(
    db,
    `SELECT f.*,i.tier_snapshot FROM grim.fulfillments f JOIN grim.memberships m ON m.id=f.membership_id
     JOIN grim.entitlements i ON i.invoice_id=f.invoice_id WHERE f.id=$1 AND m.program_id=$2`,
    [id, c.mode],
  );
  if (!f) throw new ClubError("order_not_found", 404);
  await c.applyInvoice(db, p, f.invoice_id);
  const current = await one<Fulfillment>(
    db,
    "SELECT * FROM grim.fulfillments WHERE id=$1",
    [id],
  );
  const blocked = await one(
    db,
    `SELECT x.id FROM grim.exceptions x WHERE x.membership_id=$1 AND x.resolved_at IS NULL
    AND (x.invoice_id=$2 OR x.invoice_id IS NULL)`,
    [f.membership_id, f.invoice_id],
  );
  const paid = await one(
    db,
    "SELECT invoice_id FROM grim.entitlements WHERE invoice_id=$1 AND allocated AND financial_state='paid' AND review_reason IS NULL",
    [f.invoice_id],
  );
  if (
    current?.state !== "ready" ||
    !current.locked_at ||
    !current.address_snapshot ||
    !paid ||
    blocked
  )
    throw new ClubError("order_not_ready");
  return { ...current, tier_snapshot: f.tier_snapshot };
}
export async function quoteOrder(
  c: Grimmunity,
  gateway: ShippingGateway,
  actor: string,
  id: string,
) {
  const order = await transaction(c.pool, async (db) => {
    const f = await readyOrder(c, db, id);
    const prior = await one<ShippingLabel>(
      db,
      "SELECT * FROM grim.shipping_labels WHERE fulfillment_id=$1",
      [id],
    );
    if (prior && prior.state !== "quoted")
      throw new ClubError("shipping_label_exists");
    return f;
  });
  const parcel = shippingParcel(order.tier_snapshot);
  const result = await gateway.quote(
    order.address_snapshot!,
    parcel,
    `order:${id}`,
  );
  const quoteId = randomUUID();
  await transaction(c.pool, async (db) => {
    const f = await readyOrder(c, db, id);
    if (
      JSON.stringify(f.address_snapshot) !==
      JSON.stringify(order.address_snapshot)
    )
      throw new ClubError("shipping_address_changed");
    const prior = await one<ShippingLabel>(
      db,
      "SELECT * FROM grim.shipping_labels WHERE fulfillment_id=$1",
      [id],
    );
    if (prior && prior.state !== "quoted")
      throw new ClubError("shipping_label_exists");
    await db.query(
      `INSERT INTO grim.shipping_labels(fulfillment_id,quote_id,shipment_id,address_snapshot,parcel,rates,quoted_at,state,test)
      VALUES($1,$2,$3,$4,$5,$6,$7,'quoted',$8) ON CONFLICT(fulfillment_id) DO UPDATE SET
      quote_id=EXCLUDED.quote_id,shipment_id=EXCLUDED.shipment_id,address_snapshot=EXCLUDED.address_snapshot,
      parcel=EXCLUDED.parcel,rates=EXCLUDED.rates,quoted_at=EXCLUDED.quoted_at`,
      [
        id,
        quoteId,
        result.shipment_id,
        f.address_snapshot,
        parcel,
        JSON.stringify(result.rates),
        c.now(),
        c.mode === "sandbox",
      ],
    );
    await c.audit(db, actor, "shipping_quoted", id);
  });
  return { quoteId, rates: result.rates };
}
function safeHttps(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
async function saveLabel(
  c: Grimmunity,
  actor: string,
  id: string,
  result: LabelResult,
) {
  await transaction(c.pool, async (db) => {
    await lockedProgram(db, c.mode);
    if (result.test !== (c.mode === "sandbox"))
      throw new ClubError("shipping_mode_mismatch", 503);
    const saved = await one<ShippingLabel>(
      db,
      "SELECT * FROM grim.shipping_labels WHERE fulfillment_id=$1 FOR UPDATE",
      [id],
    );
    if (
      !saved ||
      result.reference !== `order:${id}` ||
      result.rate_id !== saved.rate_id
    )
      throw new ClubError("shipping_transaction_mismatch");
    const complete =
      result.status === "SUCCESS" &&
      safeHttps(result.label_url) &&
      result.tracking_number;
    await db.query(
      `UPDATE grim.shipping_labels SET state=$2,transaction_id=$3,label_url=$4,tracking_number=$5,tracking_url=$6 WHERE fulfillment_id=$1`,
      [
        id,
        complete ? "purchased" : "review",
        result.id,
        safeHttps(result.label_url),
        result.tracking_number,
        safeHttps(result.tracking_url),
      ],
    );
    await c.audit(
      db,
      actor,
      complete ? "shipping_label_purchased" : "shipping_label_review",
      id,
      { transaction: result.id },
    );
  });
}
export async function buyOrderLabel(
  c: Grimmunity,
  gateway: ShippingGateway,
  actor: string,
  input: { id: string; quoteId: string; rateId: string; maxAmount: number },
) {
  await transaction(c.pool, async (db) => {
    const f = await readyOrder(c, db, input.id);
    const label = await one<ShippingLabel>(
      db,
      "SELECT * FROM grim.shipping_labels WHERE fulfillment_id=$1 FOR UPDATE",
      [input.id],
    );
    if (!label || label.quote_id !== input.quoteId || label.state !== "quoted")
      throw new ClubError("shipping_label_exists");
    if (c.now().getTime() - label.quoted_at.getTime() > 30 * 60000)
      throw new ClubError("shipping_quote_expired");
    if (
      JSON.stringify(label.address_snapshot) !==
      JSON.stringify(f.address_snapshot)
    )
      throw new ClubError("shipping_address_changed");
    const rate = label.rates.find(
      (r) => r.id === input.rateId && r.currency === "usd",
    );
    if (!rate || rate.amount !== input.maxAmount)
      throw new ClubError("shipping_rate_changed");
    await db.query(
      "UPDATE grim.shipping_labels SET state='purchasing',rate_id=$2,amount=$3 WHERE fulfillment_id=$1",
      [input.id, rate.id, rate.amount],
    );
    await c.audit(db, actor, "shipping_purchase_requested", input.id, {
      rate: rate.id,
      amount: rate.amount,
    });
  });
  // Commit purchase intent before contacting Shippo. Never retry a purchase whose
  // outcome is unknown; doing so can buy duplicate labels after a network timeout.
  try {
    await saveLabel(
      c,
      actor,
      input.id,
      await gateway.buy(input.rateId, `order:${input.id}`),
    );
  } catch {
    await c.pool.query(
      "UPDATE grim.shipping_labels SET state='review' WHERE fulfillment_id=$1 AND state='purchasing'",
      [input.id],
    );
    throw new ClubError("shipping_purchase_review", 503);
  }
}
export async function refreshOrderLabel(
  c: Grimmunity,
  gateway: ShippingGateway,
  actor: string,
  id: string,
  transactionId?: string,
) {
  const label = await one<ShippingLabel>(
    c.pool,
    `SELECT s.* FROM grim.shipping_labels s JOIN grim.fulfillments f ON f.id=s.fulfillment_id
    JOIN grim.memberships m ON m.id=f.membership_id WHERE s.fulfillment_id=$1 AND m.program_id=$2`,
    [id, c.mode],
  );
  const providerId = label?.transaction_id ?? transactionId;
  if (!label || !providerId || label.state === "quoted")
    throw new ClubError("shipping_purchase_review");
  await saveLabel(c, actor, id, await gateway.transaction(providerId));
}
