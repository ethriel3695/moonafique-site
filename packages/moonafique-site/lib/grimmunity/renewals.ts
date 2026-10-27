import { createHash, randomUUID } from "node:crypto";
import { noticeBody, plannedChargeDate } from "./billing-notice";
import type { ReplacementIntent } from "./renewal-replacement";
import { one, transaction, lockedProgram, type DB } from "./db";
import {
  ClubError,
  addressValid,
  dateLabel,
  type Address,
  type Invoice,
  type Membership,
  type Program,
  type Reservation,
} from "./model";
import type { Grimmunity } from "./service";
import type { ShippingGateway, ShippingRate } from "../shippo";
import { shippingParcel, type Parcel } from "./shipping-profile";
import type { ShippingQuote } from "./shipping";

const DAY = 86400000;
export type BillingCycle = {
  invoice_id: string;
  membership_id: string;
  initial: boolean;
  period_start: Date;
  period_end: Date;
  state:
    | "initial"
    | "preparing"
    | "noticed"
    | "paying"
    | "paid"
    | "hold"
    | "canceled";
  address_snapshot: Address;
  parcel: Parcel;
  rate: ShippingRate | null;
  membership_amount: number | null;
  shipping_amount: number | null;
  tax_amount: number | null;
  total: number | null;
  fingerprint: string | null;
  invoice_url: string | null;
  notice_id: string | null;
  notice_version: number;
  charge_at: Date | null;
  attempted_at: Date | null;
  coverage_invoice_id: string | null;
  hold_reason: string | null;
};
export type Coverage = {
  invoice_id: string;
  membership_id: string;
  period_start: Date;
  period_end: Date;
  amount: number;
  price_id: string;
  financial_state: "paid" | "hold";
};
export function sameAddress(a: Address | null, b: Address | null) {
  return (
    !!a &&
    !!b &&
    (
      [
        "name",
        "line1",
        "line2",
        "city",
        "state",
        "postal_code",
        "country",
      ] as const
    ).every((key) => a[key] === b[key])
  );
}
export function invoiceFingerprint(i: Invoice) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: i.id,
        customer: i.customer,
        subscription: i.subscription,
        currency: i.currency,
        total: i.total,
        amountDue: i.amountDue,
        tax: i.taxExclusive,
        excluding: i.totalExcludingTax,
        automaticTax: i.automaticTaxComplete,
        autoAdvance: i.autoAdvance,
        method: i.collectionMethod,
        adjusted: i.adjusted,
        metadata: Object.entries(i.metadata ?? {}).sort(),
        lines: i.lines
          .map((line) => ({
            invoice: line.invoice,
            price: line.price,
            product: line.product,
            quantity: line.quantity,
            amount: line.amount,
            currency: line.currency,
            start: line.start,
            end: line.end,
            recurring: line.recurring,
            proration: line.proration,
            metadata: Object.entries(line.metadata ?? {}).sort(),
          }))
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      }),
    )
    .digest("hex");
}
export function deliveryLine(c: Grimmunity, p: Program, i: Invoice) {
  return i.lines.find(
    (line) => line.product === c.billing.managed?.deliveryProduct(p.id),
  );
}
function invoiceProblem(
  c: Grimmunity,
  p: Program,
  m: Membership,
  i: Invoice,
  rate: ShippingRate,
  replacement?: ReplacementIntent,
) {
  const replaced =
    replacement?.replacement_invoice_id === i.id &&
    i.metadata?.grim_replacement === replacement.request_key;
  const billing = m.tier_snapshot.billing;
  if (
    !billing ||
    !c.billing.managed ||
    i.customer !== m.customer_id ||
    i.subscription !== m.subscription_id ||
    i.livemode !== (p.id === "live")
  )
    return "invoice_identity_mismatch";
  if (
    i.autoAdvance !== false ||
    i.collectionMethod !== "send_invoice" ||
    i.adjusted ||
    ![
      "subscription_create",
      "subscription_cycle",
      ...(replaced ? ["manual"] : []),
    ].includes(i.reason ?? "")
  )
    return "unsupported_managed_invoice";
  const delivery = deliveryLine(c, p, i);
  const base = i.lines.filter(
    (line) =>
      (line.price === billing.price_id ||
        (replaced &&
          line.metadata?.grim_membership_price === billing.price_id)) &&
      line.product === m.tier_snapshot.product_id,
  );
  const shipping = i.lines.filter(
    (line) => line.product === c.billing.managed!.postageProduct(p.id),
  );
  if (
    !delivery ||
    (!delivery.recurring &&
      !(
        replaced &&
        delivery.metadata?.grim_delivery === replacement!.request_key
      )) ||
    delivery.quantity !== 1 ||
    delivery.amount !== 0 ||
    i.lines.filter((line) => line.product === delivery.product).length !== 1 ||
    base.length > 1 ||
    shipping.length !== 1 ||
    i.lines.length !== 2 + base.length ||
    i.lines.some(
      (line) =>
        line.proration ||
        line.currency !== p.currency ||
        line.invoice !== i.id ||
        line.quantity !== 1,
    )
  )
    return "unexpected_invoice_lines";
  const days = (delivery.end - delivery.start) / 86400;
  if (days < 27 || days > 32 || delivery.start <= 0)
    return "unexpected_billing_period";
  if (
    base.length &&
    ((!base[0].recurring &&
      !(
        replaced && base[0].metadata?.grim_membership_price === billing.price_id
      )) ||
      base[0].amount !== billing.amount ||
      base[0].start !== delivery.start ||
      base[0].end < delivery.end ||
      (base[0].end - base[0].start) / 86400 <
        (billing.months === 1 ? 27 : billing.months === 6 ? 180 : 365) ||
      (base[0].end - base[0].start) / 86400 >
        (billing.months === 1 ? 32 : billing.months === 6 ? 185 : 366))
  )
    return "unexpected_membership_period";
  if (
    replaced &&
    (delivery.start !== replacement!.period_start.getTime() / 1000 ||
      delivery.end !== replacement!.period_end.getTime() / 1000 ||
      (base[0]?.amount ?? 0) !== replacement!.base_amount ||
      (base[0] &&
        (base[0].start !== (replacement!.base_start?.getTime() ?? 0) / 1000 ||
          base[0].end !== (replacement!.base_end?.getTime() ?? 0) / 1000)))
  )
    return "unexpected_replacement_period";
  if (
    shipping[0].recurring ||
    shipping[0].amount !== rate.amount ||
    rate.amount <= 0 ||
    rate.currency !== p.currency
  )
    return "shipping_amount_changed";
  const subtotal = (base[0]?.amount ?? 0) + rate.amount;
  const tax = p.tax_mode === "exclusive" ? i.taxExclusive : 0;
  if (p.tax_mode !== "not_collecting" && !i.automaticTaxComplete)
    return "tax_calculation_incomplete";
  if (
    !Number.isSafeInteger(tax) ||
    tax! < 0 ||
    (p.tax_mode === "exclusive" && i.totalExcludingTax !== subtotal) ||
    i.currency !== p.currency ||
    i.total !== subtotal + tax! ||
    i.amountDue !== i.total
  )
    return "payment_amount_or_adjustment";
  return null;
}
async function hold(
  c: Grimmunity,
  db: DB,
  m: Membership,
  invoice: string,
  reason: string,
) {
  await db.query(
    "UPDATE grim.billing_cycles SET state='hold',hold_reason=$2 WHERE invoice_id=$1 AND state NOT IN ('paid','canceled')",
    [invoice, reason],
  );
  await c.exception(db, `renewal:${invoice}`, reason, m, invoice);
}

