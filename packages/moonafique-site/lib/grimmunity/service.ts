import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { lockedProgram, one, transaction, type DB } from "./db";
import {
  addressValid,
  checkoutInput,
  ClubError,
  csvCell,
  type BillingGateway,
  type Edition,
  type Fulfillment,
  type Invoice,
  type Membership,
  type Mode,
  type Program,
  type Receipt,
  type Reservation,
  type Session,
} from "./model";

import {
  monthlyAmount,
  tiersSchema,
  tierClub,
  type Tier,
  type TierId,
} from "./tiers";
import type { ShippingQuote } from "./shipping";
import { occupants } from "./capacity";
import {
  recordInitial,
  managedPayment,
  reviewCoverage,
  deliveryLine,
  type BillingCycle,
} from "./renewals";

const terminal = new Set(["canceled", "incomplete_expired"]);
const seconds = (n: number | null) => (n ? new Date(n * 1000) : null);
export const handledEvents = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.updated",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "refund.created",
  "refund.updated",
  "refund.failed",
  "credit_note.created",
  "credit_note.updated",
  "credit_note.voided",
]);

export class Grimmunity {
  constructor(
    public pool: Pool,
    public billing: BillingGateway,
    public mode: Mode,
    public now: () => Date = () => new Date(),
    public allowLiveEnrollment = false,
  ) {}
  async audit(
    db: DB,
    actor: string,
    action: string,
    entity: string,
    detail: object = {},
  ) {
    await db.query(
      "INSERT INTO grim.audit(program_id,actor,action,entity_id,detail) VALUES($1,$2,$3,$4,$5)",
      [this.mode, actor, action, entity, detail],
    );
  }
  async notify(
    db: DB,
    m: Membership,
    key: string,
    subject: string,
    body: string,
  ) {
    await db.query(
      "INSERT INTO grim.outbox(id,program_id,membership_id,dedupe_key,subject,body) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(dedupe_key) DO NOTHING",
      [randomUUID(), this.mode, m.id, `${this.mode}:${key}`, subject, body],
    );
  }
  async exception(
    db: DB,
    key: string,
    reason: string,
    m?: Membership,
    invoice?: string,
  ) {
    await db.query(
      `INSERT INTO grim.exceptions(id,program_id,dedupe_key,membership_id,invoice_id,reason) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(dedupe_key) DO UPDATE SET resolved_at=NULL,resolution=NULL,reason=EXCLUDED.reason`,
      [
        randomUUID(),
        this.mode,
        `${this.mode}:${key}`,
        m?.id ?? null,
        invoice ?? null,
        reason,
      ],
    );
  }
  // Completed billing periods keep their edition commitment even if cancellation arrives before invoice.paid.
  // Future members cannot consume historical edition capacity when an older paid event is delayed.
  async occupants(db: DB, edition: Edition, exclude?: string, tierId?: TierId) {
    return occupants(db, this.mode, edition, exclude, tierId);
  }
  async reserve(
    owner: { id: string; email: string },
    raw: unknown,
  ): Promise<Reservation> {
    const input = checkoutInput.parse(raw);
    return transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      if (
        !p.enabled ||
        (this.mode === "live" && (!p.approved_at || !this.allowLiveEnrollment))
      )
        throw new ClubError("enrollment_closed");
      const tiers = tiersSchema.safeParse(p.tiers);
      if (
        !tiers.success ||
        (this.mode === "live" && p.tiers.some((t) => !t.benefits_confirmed))
      )
        throw new ClubError("tiers_not_ready", 503);
      let tier = p.tiers.find((t) => t.id === input.tierId);
      if (!tier) throw new ClubError("membership_unavailable", 400);
      if (!tier.benefits_confirmed) throw new ClubError("tiers_not_ready", 503);
      if (p.billing_policy === "notice_shipping_v1") {
        const billing = tier.billing_options?.find(
          (option) => option.months === (input.billingMonths ?? 1),
        );
        if (!billing || !this.billing.managed)
          throw new ClubError("billing_not_ready", 503);
        tier = { ...tier, billing };
        if (
          this.mode === "live" &&
          (process.env.GRIM_MANAGED_COLLECTION !== "approved" ||
            process.env.GRIM_SEND_EMAILS !== "approved" ||
            !process.env.GRIM_RESEND_WEBHOOK_SECRET)
        )
          throw new ClubError("billing_not_ready", 503);
      } else if (input.billingMonths && input.billingMonths !== 1)
        throw new ClubError("billing_not_ready", 503);
      if (this.mode === "live" && tier.billing_options && !tier.billing)
        throw new ClubError("billing_not_ready", 503);
      if (tier.id === "grimm_starter" && !input.preferences)
        throw new ClubError("color_preferences_required", 400);
      if (tier.shipping === null && tier.shipping_mode !== "shippo")
        throw new ClubError("shipping_not_ready", 503);
      const edition = await one<Edition>(
        db,
        `SELECT * FROM grim.editions WHERE program_id=$1 AND state='open' AND enrollment_open<=$2 AND enrollment_close>$2 ORDER BY enrollment_open LIMIT 1`,
        [this.mode, this.now()],
      );
      if (
        !edition ||
        edition.enrollment_close.getTime() - this.now().getTime() < 31 * 60000
      )
        throw new ClubError("enrollment_closed");
      if (input.termsVersion !== p.terms_version)
        throw new ClubError("terms_changed");
      if (!p.countries.includes(input.country))
        throw new ClubError("unsupported_destination", 400);
      if (
        edition.tier_allocations
          ? !edition.tier_allocations[tier.id]
          : edition.capacity !== p.member_cap ||
            edition.retained_copies !== p.retained_copies
      )
        throw new ClubError("edition_configuration_mismatch", 503);
      if (
        tier.member_cap !== undefined &&
        (!edition.tier_allocations?.[tier.id] ||
          edition.tier_allocations[tier.id]!.capacity !== tier.member_cap ||
          edition.tier_allocations[tier.id]!.retained_copies !==
            (tier.retained_copies ?? 0))
      )
        throw new ClubError("edition_configuration_mismatch", 503);
      let m = await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE program_id=$1 AND owner_id=$2 AND club=$3",
        [this.mode, owner.id, tierClub(tier)],
      );
      if (!m)
        m = (await one<Membership>(
          db,
          "INSERT INTO grim.memberships(id,program_id,owner_id,email,tier_snapshot) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [randomUUID(), this.mode, owner.id, owner.email, tier],
        ))!;
      const prior = await one<Reservation>(
        db,
        `SELECT * FROM grim.reservations WHERE membership_id=$1 AND (request_key=$2 OR state IN ('creating','open','review')) ORDER BY created_at DESC LIMIT 1`,
        [m.id, input.requestKey],
      );
      if (prior) {
        if (
          prior.tier_snapshot.id !== tier.id ||
          prior.tier_snapshot.billing?.months !== tier.billing?.months
        )
          throw new ClubError("checkout_tier_conflict");
        if (
          ["creating", "open"].includes(prior.state) &&
          prior.edition_id === edition.id
        )
          return prior;
        throw new ClubError(
          prior.state === "converted"
            ? "already_member"
            : "checkout_needs_review",
        );
      }
      if (m.subscription_id || m.seat_held)
        throw new ClubError("already_member");
      const allocation = edition.tier_allocations?.[tier.id];
      const capacity = allocation
        ? allocation.capacity
        : Math.min(p.member_cap, edition.capacity);
      if (
        capacity !== null &&
        (await this.occupants(
          db,
          edition,
          undefined,
          allocation ? tier.id : undefined,
        )) >= capacity
      )
        throw new ClubError("sold_out");
      let quote: ShippingQuote | undefined;
      if (tier.shipping_mode === "shippo") {
        if (!input.shippingQuoteId)
          throw new ClubError("shipping_quote_required", 400);
        quote = await one<ShippingQuote>(
          db,
          "SELECT * FROM grim.shipping_quotes WHERE id=$1 AND program_id=$2 AND owner_id=$3 AND tier_id=$4 FOR UPDATE",
          [input.shippingQuoteId, this.mode, owner.id, tier.id],
        );
        if (
          !quote ||
          quote.expires_at.getTime() < this.now().getTime() + 31 * 60000
        )
          throw new ClubError("shipping_quote_expired");
        if (
          !addressValid(quote.address, p.countries) ||
          !Number.isSafeInteger(quote.rate.amount) ||
          quote.rate.amount <= 0
        )
          throw new ClubError("shipping_quote_failed");
        if (!this.billing.shippingPrice && !tier.billing)
          throw new ClubError("shipping_not_ready", 503);
        tier = {
          ...tier,
          shipping: tier.billing
            ? await this.billing.managed!.postagePrice(p, quote.rate.amount)
            : await this.billing.shippingPrice!(p, quote.rate.amount),
        };
        await db.query(
          "UPDATE grim.memberships SET address=$2,address_valid=true WHERE id=$1",
          [m.id, quote.address],
        );
      }
      await db.query(
        "UPDATE grim.memberships SET tier_snapshot=$2,preferences=$3 WHERE id=$1",
        [m.id, tier, input.preferences ?? null],
      );
      const expiry = new Date(
        Math.min(
          this.now().getTime() + 45 * 60000,
          edition.enrollment_close.getTime(),
        ),
      );
      const r = (await one<Reservation>(
        db,
        `INSERT INTO grim.reservations(id,program_id,membership_id,edition_id,request_key,state,expires_at,created_at,tier_snapshot,preferences,shipping_quote_id,shipping_address) VALUES($1,$2,$3,$4,$5,'creating',$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          randomUUID(),
          this.mode,
          m.id,
          edition.id,
          input.requestKey,
          expiry,
          this.now(),
          tier,
          input.preferences ?? null,
          quote?.id ?? null,
          quote?.address ?? null,
        ],
      ))!;
      await this.audit(db, owner.id, "consent_and_reservation", r.id, {
        terms: p.terms_version,
        tier,
        amount: tier.amount,
        currency: p.currency,
        country: input.country,
      });
      return r;
    });
  }
  async checkout(owner: { id: string; email: string }, raw: unknown) {
    const r = await this.reserve(owner, raw); // Commit durable intent BEFORE Stripe I/O.
    return this.materialize(r.id);
  }
  async materialize(id: string): Promise<string> {
    // Persist the customer mapping before any session can exist. A failed customer commit cannot hide a charge path.
    await transaction(this.pool, async (db) => {
      await lockedProgram(db, this.mode);
      const m = await one<Membership>(
        db,
        `SELECT m.* FROM grim.memberships m JOIN grim.reservations r ON r.membership_id=m.id WHERE r.id=$1 AND r.program_id=$2`,
        [id, this.mode],
      );
      if (!m) throw new ClubError("reservation_not_found", 404);
      if (!m.customer_id)
        await db.query(
          "UPDATE grim.memberships SET customer_id=$2 WHERE id=$1",
          [m.id, await this.billing.createCustomer(m)],
        );
    });
    return transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      if (
        !p.enabled ||
        (this.mode === "live" && (!p.approved_at || !this.allowLiveEnrollment))
      )
        throw new ClubError("enrollment_closed");
      const r = await one<Reservation>(
        db,
        "SELECT * FROM grim.reservations WHERE id=$1 AND program_id=$2",
        [id, this.mode],
      );
      if (!r || !["creating", "open"].includes(r.state))
        throw new ClubError("checkout_needs_review");
      const m = (await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE id=$1",
        [r.membership_id],
      ))!;
      await this.billing.checkConfiguration(p);
      if (!m.customer_id) throw new ClubError("customer_missing");
      let s = r.session_id
        ? await this.billing.session(r.session_id)
        : await this.billing.findSession(m.customer_id, r.id);
      if (!s) {
        // Never recreate an ambiguous request after Stripe's idempotency retention window.
        if (r.expires_at.getTime() - this.now().getTime() < 30 * 60000)
          throw new ClubError("checkout_needs_review");
        s = await this.billing.createSession(p, m, r);
      }
      await this.applySession(db, p, r, s);
      if (s.state === "complete") return "/account/grimmunity";
      if (s.state !== "open" || !s.url) throw new ClubError("checkout_expired");
      return s.url;
    });
  }
  async applySession(db: DB, p: Program, r: Reservation, s: Session) {
    const m = (await one<Membership>(
      db,
      "SELECT * FROM grim.memberships WHERE id=$1",
      [r.membership_id],
    ))!;
    if (
      s.reservation !== r.id ||
      s.customer !== m.customer_id ||
      s.livemode !== (this.mode === "live")
    )
      throw new ClubError("checkout_identity_mismatch");
    if (s.state === "complete" && r.tier_snapshot.billing && s.setupIntent) {
      if (
        m.subscription_id &&
        (await one(
          db,
          "SELECT invoice_id FROM grim.billing_cycles WHERE membership_id=$1 AND initial LIMIT 1",
          [m.id],
        ))
      )
        return;
      if (this.now() > r.expires_at) {
        await db.query(
          "UPDATE grim.reservations SET state='review' WHERE id=$1",
          [r.id],
        );
        await this.exception(
          db,
          `setup-expired:${r.id}`,
          "Card setup completed after the reservation expired. No initial charge was requested; review before continuing.",
          m,
        );
        return;
      }
      const result = await this.billing.managed!.start(p, m, r, s);
      const synced = await this.syncSubscription(db, p, result.subscription);
      if (!synced) throw new ClubError("subscription_identity_mismatch");
      await recordInitial(this, db, p, synced, r, result.invoice);
      await db.query(
        "UPDATE grim.reservations SET session_id=$2,session_url=$3,state='converted' WHERE id=$1",
        [r.id, s.id, s.url],
      );
    } else if (s.state === "complete" && s.subscription) {
      await this.syncSubscription(db, p, s.subscription);
      // No fulfillment is created here: only eligible invoice.paid grants a copy.
      await db.query(
        `UPDATE grim.reservations SET session_id=$2,session_url=$3,state='converted' WHERE id=$1`,
        [r.id, s.id, s.url],
      );
    } else if (s.state === "expired") {
      await db.query(
        `UPDATE grim.reservations SET session_id=$2,state='released',session_url=NULL WHERE id=$1 AND state IN ('creating','open','review')`,
        [r.id, s.id],
      );
    } else {
      await db.query(
        `UPDATE grim.reservations SET session_id=$2,session_url=$3,state='open' WHERE id=$1 AND state IN ('creating','open')`,
        [r.id, s.id, s.url],
      );
    }
  }
  async expireReservations(limit = 100, deadline = Infinity) {
    const rows = (
      await this.pool.query<Reservation>(
        `SELECT * FROM grim.reservations WHERE program_id=$1 AND state IN ('creating','open','review') AND expires_at<=$2 ORDER BY expires_at LIMIT $3`,
        [this.mode, this.now(), Math.max(1, Math.min(limit, 100))],
      )
    ).rows;
    for (const row of rows) {
      if (Date.now() >= deadline) break;
      await transaction(this.pool, async (db) => {
        const p = await lockedProgram(db, this.mode);
        const r = (await one<Reservation>(
          db,
          "SELECT * FROM grim.reservations WHERE id=$1",
          [row.id],
        ))!;
        if (!["creating", "open", "review"].includes(r.state)) return;
        const m = (await one<Membership>(
          db,
          "SELECT * FROM grim.memberships WHERE id=$1",
          [r.membership_id],
        ))!;
        let s = r.session_id
          ? await this.billing.expireSession(r.session_id)
          : m.customer_id
            ? await this.billing.findSession(m.customer_id, r.id)
            : null;
        if (s?.state === "open") s = await this.billing.expireSession(s.id);
        if (s) await this.applySession(db, p, r, s);
        else if (this.now().getTime() > r.expires_at.getTime() + 120000) {
          // A session cannot be created with a past expires_at. The bounded API calls have also elapsed.
          await db.query(
            "UPDATE grim.reservations SET state='released' WHERE id=$1",
            [r.id],
          );
        }
        await this.audit(db, "reconciler", "reservation_checked", r.id);
      });
    }
  }
  async syncAddress(db: DB, p: Program, m: Membership): Promise<Membership> {
    if (!m.customer_id) return m;
    const c = await this.billing.customer(m.customer_id);
    if (c.livemode !== (this.mode === "live"))
      throw new ClubError("mode_mismatch");
    const changed =
      !m.address !== !c.address ||
      (c.address !== null &&
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
        ).some((key) => m.address?.[key] !== c.address?.[key]));
    if (
      changed &&
      m.address &&
      m.tier_snapshot.shipping_mode === "shippo" &&
      !m.tier_snapshot.billing
    )
      await this.exception(
        db,
        `shipping-address:${m.id}`,
        "Delivery address changed after the monthly shipping quote. Confirm the saved shipping fee and new delivery address with the member before packing.",
        m,
      );
    m.address = c.address;
    m.address_valid = addressValid(c.address, p.countries);
    await db.query(
      "UPDATE grim.memberships SET address=$2,address_valid=$3 WHERE id=$1",
      [m.id, m.address, m.address_valid],
    );
    await db.query(
      `UPDATE grim.fulfillments f SET state=$2 FROM grim.entitlements e WHERE f.membership_id=$1 AND f.invoice_id=e.invoice_id AND f.locked_at IS NULL AND e.financial_state='paid' AND e.review_reason IS NULL AND f.state IN ('paid','needs_address')`,
      [m.id, m.address_valid ? "paid" : "needs_address"],
    );
    if (changed) {
      if (m.tier_snapshot.billing) {
        await db.query(
          "UPDATE grim.billing_cycles SET state='hold',hold_reason='shipping_address_changed' WHERE membership_id=$1 AND state IN ('initial','preparing','noticed')",
          [m.id],
        );
        await db.query(
          "UPDATE grim.outbox SET state='review' WHERE id IN (SELECT notice_id FROM grim.billing_cycles WHERE membership_id=$1 AND hold_reason='shipping_address_changed') AND state='pending'",
          [m.id],
        );
        const paid = await db.query(
          "UPDATE grim.fulfillments SET state='hold' WHERE membership_id=$1 AND state<>'shipped' AND invoice_id IN (SELECT invoice_id FROM grim.billing_cycles WHERE membership_id=$1 AND address_snapshot<>$2::jsonb) RETURNING id",
          [m.id, JSON.stringify(m.address)],
        );
        if (paid.rowCount)
          await this.exception(
            db,
            `shipping-address:${m.id}`,
            "Delivery address changed after postage was paid. Review the destination and postage before dispatch.",
            m,
          );
      }
      const locked = await one(
        db,
        `SELECT f.id FROM grim.fulfillments f JOIN grim.editions e ON e.id=f.edition_id WHERE f.membership_id=$1 AND f.state<>'shipped' AND (f.locked_at IS NOT NULL OR (f.ship_by IS NULL AND e.address_cutoff<=$2)) LIMIT 1`,
        [m.id, this.now()],
      );
      if (locked)
        await this.exception(
          db,
          `address:${locked.id}`,
          "Address changed after the address deadline or packing lock. Confirm delivery with the member; any locked packing address is unchanged.",
          m,
        );
      await this.audit(db, "stripe", "address_synchronized", m.id, {
        valid: m.address_valid,
      });
    }
    return m;
  }
  async syncSubscription(
    db: DB,
    p: Program,
    id: string,
  ): Promise<Membership | undefined> {
    // Retrieve inside the lock so old events cannot overwrite current state.
    const saved = await one<Membership>(
      db,
      "SELECT * FROM grim.memberships WHERE subscription_id=$1 AND program_id=$2",
      [id, this.mode],
    );
    let s = await this.billing.subscription(id, p, saved?.tier_snapshot);
    if (s.livemode !== (this.mode === "live"))
      throw new ClubError("mode_mismatch");
    let m = await one<Membership>(
      db,
      "SELECT * FROM grim.memberships WHERE subscription_id=$1 AND program_id=$2",
      [s.id, this.mode],
    );
    if (!m && s.reservation) {
      m = await one<Membership>(
        db,
        `SELECT m.* FROM grim.memberships m JOIN grim.reservations r ON r.membership_id=m.id WHERE r.id::text=$1 AND r.program_id=$2 AND m.customer_id=$3`,
        [s.reservation, this.mode, s.customer],
      );
      if (m?.subscription_id && m.subscription_id !== s.id) {
        await this.exception(
          db,
          `duplicate-sub:${s.id}`,
          "Unexpected second subscription. Review and refund/cancel in Stripe as appropriate.",
          m,
        );
        return undefined;
      }
    }
    if (!m) return undefined;
    if (!saved && m.tier_snapshot.shipping_mode === "shippo")
      s = await this.billing.subscription(id, p, m.tier_snapshot);
    if (m.customer_id !== s.customer)
      throw new ClubError("subscription_identity_mismatch");
    m.subscription_id = s.id;
    m.status = s.status;
    m.seat_held = !terminal.has(s.status);
    m.cancel_at_period_end = s.cancelAtPeriodEnd;
    m.period_start = seconds(s.start);
    m.period_end = seconds(s.end);
    await db.query(
      `UPDATE grim.memberships SET subscription_id=$2,status=$3,seat_held=$4,cancel_at_period_end=$5,period_start=$6,period_end=$7 WHERE id=$1`,
      [
        m.id,
        s.id,
        s.status,
        m.seat_held,
        s.cancelAtPeriodEnd,
        m.period_start,
        m.period_end,
      ],
    );
    if (s.reservation)
      await db.query(
        "UPDATE grim.reservations SET state='converted' WHERE id::text=$1 AND membership_id=$2",
        [s.reservation, m.id],
      );
    if (
      !s.validPlan ||
      s.priceId !==
        (m.tier_snapshot.billing?.price_id ?? m.tier_snapshot.price_id)
    )
      await this.exception(
        db,
        `plan:${s.id}`,
        "Subscription has an unsupported trial, discount, plan, quantity, or schedule. Review in Stripe.",
        m,
      );
    await this.audit(db, "stripe", "subscription_synchronized", s.id, {
      status: s.status,
      cancel_at_period_end: s.cancelAtPeriodEnd,
    });
    return this.syncAddress(db, p, m);
  }
  invoiceProblem(i: Invoice, p: Program, tier: Tier): string | null {
    if (i.status !== "paid") return "unpaid";
    if (!["subscription_create", "subscription_cycle"].includes(i.reason ?? ""))
      return "unexpected_billing_reason";
    if (tier.shipping === null) return "shipping_not_ready";
    const expected = tier.shipping ? [tier, tier.shipping] : [tier];
    if (i.lines.length !== expected.length) return "unexpected_invoice_lines";
    if (i.lines.some((line) => line.proration)) return "proration";
    for (const charge of expected) {
      const matches = i.lines.filter((line) => line.price === charge.price_id);
      if (matches.length !== 1) return "unexpected_recurring_line";
      const line = matches[0];
      if (
        line.invoice !== i.id ||
        line.subscription !== i.subscription ||
        line.product !== charge.product_id ||
        !line.recurring ||
        line.quantity !== 1
      )
        return "unexpected_recurring_line";
      if (line.amount !== charge.amount || line.currency !== p.currency)
        return "payment_amount_or_adjustment";
    }
    const line = i.lines.find((line) => line.price === tier.price_id)!;
    if (
      i.lines.some(
        (other) => other.start !== line.start || other.end !== line.end,
      )
    )
      return "unexpected_billing_period";
    const base = monthlyAmount(tier)!;
    // Accept tax only when Stripe completed the calculation on the authoritative invoice.
    // Line amounts above still have to match the two approved recurring Prices exactly.
    const tax = p.tax_mode === "exclusive" ? i.taxExclusive : 0;
    if (
      p.tax_mode === "exclusive" &&
      (!i.automaticTaxComplete ||
        !Number.isSafeInteger(tax) ||
        tax! < 0 ||
        i.totalExcludingTax !== base)
    )
      return "tax_calculation_incomplete";
    const total = base + (tax ?? 0);
    if (
      i.currency !== p.currency ||
      i.amountPaid !== total ||
      i.amountDue !== total ||
      i.total !== total ||
      !i.paymentVerified ||
      i.adjusted
    )
      return "payment_amount_or_adjustment";
    const days = (line.end - line.start) / 86400;
    if (
      !i.paidAt ||
      line.start <= 0 ||
      days < 27 ||
      days > 32 ||
      i.paidAt < line.start
    )
      return "unexpected_billing_period";
    return null;
  }
  async applyInvoice(db: DB, p: Program, id: string, attention?: string) {
    const i = await this.billing.invoice(id, p);
    if (!i.subscription) return;
    const m = await this.syncSubscription(db, p, i.subscription);
    if (!m) return; // Other subscriptions never acquire Grim entitlements.
    if (
      i.id !== id ||
      i.customer !== m.customer_id ||
      i.livemode !== (this.mode === "live")
    )
      throw new ClubError("invoice_identity_mismatch");
    if (i.status !== "paid") {
      if (attention) {
        await this.exception(db, `payment:${i.id}`, attention, m, i.id);
        await this.notify(
          db,
          m,
          `payment:${i.id}`,
          "Your Grimmunity payment needs attention",
          "Please open your Grimmunity account to update your payment method or complete payment authentication. An unpaid edition will not be packed.",
        );
      }
      return;
    }
    if (m.tier_snapshot.billing) await reviewCoverage(this, db, m, i);
    if (m.tier_snapshot.billing) {
      const linked = await one<{ coverage_invoice_id: string | null }>(
        db,
        "SELECT coverage_invoice_id FROM grim.entitlements WHERE invoice_id=$1",
        [i.id],
      );
      if (linked?.coverage_invoice_id && linked.coverage_invoice_id !== i.id)
        await reviewCoverage(
          this,
          db,
          m,
          await this.billing.invoice(linked.coverage_invoice_id, p),
        );
    }
    await db.query(
      `UPDATE grim.exceptions SET resolved_at=$2,resolution='Payment recovered' WHERE dedupe_key=$1`,
      [`${this.mode}:payment:${i.id}`, this.now()],
    );
    const existing = await one<{
      allocated: boolean;
      review_reason: string | null;
      financial_state: string;
    }>(db, "SELECT * FROM grim.entitlements WHERE invoice_id=$1", [id]);
    // A later event may add a hold, never erase an allocation or automatically release a financial hold.
    if (existing) {
      if (i.financialState !== "paid" || i.adjusted) {
        await db.query(
          `UPDATE grim.entitlements SET financial_state=$2,review_reason=COALESCE(review_reason,'financial_adjustment') WHERE invoice_id=$1`,
          [id, i.financialState === "paid" ? "review" : i.financialState],
        );
        await db.query(
          `UPDATE grim.fulfillments SET state='hold' WHERE invoice_id=$1 AND state<>'shipped'`,
          [id],
        );
        const nextFinancialState =
          i.financialState === "paid" ? "review" : i.financialState;
        if (
          existing.financial_state !== nextFinancialState ||
          !existing.review_reason
        )
          await this.exception(
            db,
            `financial:${id}`,
            "Refund, dispute, or adjustment. Preserve shipped history; review unshipped work.",
            m,
            id,
          );
      }
      return;
    }
    const managed = m.tier_snapshot.billing
      ? await managedPayment(this, db, p, m, i)
      : null;
    let reason = managed
      ? managed.reason
      : this.invoiceProblem(i, p, m.tier_snapshot);
    // Proration-only invoices and unrelated products are not monthly obligations, but remain visible for staff.
    const line =
      (m.tier_snapshot.billing ? deliveryLine(this, p, i) : undefined) ??
      i.lines.find(
        (l) => l.price === m.tier_snapshot.price_id && !l.proration,
      ) ??
      i.lines[0];
    const editions = line
      ? (
          await db.query<Edition>(
            "SELECT * FROM grim.editions WHERE program_id=$1 AND period_open<=$2 AND period_close>$2",
            [this.mode, seconds(line.start)],
          )
        ).rows
      : [];
    const edition = editions.length === 1 ? editions[0] : undefined;
    if (!edition) reason ??= "edition_not_configured";
    if (
      edition &&
      (edition.state === "draft" ||
        edition.state === "vaulted" ||
        !i.paidAt ||
        seconds(i.paidAt)! >= edition.payment_cutoff)
    )
      reason ??= "payment_outside_edition_cutoff";
    if (i.financialState !== "paid") reason ??= "financial_adjustment";
    if (
      edition &&
      (await one(
        db,
        "SELECT invoice_id FROM grim.entitlements WHERE membership_id=$1 AND edition_id=$2 AND allocated",
        [m.id, edition.id],
      ))
    )
      reason ??= "duplicate_edition_payment";
    const allocation = edition?.tier_allocations?.[m.tier_snapshot.id];
    if (m.tier_snapshot.member_cap !== undefined && !allocation)
      reason ??= "edition_configuration_mismatch";
    if (edition?.tier_allocations && !allocation)
      reason ??= "edition_configuration_mismatch";
    const capacity = allocation ? allocation.capacity : edition?.capacity;
    if (
      !reason &&
      edition &&
      capacity !== null &&
      capacity !== undefined &&
      (await this.occupants(
        db,
        edition,
        m.id,
        allocation ? m.tier_snapshot.id : undefined,
      )) >= capacity
    )
      reason = "edition_capacity_exceeded";
    const allocated = !reason && !!edition;
    const quotedPostage = m.tier_snapshot.billing
      ? i.lines.find(
          (line) => line.product === this.billing.managed?.postageProduct(p.id),
        )
      : undefined;
    const savedTier =
      quotedPostage?.price && quotedPostage.product
        ? {
            ...m.tier_snapshot,
            shipping: {
              price_id: quotedPostage.price,
              product_id: quotedPostage.product,
              amount: quotedPostage.amount,
            },
          }
        : m.tier_snapshot;
    await db.query(
      `INSERT INTO grim.entitlements(invoice_id,membership_id,edition_id,amount_paid,currency,period_start,period_end,paid_at,allocated,review_reason,financial_state,tier_snapshot,preferences) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id,
        m.id,
        edition?.id ?? null,
        i.amountPaid,
        i.currency,
        seconds(line?.start),
        seconds(line?.end),
        seconds(i.paidAt),
        allocated,
        reason,
        i.financialState,
        savedTier,
        m.preferences ?? null,
      ],
    );
    if (managed?.coverage)
      await db.query(
        "UPDATE grim.entitlements SET coverage_invoice_id=$2 WHERE invoice_id=$1",
        [id, managed.coverage],
      );
    if (allocated && edition) {
      await db.query(
        `INSERT INTO grim.fulfillments(id,invoice_id,membership_id,edition_id,state,ship_by) VALUES($1,$2,$3,$4,$5,$6)`,
        [
          randomUUID(),
          id,
          m.id,
          edition.id,
          m.address_valid ? "paid" : "needs_address",
          p.fulfillment_lead_days && i.paidAt
            ? new Date((i.paidAt + p.fulfillment_lead_days * 86400) * 1000)
            : null,
        ],
      );
      await this.notify(
        db,
        m,
        `paid:${id}`,
        "Your Grimmunity edition is paid",
        `Your ${edition.title} edition on ${m.tier_snapshot.name} is paid. View dispatch dates and delivery details in your Moonafique membership account. Already-paid editions remain yours if you cancel future renewals.`,
      );
    } else
      await this.exception(
        db,
        `invoice:${id}`,
        reason ?? "review_required",
        m,
        id,
      );
    await this.audit(db, "stripe", "invoice_processed", id, {
      allocated,
      reason,
      tier: m.tier_snapshot.id,
    });
  }
  async process(receipt: Receipt) {
    if (!handledEvents.has(receipt.type)) return;
    if (receipt.livemode !== (this.mode === "live"))
      throw new ClubError("mode_mismatch", 400);
    // Persist a recoverable, minimal receipt even if external retrieval or the business transaction fails.
    await this.pool.query(
      `INSERT INTO grim.events(id,program_id,type,object_id) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`,
      [receipt.id, this.mode, receipt.type, receipt.object_id],
    );
    await this.pool.query(
      "UPDATE grim.events SET attempts=attempts+1 WHERE id=$1 AND state='pending'",
      [receipt.id],
    );
    try {
      await transaction(this.pool, async (db) => {
        const p = await lockedProgram(db, this.mode);
        const event = await one<{
          state: string;
          program_id: string;
          type: string;
          object_id: string;
        }>(db, "SELECT * FROM grim.events WHERE id=$1 FOR UPDATE", [
          receipt.id,
        ]);
        if (
          !event ||
          event.program_id !== this.mode ||
          event.type !== receipt.type ||
          event.object_id !== receipt.object_id
        )
          throw new ClubError("event_identity_mismatch");
        if (event.state === "done") return;
        if (receipt.type.startsWith("invoice."))
          await this.applyInvoice(
            db,
            p,
            receipt.object_id,
            receipt.type === "invoice.payment_failed"
              ? "Payment failed"
              : receipt.type === "invoice.payment_action_required"
                ? "Payment authentication required"
                : undefined,
          );
        else if (receipt.type.startsWith("customer.subscription."))
          await this.syncSubscription(db, p, receipt.object_id);
        else if (receipt.type === "customer.updated") {
          const m = await one<Membership>(
            db,
            "SELECT * FROM grim.memberships WHERE customer_id=$1 AND program_id=$2",
            [receipt.object_id, this.mode],
          );
          if (m) await this.syncAddress(db, p, m);
        } else if (receipt.type.startsWith("checkout.")) {
          const s = await this.billing.session(receipt.object_id);
          if (s.reservation) {
            const r = await one<Reservation>(
              db,
              "SELECT * FROM grim.reservations WHERE id::text=$1 AND program_id=$2",
              [s.reservation, this.mode],
            );
            if (r) await this.applySession(db, p, r, s);
          }
        } else {
          for (const id of await this.billing.affectedInvoices(
            receipt.type,
            receipt.object_id,
          ))
            await this.applyInvoice(db, p, id);
        }
        await db.query(
          "UPDATE grim.events SET state='done',completed_at=$2,last_error=NULL WHERE id=$1",
          [receipt.id, this.now()],
        );
      });
    } catch (error) {
      await this.pool.query(
        "UPDATE grim.events SET last_error=$2 WHERE id=$1",
        [
          receipt.id,
          error instanceof ClubError ? error.code : "processing_failed",
        ],
      );
      throw error;
    }
  }
  async reconcileInvoice(id: string) {
    // Fresh retrieval on every run also detects refunds whose event was missed.
    await transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      await this.applyInvoice(db, p, id);
    });
  }
  async refreshMember(owner: string, membershipId?: string) {
    return transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      let m = await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE program_id=$1 AND owner_id=$2 AND ($3::uuid IS NULL OR id=$3) ORDER BY created_at LIMIT 1",
        [this.mode, owner, membershipId ?? null],
      );
      if (m?.subscription_id)
        m = await this.syncSubscription(db, p, m.subscription_id);
      else if (m?.customer_id) m = await this.syncAddress(db, p, m);
      return m;
    });
  }
  async refreshMemberships(owner: string) {
    const rows = (
      await this.pool.query<Membership>(
        "SELECT * FROM grim.memberships WHERE program_id=$1 AND owner_id=$2 ORDER BY created_at",
        [this.mode, owner],
      )
    ).rows;
    for (const row of rows)
      await transaction(this.pool, async (db) => {
        const p = await lockedProgram(db, this.mode);
        const m = (await one<Membership>(
          db,
          "SELECT * FROM grim.memberships WHERE id=$1",
          [row.id],
        ))!;
        if (m.subscription_id)
          await this.syncSubscription(db, p, m.subscription_id);
        else if (m.customer_id) await this.syncAddress(db, p, m);
      });
  }
  async portal(owner: string, membershipId?: string) {
    return transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      const m = await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE program_id=$1 AND owner_id=$2 AND ($3::uuid IS NULL OR id=$3) ORDER BY created_at LIMIT 1",
        [this.mode, owner, membershipId ?? null],
      );
      if (!m?.customer_id) throw new ClubError("membership_not_found", 404);
      return this.billing.portal(p, m.customer_id, !!m.tier_snapshot.billing);
    });
  }
  async confirmation(owner: string, sessionId: string) {
    const row = await one<Reservation>(
      this.pool,
      `SELECT r.* FROM grim.reservations r JOIN grim.memberships m ON m.id=r.membership_id WHERE r.session_id=$1 AND m.owner_id=$2 AND r.program_id=$3`,
      [sessionId, owner, this.mode],
    );
    if (!row) throw new ClubError("checkout_not_found", 404);
    const s = await this.billing.session(sessionId);
    if (s.reservation !== row.id || s.livemode !== (this.mode === "live"))
      throw new ClubError("checkout_identity_mismatch");
    if (row.tier_snapshot.billing && s.state === "complete") {
      await transaction(this.pool, async (db) => {
        const p = await lockedProgram(db, this.mode);
        await this.applySession(db, p, row, s);
      });
    }
    const paid = await one(
      this.pool,
      "SELECT invoice_id FROM grim.fulfillments WHERE membership_id=$1 AND edition_id=$2",
      [row.membership_id, row.edition_id],
    );
    const cycle = row.tier_snapshot.billing
      ? await one<BillingCycle>(
          this.pool,
          "SELECT * FROM grim.billing_cycles WHERE membership_id=$1 AND initial ORDER BY created_at LIMIT 1",
          [row.membership_id],
        )
      : undefined;
    return {
      complete: s.state === "complete",
      paid: !!paid,
      invoiceUrl:
        cycle?.state === "initial" && this.now() < row.expires_at
          ? cycle.invoice_url
          : null,
      managed: !!row.tier_snapshot.billing,
      paymentDeadline:
        cycle?.state === "initial" ? row.expires_at.toISOString() : null,
    };
  }
  async lockOrder(actor: string, id: string) {
    const issue = await transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      const f = await one<Fulfillment>(
        db,
        `SELECT f.* FROM grim.fulfillments f JOIN grim.memberships m ON m.id=f.membership_id WHERE f.id=$1 AND m.program_id=$2`,
        [id, this.mode],
      );
      if (!f) throw new ClubError("order_not_found", 404);
      // Recheck financial and address state immediately before taking a packing snapshot.
      await this.applyInvoice(db, p, f.invoice_id);
      const current = (await one<Fulfillment>(
        db,
        "SELECT * FROM grim.fulfillments WHERE id=$1",
        [id],
      ))!;
      if (current.locked_at) return;
      const m = (await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE id=$1",
        [f.membership_id],
      ))!;
      const e = (await one<Edition>(
        db,
        "SELECT * FROM grim.editions WHERE id=$1",
        [f.edition_id],
      ))!;
      const entitlement = await one(
        db,
        "SELECT * FROM grim.entitlements WHERE invoice_id=$1",
        [f.invoice_id],
      );
      if (
        current.state !== "paid" ||
        !m.address_valid ||
        !addressValid(m.address, p.countries) ||
        entitlement?.financial_state !== "paid" ||
        entitlement?.review_reason ||
        e.state === "vaulted"
      )
        return "order_not_ready";
      if (!current.ship_by && this.now() < e.address_cutoff)
        return "address_window_open";
      await db.query(
        "UPDATE grim.fulfillments SET address_snapshot=$2,locked_at=$3,state='ready' WHERE id=$1",
        [id, m.address, this.now()],
      );
      await this.audit(db, actor, "packing_locked", id);
    });
    if (issue) throw new ClubError(issue);
  }
  async shipOrder(
    actor: string,
    id: string,
    tracking: { number: string; url: string },
  ) {
    const issue = await transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      const f = await one<Fulfillment>(
        db,
        `SELECT f.* FROM grim.fulfillments f JOIN grim.memberships m ON m.id=f.membership_id WHERE f.id=$1 AND m.program_id=$2`,
        [id, this.mode],
      );
      if (!f) throw new ClubError("order_not_found", 404);
      if (f.state === "shipped") throw new ClubError("already_shipped");
      await this.applyInvoice(db, p, f.invoice_id);
      const current = (await one<Fulfillment>(
        db,
        "SELECT * FROM grim.fulfillments WHERE id=$1",
        [id],
      ))!;
      const pending = await one(
        db,
        "SELECT id FROM grim.exceptions WHERE membership_id=$1 AND resolved_at IS NULL AND (invoice_id=$2 OR invoice_id IS NULL)",
        [f.membership_id, f.invoice_id],
      );
      if (current.state !== "ready" || pending) return "order_not_ready";
      const label = await one<{
        state: string;
        tracking_number: string;
        tracking_url: string | null;
      }>(
        db,
        "SELECT state,tracking_number,tracking_url FROM grim.shipping_labels WHERE fulfillment_id=$1",
        [id],
      );
      if (
        label &&
        label.state !== "quoted" &&
        (label.state !== "purchased" ||
          label.tracking_number !== tracking.number ||
          (label.tracking_url ?? "") !== tracking.url)
      )
        return "order_not_ready";
      const m = (await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE id=$1",
        [f.membership_id],
      ))!;
      await db.query(
        "UPDATE grim.fulfillments SET state='shipped',tracking_number=$2,tracking_url=$3,shipped_at=$4 WHERE id=$1",
        [id, tracking.number, tracking.url || null, this.now()],
      );
      await this.audit(db, actor, "shipment_recorded", id, {
        tracking: tracking.number,
      });
      await this.notify(
        db,
        m,
        `shipped:${id}`,
        "Your Grimmunity edition has shipped",
        `Your ${m.tier_snapshot.name} edition has shipped. Tracking number: ${tracking.number}. ${tracking.url}`,
      );
    });
    if (issue) throw new ClubError(issue);
  }
  async packingCSV(actor: string, editionId: string) {
    return transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      const candidates = (
        await db.query<{ invoice_id: string }>(
          `SELECT f.invoice_id FROM grim.fulfillments f JOIN grim.editions e ON e.id=f.edition_id WHERE e.program_id=$1 AND e.id=$2 AND f.state='ready'`,
          [this.mode, editionId],
        )
      ).rows;
      for (const candidate of candidates)
        await this.applyInvoice(db, p, candidate.invoice_id);
      const orders = (
        await db.query<
          Fulfillment & {
            tier_snapshot: Tier;
            preferences: Membership["preferences"];
          }
        >(
          `SELECT f.*,i.tier_snapshot,i.preferences FROM grim.fulfillments f JOIN grim.editions e ON e.id=f.edition_id JOIN grim.entitlements i ON i.invoice_id=f.invoice_id WHERE e.program_id=$1 AND e.id=$2 AND f.state='ready' AND i.financial_state='paid' AND i.review_reason IS NULL AND NOT EXISTS(SELECT 1 FROM grim.exceptions x WHERE x.membership_id=f.membership_id AND x.resolved_at IS NULL AND (x.invoice_id=f.invoice_id OR x.invoice_id IS NULL)) ORDER BY f.id`,
          [this.mode, editionId],
        )
      ).rows;
      await this.audit(db, actor, "packing_export", editionId, {
        count: orders.length,
      });
      const rows: unknown[][] = [
        [
          "Order",
          "Invoice",
          "Tier",
          "Included perks",
          "Name",
          "Address 1",
          "Address 2",
          "City",
          "State",
          "Postal code",
          "Country",
          "Preferred colors",
          "Colors to avoid",
        ],
      ];
      for (const f of orders) {
        const a = f.address_snapshot!;
        rows.push([
          f.id,
          f.invoice_id,
          f.tier_snapshot.name,
          f.tier_snapshot.perks.join("; "),
          a.name,
          a.line1,
          a.line2,
          a.city,
          a.state,
          a.postal_code,
          a.country,
          f.preferences?.preferred_colors.join("; ") ?? "",
          f.preferences?.avoided_colors.join("; ") ?? "",
        ]);
      }
      return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    });
  }
  async resolveException(actor: string, id: string, note: string) {
    await transaction(this.pool, async (db) => {
      await lockedProgram(db, this.mode);
      const x = await one(
        db,
        "SELECT * FROM grim.exceptions WHERE id=$1 AND program_id=$2",
        [id, this.mode],
      );
      if (!x) throw new ClubError("exception_not_found", 404);
      // Resolution acknowledges investigation; financial holds require the explicit release command below.
      await db.query(
        "UPDATE grim.exceptions SET resolved_at=$2,resolution=$3 WHERE id=$1",
        [id, this.now(), note],
      );
      await this.audit(db, actor, "exception_acknowledged", id, { note });
    });
  }
  async unlockOrder(actor: string, id: string, note: string) {
    await transaction(this.pool, async (db) => {
      await lockedProgram(db, this.mode);
      const f = await one<Fulfillment>(
        db,
        `SELECT f.* FROM grim.fulfillments f JOIN grim.memberships m ON m.id=f.membership_id WHERE f.id=$1 AND m.program_id=$2`,
        [id, this.mode],
      );
      if (!f || f.state === "shipped")
        throw new ClubError("order_not_editable");
      const label = await one<{ state: string }>(
        db,
        "SELECT state FROM grim.shipping_labels WHERE fulfillment_id=$1",
        [id],
      );
      if (label && label.state !== "quoted")
        throw new ClubError("shipping_label_exists");
      await db.query(
        "DELETE FROM grim.shipping_labels WHERE fulfillment_id=$1 AND state='quoted'",
        [id],
      );
      await this.audit(db, actor, "packing_unlocked", id, {
        note,
        previous_address: f.address_snapshot,
      });
      await db.query(
        `UPDATE grim.fulfillments SET locked_at=NULL,address_snapshot=NULL,state=CASE WHEN state='hold' THEN 'hold' ELSE 'paid' END WHERE id=$1`,
        [id],
      );
      // A new lock always revalidates the latest customer address and payment.
    });
  }
  async reconsiderInvoice(actor: string, id: string, note: string) {
    await transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      const old = await one(
        db,
        `SELECT i.* FROM grim.entitlements i JOIN grim.memberships m ON m.id=i.membership_id WHERE i.invoice_id=$1 AND m.program_id=$2`,
        [id, this.mode],
      );
      if (!old) throw new ClubError("invoice_not_found", 404);
      if (!old.allocated) {
        await this.audit(db, actor, "invoice_reconsidered", id, {
          note,
          previous_reason: old.review_reason,
        });
        await db.query(
          "DELETE FROM grim.entitlements WHERE invoice_id=$1 AND NOT allocated",
          [id],
        );
      }
      await this.applyInvoice(db, p, id);
      const updated = await one(
        db,
        "SELECT allocated,review_reason FROM grim.entitlements WHERE invoice_id=$1",
        [id],
      );
      if (updated?.allocated && !updated.review_reason)
        await db.query(
          `UPDATE grim.exceptions SET resolved_at=$2,resolution=$3 WHERE dedupe_key=$1`,
          [`${this.mode}:invoice:${id}`, this.now(), note],
        );
    });
  }
  async releaseHold(actor: string, invoiceId: string, note: string) {
    await transaction(this.pool, async (db) => {
      const p = await lockedProgram(db, this.mode);
      const row = await one(
        db,
        `SELECT i.* FROM grim.entitlements i JOIN grim.memberships m ON m.id=i.membership_id WHERE i.invoice_id=$1 AND m.program_id=$2`,
        [invoiceId, this.mode],
      );
      if (!row?.allocated)
        throw new ClubError("manual_refund_or_review_required");
      const i = await this.billing.invoice(invoiceId, p);
      const member = (await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE id=$1",
        [row.membership_id],
      ))!;
      const paymentProblem = member.tier_snapshot.billing
        ? (await managedPayment(this, db, p, member, i, true)).reason
        : this.invoiceProblem(i, p, row.tier_snapshot as Tier);
      if (paymentProblem || i.financialState !== "paid")
        throw new ClubError("financial_hold_active");
      await db.query(
        "UPDATE grim.entitlements SET review_reason=NULL,financial_state='paid' WHERE invoice_id=$1",
        [invoiceId],
      );
      await db.query(
        `UPDATE grim.fulfillments f SET state=CASE WHEN f.locked_at IS NOT NULL THEN 'ready' WHEN m.address_valid THEN 'paid' ELSE 'needs_address' END FROM grim.memberships m WHERE f.membership_id=m.id AND f.invoice_id=$1 AND f.state='hold'`,
        [invoiceId],
      );
      await this.audit(db, actor, "financial_hold_released", invoiceId, {
        note,
      });
    });
  }
}
