import { randomUUID } from "node:crypto";
import { lockedProgram, one, transaction } from "./db";
import {
  ClubError,
  addressValid,
  type Address,
  type Membership,
} from "./model";
import type { Grimmunity } from "./service";
import type { ShippingGateway, ShippingRate } from "../shippo";
import { shippingParcel, type Parcel } from "./shipping-profile";
import {
  finishRenewal,
  invoiceFingerprint,
  type BillingCycle,
} from "./renewals";

export type ReplacementIntent = {
  request_key: string;
  original_invoice_id: string;
  replacement_invoice_id: string | null;
  membership_id: string;
  state: "preparing" | "prepared" | "review";
  address: Address;
  parcel: Parcel;
  rate: ShippingRate;
  period_start: Date;
  period_end: Date;
  base_start: Date | null;
  base_end: Date | null;
  base_amount: number;
  actor: string;
  note: string;
  created_at: Date;
};
export async function replaceRenewal(
  c: Grimmunity,
  shipping: ShippingGateway,
  actor: string,
  invoiceId: string,
  note: string,
) {
  const context = await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    const cycle = await one<BillingCycle>(
      db,
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1 FOR UPDATE",
      [invoiceId],
    );
    const m =
      cycle &&
      (await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE id=$1 AND program_id=$2",
        [cycle.membership_id, c.mode],
      ));
    if (
      !cycle ||
      !m?.tier_snapshot.billing ||
      !m.subscription_id ||
      cycle.initial
    )
      throw new ClubError("renewal_needs_review");
    const prior = await one<ReplacementIntent>(
      db,
      "SELECT * FROM grim.billing_replacements WHERE original_invoice_id=$1",
      [invoiceId],
    );
    if (prior) {
      if (prior.state === "review")
        throw new ClubError("replacement_needs_review");
      return { p, m, intent: prior };
    }
    if (!["hold", "noticed"].includes(cycle.state))
      throw new ClubError("renewal_needs_review");
    const invoice = await c.billing.invoice(invoiceId, p);
    if (
      invoice.status !== "open" ||
      invoice.amountPaid !== 0 ||
      invoice.adjusted ||
      invoiceFingerprint(invoice) !== cycle.fingerprint
    )
      throw new ClubError("renewal_needs_review");
    const sub = await c.billing.subscription(
      m.subscription_id,
      p,
      m.tier_snapshot,
    );
    if (!sub.validPlan || !["active", "past_due"].includes(sub.status))
      throw new ClubError("renewal_needs_review");
    if (
      await one(
        db,
        "SELECT invoice_id FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='hold' LIMIT 1",
        [m.id],
      )
    )
      throw new ClubError("prepaid_payment_adjustment");
    await c.syncAddress(db, p, m);
    if (!addressValid(m.address, p.countries))
      throw new ClubError("shipping_address_changed");
    const parcel = shippingParcel(m.tier_snapshot),
      key = randomUUID();
    const quote = await shipping.quote(
      m.address!,
      parcel,
      `renewal-replacement:${key}`,
    );
    const rate = quote.rates.find(
      (rate) =>
        rate.carrier.toUpperCase() === "USPS" &&
        /ground advantage/i.test(rate.service),
    );
    if (!rate) throw new ClubError("shipping_quote_failed");
    const base = invoice.lines.find(
      (line) =>
        line.price === m.tier_snapshot.billing!.price_id ||
        line.metadata?.grim_membership_price ===
          m.tier_snapshot.billing!.price_id,
    );
    if ((base?.amount ?? 0) !== cycle.membership_amount)
      throw new ClubError("renewal_needs_review");
    const intent = (await one<ReplacementIntent>(
      db,
      `INSERT INTO grim.billing_replacements(request_key,original_invoice_id,membership_id,state,address,parcel,rate,period_start,period_end,base_start,base_end,base_amount,actor,note,created_at)
      VALUES($1,$2,$3,'preparing',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        key,
        invoiceId,
        m.id,
        m.address,
        parcel,
        rate,
        cycle.period_start,
        cycle.period_end,
        base ? new Date(base.start * 1000) : null,
        base ? new Date(base.end * 1000) : null,
        base?.amount ?? 0,
        actor,
        note,
        c.now(),
      ],
    ))!;
    await db.query(
      "UPDATE grim.billing_cycles SET state='hold',hold_reason='replacement_pending' WHERE invoice_id=$1",
      [invoiceId],
    );
    await db.query(
      "UPDATE grim.outbox SET state='review' WHERE id=$1 AND state='pending'",
      [cycle.notice_id],
    );
    await c.audit(db, actor, "renewal_replacement_requested", invoiceId, {
      request: key,
      note,
      shipping: rate.amount,
    });
    return { p, m, intent };
  });
  let replacement: string;
  try {
    replacement = await c.billing.managed!.replace(
      context.p,
      context.m,
      context.intent,
    );
  } catch (error) {
    // Retain the durable intent for idempotent recovery. A paid original or an
    // uncertain old request always needs operator review before another invoice.
    if (error instanceof ClubError && error.code === "replacement_needs_review")
      await c.pool.query(
        "UPDATE grim.billing_replacements SET state='review' WHERE request_key=$1",
        [context.intent.request_key],
      );
    throw error;
  }
  await transaction(c.pool, async (db) => {
    await lockedProgram(db, c.mode);
    const intent = (await one<ReplacementIntent>(
      db,
      "SELECT * FROM grim.billing_replacements WHERE request_key=$1 FOR UPDATE",
      [context.intent.request_key],
    ))!;
    if (
      intent.replacement_invoice_id &&
      intent.replacement_invoice_id !== replacement
    )
      throw new ClubError("replacement_needs_review");
    await db.query(
      "UPDATE grim.billing_cycles SET state='canceled',hold_reason='replaced_after_review' WHERE invoice_id=$1",
      [invoiceId],
    );
    await db.query(
      "UPDATE grim.billing_replacements SET replacement_invoice_id=$2,state='prepared' WHERE request_key=$1",
      [intent.request_key, replacement],
    );
    await db.query(
      `INSERT INTO grim.billing_cycles(invoice_id,membership_id,period_start,period_end,state,address_snapshot,parcel,rate)
      VALUES($1,$2,$3,$4,'preparing',$5,$6,$7) ON CONFLICT(invoice_id) DO NOTHING`,
      [
        replacement,
        intent.membership_id,
        intent.period_start,
        intent.period_end,
        intent.address,
        intent.parcel,
        intent.rate,
      ],
    );
  });
  await finishRenewal(c, replacement);
  return replacement;
}