export async function recordInitial(
  c: Grimmunity,
  db: DB,
  p: Program,
  m: Membership,
  r: Reservation,
  invoiceId: string,
) {
  const quote = await one<ShippingQuote>(
    db,
    "SELECT * FROM grim.shipping_quotes WHERE id=$1",
    [r.shipping_quote_id],
  );
  if (!quote || !sameAddress(quote.address, r.shipping_address ?? null))
    throw new ClubError("shipping_quote_required");
  const invoice = await c.billing.managed!.prepare(
    p,
    m,
    invoiceId,
    quote.rate,
    true,
  );
  const problem = invoiceProblem(c, p, m, invoice, quote.rate);
  if (problem) throw new ClubError(problem);
  const line = deliveryLine(c, p, invoice)!;
  if (
    !invoice.lines.some(
      (line) => line.price === m.tier_snapshot.billing!.price_id,
    )
  )
    throw new ClubError("membership_payment_required");
  await db.query(
    `INSERT INTO grim.billing_cycles(invoice_id,membership_id,initial,period_start,period_end,state,address_snapshot,parcel,rate,membership_amount,shipping_amount,tax_amount,total,fingerprint,invoice_url)
    VALUES($1,$2,true,$3,$4,'initial',$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(invoice_id) DO NOTHING`,
    [
      invoiceId,
      m.id,
      new Date(line.start * 1000),
      new Date(line.end * 1000),
      quote.address,
      quote.parcel,
      quote.rate,
      m.tier_snapshot.billing!.amount,
      quote.rate.amount,
      invoice.taxExclusive ?? 0,
      invoice.total,
      invoiceFingerprint(invoice),
      invoice.hostedUrl ?? null,
    ],
  );
}

export async function reviewCoverage(
  c: Grimmunity,
  db: DB,
  m: Membership,
  i: Invoice,
) {
  if (i.status !== "paid" || (i.financialState === "paid" && !i.adjusted))
    return;
  await db.query(
    "UPDATE grim.prepaid_periods SET financial_state='hold' WHERE invoice_id=$1",
    [i.id],
  );
  await db.query(
    "UPDATE grim.entitlements SET financial_state='review',review_reason=COALESCE(review_reason,'prepaid_payment_adjustment') WHERE coverage_invoice_id=$1",
    [i.id],
  );
  await db.query(
    "UPDATE grim.fulfillments SET state='hold' WHERE invoice_id IN (SELECT invoice_id FROM grim.entitlements WHERE coverage_invoice_id=$1) AND state<>'shipped'",
    [i.id],
  );
  await db.query(
    "UPDATE grim.billing_cycles SET state='hold',hold_reason='prepaid_payment_adjustment' WHERE membership_id=$1 AND state IN ('preparing','noticed')",
    [m.id],
  );
  await c.exception(
    db,
    `coverage:${i.id}`,
    "Prepaid payment was refunded, disputed, or adjusted. Review remaining deliveries and charges.",
    m,
    i.id,
  );
}

export async function managedPayment(
  c: Grimmunity,
  db: DB,
  p: Program,
  m: Membership,
  i: Invoice,
  release = false,
) {
  const cycle = await one<BillingCycle>(
    db,
    "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1 AND membership_id=$2",
    [i.id, m.id],
  );
  if (!cycle?.rate || !cycle.fingerprint)
    return { reason: "unknown_shipping_cycle", coverage: null };
  if (!sameAddress(m.address, cycle.address_snapshot))
    return { reason: "shipping_address_changed", coverage: null };
  if (
    !release &&
    cycle.state === "hold" &&
    cycle.hold_reason !== "payment_needs_attention"
  )
    return {
      reason: cycle.hold_reason ?? "renewal_needs_review",
      coverage: null,
    };
  const replacement = await one<ReplacementIntent>(
    db,
    "SELECT * FROM grim.billing_replacements WHERE replacement_invoice_id=$1 AND membership_id=$2",
    [i.id, m.id],
  );
  const problem = invoiceProblem(c, p, m, i, cycle.rate, replacement);
  if (
    problem ||
    invoiceFingerprint(i) !== cycle.fingerprint ||
    i.amountPaid !== i.total ||
    !i.paymentVerified ||
    i.financialState !== "paid"
  )
    return {
      reason: problem ?? "payment_amount_or_adjustment",
      coverage: null,
    };
  const line = deliveryLine(c, p, i)!;
  if (!i.paidAt || i.paidAt < line.start)
    return { reason: "unexpected_billing_period", coverage: null };
  const base = i.lines.find(
    (line) =>
      line.price === m.tier_snapshot.billing!.price_id ||
      (replacement &&
        line.metadata?.grim_membership_price ===
          m.tier_snapshot.billing!.price_id),
  );
  let coverage: Coverage | undefined;
  if (base) {
    await db.query(
      `INSERT INTO grim.prepaid_periods(invoice_id,membership_id,period_start,period_end,amount,price_id,financial_state)
      VALUES($1,$2,$3,$4,$5,$6,'paid') ON CONFLICT(invoice_id) DO NOTHING`,
      [
        i.id,
        m.id,
        new Date(base.start * 1000),
        new Date(base.end * 1000),
        base.amount,
        m.tier_snapshot.billing!.price_id,
      ],
    );
    coverage = await one<Coverage>(
      db,
      "SELECT * FROM grim.prepaid_periods WHERE invoice_id=$1",
      [i.id],
    );
    if (release && coverage?.financial_state === "hold") {
      await db.query(
        "UPDATE grim.prepaid_periods SET financial_state='paid' WHERE invoice_id=$1",
        [i.id],
      );
      coverage.financial_state = "paid";
    }
  } else
    coverage = await one<Coverage>(
      db,
      `SELECT * FROM grim.prepaid_periods WHERE membership_id=$1 AND (financial_state='paid' OR $4) AND period_start<=$2 AND period_end>=$3 ORDER BY period_start DESC LIMIT 1`,
      [m.id, cycle.period_start, cycle.period_end, release],
    );
  if (!coverage || (!release && coverage.financial_state !== "paid"))
    return { reason: "membership_payment_required", coverage: null };
  // A missed refund webhook must not permit an extra prepaid delivery.
  if (coverage.invoice_id !== i.id) {
    const paid = await c.billing.invoice(coverage.invoice_id, p);
    if (
      paid.status !== "paid" ||
      paid.financialState !== "paid" ||
      paid.adjusted ||
      !paid.paymentVerified
    ) {
      await reviewCoverage(c, db, m, paid);
      return { reason: "prepaid_payment_adjustment", coverage: null };
    }
  }
  if (release)
    await db.query(
      "UPDATE grim.prepaid_periods SET financial_state='paid' WHERE invoice_id=$1",
      [coverage.invoice_id],
    );
  await db.query(
    "UPDATE grim.billing_cycles SET state='paid',coverage_invoice_id=$2,hold_reason=NULL WHERE invoice_id=$1",
    [i.id, coverage.invoice_id],
  );
  await db.query(
    "UPDATE grim.outbox SET state='review' WHERE id=$1 AND state='pending'",
    [cycle.notice_id],
  );
  return { reason: null, coverage: coverage.invoice_id };
}

async function queueNotice(
  c: Grimmunity,
  db: DB,
  p: Program,
  m: Membership,
  cycle: BillingCycle,
) {
  const at = plannedChargeDate(c.now());
  const edition = await one<import("./model").Edition>(
    db,
    "SELECT * FROM grim.editions WHERE program_id=$1 AND period_open<=$2 AND period_close>$2",
    [c.mode, cycle.period_start],
  );
  if (
    !edition ||
    ["draft", "vaulted"].includes(edition.state) ||
    at >= edition.payment_cutoff
  )
    return hold(c, db, m, cycle.invoice_id, "edition_not_ready_for_payment");
  const message = randomUUID(),
    version = cycle.notice_version + 1;
  await db.query(
    `INSERT INTO grim.outbox(id,program_id,membership_id,dedupe_key,subject,body) VALUES($1,$2,$3,$4,$5,$6)`,
    [
      message,
      p.id,
      m.id,
      `${p.id}:renewal:${cycle.invoice_id}:${version}`,
      `Your ${m.tier_snapshot.name} total for ${dateLabel(at)}`,
      noticeBody(p, m, cycle, at),
    ],
  );
  await db.query(
    "UPDATE grim.billing_cycles SET state='noticed',notice_id=$2,notice_version=$3,charge_at=$4,hold_reason=NULL WHERE invoice_id=$1",
    [cycle.invoice_id, message, version, at],
  );
}

export async function prepareRenewal(
  c: Grimmunity,
  shipping: ShippingGateway,
  membershipId: string,
  invoiceId: string,
) {
  const context = await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    const m = await one<Membership>(
      db,
      "SELECT * FROM grim.memberships WHERE id=$1 AND program_id=$2 FOR UPDATE",
      [membershipId, c.mode],
    );
    if (!m?.tier_snapshot.billing || !m.subscription_id || !m.customer_id)
      return;
    const existing = await one<BillingCycle>(
      db,
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [invoiceId],
    );
    if (existing && (existing.state !== "preparing" || existing.rate)) return;
    const sub = await c.billing.subscription(
      m.subscription_id,
      p,
      m.tier_snapshot,
    );
    if (!sub.validPlan || !["active", "past_due"].includes(sub.status))
      return hold(c, db, m, invoiceId, "renewal_needs_review");
    await c.syncAddress(db, p, m);
    if (!addressValid(m.address, p.countries))
      return hold(c, db, m, invoiceId, "shipping_address_changed");
    const invoice = await c.billing.invoice(invoiceId, p),
      line = deliveryLine(c, p, invoice);
    if (!line || invoice.status !== "draft")
      return hold(c, db, m, invoiceId, "renewal_needs_review");
    if (
      !existing &&
      (await one(
        db,
        "SELECT invoice_id FROM grim.billing_cycles WHERE membership_id=$1 AND period_start=$2 AND state<>'canceled' LIMIT 1",
        [m.id, new Date(line.start * 1000)],
      ))
    )
      throw new ClubError("duplicate_shipping_cycle");
    if (
      await one(
        db,
        "SELECT invoice_id FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='hold' LIMIT 1",
        [m.id],
      )
    )
      return hold(c, db, m, invoiceId, "prepaid_payment_adjustment");
    if (
      sub.cancelAtPeriodEnd &&
      !(await one(
        db,
        "SELECT invoice_id FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='paid' AND period_end>=$2 LIMIT 1",
        [m.id, new Date(line.end * 1000)],
      ))
    )
      return;
    const edition = await one<import("./model").Edition>(
      db,
      "SELECT * FROM grim.editions WHERE program_id=$1 AND period_open<=$2 AND period_close>$2",
      [c.mode, new Date(line.start * 1000)],
    );
    if (
      !edition ||
      ["draft", "vaulted"].includes(edition.state) ||
      plannedChargeDate(c.now()) >= edition.payment_cutoff
    )
      return hold(c, db, m, invoiceId, "edition_not_ready_for_payment");
    const parcel = shippingParcel(m.tier_snapshot);
    if (!existing)
      await db.query(
        `INSERT INTO grim.billing_cycles(invoice_id,membership_id,period_start,period_end,state,address_snapshot,parcel)
      VALUES($1,$2,$3,$4,'preparing',$5,$6)`,
        [
          invoiceId,
          m.id,
          new Date(line.start * 1000),
          new Date(line.end * 1000),
          m.address,
          parcel,
        ],
      );
    return { m, parcel };
  });
  if (!context) return;
  // A quote failure is durable and visible. Retrying a quote cannot charge a
  // customer or buy postage, so the next worker may safely try it again.
  try {
    const result = await shipping.quote(
      context.m.address!,
      context.parcel,
      `renewal:${invoiceId}`,
    );
    const rate = result.rates.find(
      (rate) =>
        rate.carrier.toUpperCase() === "USPS" &&
        /ground advantage/i.test(rate.service),
    );
    if (!rate) throw new ClubError("shipping_quote_failed");
    await transaction(c.pool, async (db) => {
      await lockedProgram(db, c.mode);
      await db.query(
        "UPDATE grim.billing_cycles SET rate=$2,hold_reason=NULL WHERE invoice_id=$1 AND state='preparing' AND rate IS NULL",
        [invoiceId, rate],
      );
      await db.query(
        "UPDATE grim.exceptions SET resolved_at=$2,resolution='Shipping quote recovered' WHERE dedupe_key=$1 AND reason LIKE 'Shipping quote failed.%'",
        [`${c.mode}:renewal:${invoiceId}`, c.now()],
      );
    });
  } catch {
    await transaction(c.pool, async (db) => {
      await lockedProgram(db, c.mode);
      await db.query(
        "UPDATE grim.billing_cycles SET hold_reason='shipping_quote_failed' WHERE invoice_id=$1 AND state='preparing'",
        [invoiceId],
      );
      await c.exception(
        db,
        `renewal:${invoiceId}`,
        "Shipping quote failed. No notice or automatic charge can proceed until a rate is available.",
        context.m,
        invoiceId,
      );
    });
  }
}

export async function finishRenewal(c: Grimmunity, invoiceId: string) {
  await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    const cycle = await one<BillingCycle>(
      db,
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1 FOR UPDATE",
      [invoiceId],
    );
    if (!cycle || cycle.state !== "preparing") return;
    const m = (await one<Membership>(
      db,
      "SELECT * FROM grim.memberships WHERE id=$1",
      [cycle.membership_id],
    ))!;
    if (!m.tier_snapshot.billing || m.program_id !== c.mode)
      throw new ClubError("invoice_identity_mismatch");
    if (!cycle.rate) return;
    const i = await c.billing.managed!.prepare(p, m, invoiceId, cycle.rate);
    const replacement = await one<ReplacementIntent>(
      db,
      "SELECT * FROM grim.billing_replacements WHERE replacement_invoice_id=$1 AND membership_id=$2",
      [i.id, m.id],
    );
    const problem = invoiceProblem(c, p, m, i, cycle.rate, replacement);
    if (problem || i.status !== "open")
      return hold(c, db, m, invoiceId, problem ?? "unexpected_invoice_state");
    const base = i.lines.find(
      (line) =>
        line.price === m.tier_snapshot.billing!.price_id ||
        (replacement &&
          line.metadata?.grim_membership_price ===
            m.tier_snapshot.billing!.price_id),
    );
    if (
      !base &&
      !(await one(
        db,
        "SELECT invoice_id FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='paid' AND period_start<=$2 AND period_end>=$3 LIMIT 1",
        [m.id, cycle.period_start, cycle.period_end],
      ))
    )
      return hold(c, db, m, invoiceId, "membership_payment_required");
    await db.query(
      "UPDATE grim.billing_cycles SET membership_amount=$2,shipping_amount=$3,tax_amount=$4,total=$5,fingerprint=$6,invoice_url=$7 WHERE invoice_id=$1",
      [
        invoiceId,
        base?.amount ?? 0,
        cycle.rate.amount,
        i.taxExclusive ?? 0,
        i.total,
        invoiceFingerprint(i),
        i.hostedUrl ?? null,
      ],
    );
    Object.assign(cycle, {
      membership_amount: base?.amount ?? 0,
      shipping_amount: cycle.rate.amount,
      tax_amount: i.taxExclusive ?? 0,
      total: i.total,
      fingerprint: invoiceFingerprint(i),
    });
    await queueNotice(c, db, p, m, cycle);
  });
}

export async function collectRenewal(
  c: Grimmunity,
  invoiceId: string,
  approved: boolean,
) {
  const ready = await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    const cycle = await one<BillingCycle>(
      db,
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1 FOR UPDATE",
      [invoiceId],
    );
    if (!cycle || cycle.initial || !["noticed", "paying"].includes(cycle.state))
      return false;
    const m = await one<Membership>(
      db,
      "SELECT * FROM grim.memberships WHERE id=$1 AND program_id=$2",
      [cycle.membership_id, c.mode],
    );
    if (!m?.subscription_id || !m.tier_snapshot.billing)
      throw new ClubError("invoice_identity_mismatch");
    const i = await c.billing.invoice(invoiceId, p);
    if (i.status === "paid") return false; // Reconciler applies the authoritative paid invoice.
    if (cycle.state === "paying")
      return hold(c, db, m, invoiceId, "payment_outcome_needs_review");
    if (
      i.status !== "open" ||
      i.amountPaid !== 0 ||
      i.autoAdvance !== false ||
      invoiceFingerprint(i) !== cycle.fingerprint
    )
      return hold(c, db, m, invoiceId, "invoice_changed_after_notice");
    await c.syncAddress(db, p, m);
    if (!sameAddress(m.address, cycle.address_snapshot))
      return hold(c, db, m, invoiceId, "shipping_address_changed");
    const s = await c.billing.subscription(
      m.subscription_id,
      p,
      m.tier_snapshot,
    );
    if (!s.validPlan || !["active", "past_due"].includes(s.status))
      return hold(c, db, m, invoiceId, "subscription_changed_after_notice");
    const edition = await one<import("./model").Edition>(
      db,
      "SELECT * FROM grim.editions WHERE program_id=$1 AND period_open<=$2 AND period_close>$2",
      [c.mode, cycle.period_start],
    );
    if (
      !edition ||
      ["draft", "vaulted"].includes(edition.state) ||
      c.now() >= edition.payment_cutoff
    )
      return hold(c, db, m, invoiceId, "edition_not_ready_for_payment");
    const coverage = await one<Coverage>(
      db,
      "SELECT * FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='paid' AND period_start<=$2 AND period_end>=$3 ORDER BY period_start DESC LIMIT 1",
      [m.id, cycle.period_start, cycle.period_end],
    );
    if (s.cancelAtPeriodEnd && !coverage)
      return hold(c, db, m, invoiceId, "membership_renewal_canceled");
    if (cycle.membership_amount === 0 && !coverage)
      return hold(c, db, m, invoiceId, "membership_payment_required");
    if (
      await one(
        db,
        "SELECT invoice_id FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='hold' LIMIT 1",
        [m.id],
      )
    )
      return hold(c, db, m, invoiceId, "prepaid_payment_adjustment");
    if (coverage) {
      const paid = await c.billing.invoice(coverage.invoice_id, p);
      if (
        paid.financialState !== "paid" ||
        paid.adjusted ||
        !paid.paymentVerified ||
        paid.status !== "paid"
      ) {
        await reviewCoverage(c, db, m, paid);
        return hold(c, db, m, invoiceId, "prepaid_payment_adjustment");
      }
    }
    const notice = await one<{
      delivered_at: Date | null;
      delivery_failed_at: Date | null;
    }>(
      db,
      "SELECT delivered_at,delivery_failed_at FROM grim.outbox WHERE id=$1 AND state='sent'",
      [cycle.notice_id],
    );
    if (notice?.delivery_failed_at)
      return hold(c, db, m, invoiceId, "renewal_notice_delivery_failed");
    if (!notice?.delivered_at) return false;
    if (
      !cycle.charge_at ||
      notice.delivered_at.getTime() + 7 * DAY > cycle.charge_at.getTime() ||
      c.now().getTime() > cycle.charge_at.getTime() + DAY
    ) {
      await queueNotice(c, db, p, m, cycle);
      return false;
    }
    if (
      !approved ||
      c.now() < cycle.charge_at ||
      c.now().getTime() < notice.delivered_at.getTime() + 7 * DAY
    )
      return false;
    await db.query(
      "UPDATE grim.billing_cycles SET state='paying',attempted_at=$2 WHERE invoice_id=$1",
      [invoiceId, c.now()],
    );
    await c.audit(db, "renewal_worker", "payment_requested", invoiceId, {
      total: cycle.total,
      notice: cycle.notice_id,
    });
    return cycle.notice_version;
  });
  if (!ready) return;
  // The payment intent is durable before external I/O; ambiguous attempts never
  // automatically retry. Invoice reconciliation can still confirm a success.
  try {
    await c.billing.managed!.pay(invoiceId, ready);
    await c.reconcileInvoice(invoiceId);
  } catch {
    await transaction(c.pool, async (db) => {
      const p = await lockedProgram(db, c.mode);
      const cycle = await one<BillingCycle>(
        db,
        "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
        [invoiceId],
      );
      const m =
        cycle &&
        (await one<Membership>(
          db,
          "SELECT * FROM grim.memberships WHERE id=$1",
          [cycle.membership_id],
        ));
      if (!m || m.program_id !== p.id) return;
      const invoice = await c.billing.invoice(invoiceId, p);
      if (invoice.status === "paid") return;
      await hold(c, db, m, invoiceId, "payment_needs_attention");
      await c.notify(
        db,
        m,
        `renewal-payment:${invoiceId}`,
        "Your membership payment needs attention",
        "We could not confirm your payment. Open your membership account to review the invoice and complete payment authentication. We will not automatically retry this charge.",
      );
    });
  }
}

export async function cancelManaged(
  c: Grimmunity,
  owner: string,
  membershipId: string,
) {
  await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    const m = await one<Membership>(
      db,
      "SELECT * FROM grim.memberships WHERE id=$1 AND owner_id=$2 AND program_id=$3 FOR UPDATE",
      [membershipId, owner, c.mode],
    );
    if (!m?.tier_snapshot.billing || !m.subscription_id)
      throw new ClubError("membership_not_found", 404);
    const coverage = await one<{ ending: Date | null }>(
      db,
      "SELECT max(period_end) AS ending FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='paid'",
      [m.id],
    );
    const end = coverage?.ending ?? c.now();
    // Cancel only renewal of the membership. Prepaid deliveries and their
    // monthly postage continue through the paid coverage, without proration.
    const cycles = (
      await db.query<BillingCycle>(
        "SELECT * FROM grim.billing_cycles WHERE membership_id=$1 AND period_start>=$2 AND state NOT IN ('paid','canceled') FOR UPDATE",
        [m.id, end],
      )
    ).rows;
    for (const cycle of cycles) {
      if (!(await c.billing.managed!.void(cycle.invoice_id)))
        throw new ClubError("cancel_payment_review");
      await db.query(
        "UPDATE grim.billing_cycles SET state='canceled' WHERE invoice_id=$1",
        [cycle.invoice_id],
      );
      await db.query(
        "UPDATE grim.outbox SET state='review' WHERE id=$1 AND state='pending'",
        [cycle.notice_id],
      );
    }
    await c.billing.managed!.cancel(m.subscription_id, end, c.now());
    await c.syncSubscription(db, p, m.subscription_id);
    await c.audit(db, owner, "renewal_canceled", m.id, {
      paid_until: end.toISOString(),
    });
  });
}

export async function reissueNotice(
  c: Grimmunity,
  actor: string,
  invoiceId: string,
  note: string,
) {
  await transaction(c.pool, async (db) => {
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
      cycle.initial ||
      !["hold", "noticed"].includes(cycle.state)
    )
      throw new ClubError("renewal_needs_review");
    const invoice = await c.billing.invoice(invoiceId, p);
    await c.syncAddress(db, p, m);
    const sub = await c.billing.subscription(
      m.subscription_id,
      p,
      m.tier_snapshot,
    );
    if (
      !cycle.rate ||
      invoice.status !== "open" ||
      invoice.amountPaid !== 0 ||
      !sub.validPlan ||
      !sameAddress(m.address, cycle.address_snapshot) ||
      invoiceFingerprint(invoice) !== cycle.fingerprint ||
      invoiceProblem(
        c,
        p,
        m,
        invoice,
        cycle.rate,
        await one<ReplacementIntent>(
          db,
          "SELECT * FROM grim.billing_replacements WHERE replacement_invoice_id=$1",
          [invoiceId],
        ),
      ) ||
      (await one(
        db,
        "SELECT invoice_id FROM grim.prepaid_periods WHERE membership_id=$1 AND financial_state='hold' LIMIT 1",
        [m.id],
      ))
    )
      throw new ClubError("renewal_needs_review");
    if (cycle.notice_id)
      await db.query(
        "UPDATE grim.outbox SET state='review' WHERE id=$1 AND state='pending'",
        [cycle.notice_id],
      );
    await queueNotice(c, db, p, m, cycle);
    await c.audit(db, actor, "billing_notice_reissued", invoiceId, {
      note,
      previous_notice: cycle.notice_id,
    });
  });
}

export async function runManagedMember(
  c: Grimmunity,
  shipping: ShippingGateway | null,
  m: Membership,
  approved: boolean,
  deadline = Infinity,
) {
  if (!m.tier_snapshot.billing || !c.billing.managed || !m.subscription_id)
    return;
  const pending = await c.billing.managed.pending(m);
  const cycles = (
    await c.pool.query<BillingCycle>(
      "SELECT * FROM grim.billing_cycles WHERE membership_id=$1 AND state NOT IN ('paid','canceled','hold') ORDER BY period_start",
      [m.id],
    )
  ).rows;
  for (const invoiceId of [
    ...new Set([...cycles.map((cycle) => cycle.invoice_id), ...pending]),
  ]) {
    if (Date.now() >= deadline) return;
    let cycle = await one<BillingCycle>(
      c.pool,
      "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
      [invoiceId],
    );
    if (cycle?.initial) {
      await c.reconcileInvoice(invoiceId);
      cycle = await one<BillingCycle>(
        c.pool,
        "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
        [invoiceId],
      );
      if (cycle?.state !== "initial") continue;
      await expireInitialPayments(c, 1, invoiceId);
      continue;
    }
    if (!cycle || (cycle.state === "preparing" && !cycle.rate)) {
      if (!shipping) continue;
      await prepareRenewal(c, shipping, m.id, invoiceId);
      cycle = await one<BillingCycle>(
        c.pool,
        "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1",
        [invoiceId],
      );
    }
    if (!cycle) continue;
    if (cycle.state === "preparing") await finishRenewal(c, invoiceId);
    await c.reconcileInvoice(invoiceId);
    await collectRenewal(c, invoiceId, approved);
    await c.reconcileInvoice(invoiceId);
  }
}

export async function expireInitialPayments(
  c: Grimmunity,
  limit = 1,
  onlyInvoice?: string,
) {
  if (!c.billing.managed) return;
  const rows = (
    await c.pool.query<{ invoice_id: string }>(
      `SELECT b.invoice_id FROM grim.billing_cycles b JOIN grim.memberships m ON m.id=b.membership_id
    JOIN grim.reservations r ON r.membership_id=m.id WHERE m.program_id=$1 AND b.initial AND b.state='initial' AND r.state='converted'
    AND r.expires_at<$2 AND ($3::text IS NULL OR b.invoice_id=$3) ORDER BY r.expires_at LIMIT $4`,
      [
        c.mode,
        new Date(c.now().getTime() - 120000),
        onlyInvoice ?? null,
        limit,
      ],
    )
  ).rows;
  for (const row of rows)
    await transaction(c.pool, async (db) => {
      const p = await lockedProgram(db, c.mode);
      const cycle = await one<BillingCycle>(
        db,
        "SELECT * FROM grim.billing_cycles WHERE invoice_id=$1 FOR UPDATE",
        [row.invoice_id],
      );
      if (cycle?.state !== "initial") return;
      const m = (await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE id=$1",
        [cycle.membership_id],
      ))!;
      if (!(await c.billing.managed!.void(cycle.invoice_id))) {
        await c.applyInvoice(db, p, cycle.invoice_id);
        return;
      }
      await c.billing.managed!.cancel(m.subscription_id!, c.now(), c.now());
      await c.syncSubscription(db, p, m.subscription_id!);
      await db.query(
        "UPDATE grim.billing_cycles SET state='canceled' WHERE invoice_id=$1",
        [cycle.invoice_id],
      );
      await db.query(
        "UPDATE grim.reservations SET state='released' WHERE membership_id=$1 AND state='converted'",
        [m.id],
      );
      await c.audit(
        db,
        "expiry_worker",
        "unpaid_first_invoice_expired",
        cycle.invoice_id,
      );
    });
}
