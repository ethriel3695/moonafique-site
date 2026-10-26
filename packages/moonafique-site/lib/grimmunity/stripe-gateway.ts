import Stripe from "stripe";
import {
  ClubError,
  type Address,
  type BillingGateway,
  type Invoice,
  type Membership,
  type Mode,
  type Program,
  type Reservation,
  type Session,
} from "./model";

import { tiersSchema, type Tier } from "./tiers";
import { membershipPage } from "./collections";

export const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;
export function stripeId(
  value: string | { id: string } | null | undefined,
): string {
  return typeof value === "string" ? value : (value?.id ?? "");
}
export function grimStripe(mode: Mode): Stripe {
  const key = process.env.GRIM_STRIPE_SECRET_KEY;
  if (
    !key ||
    !(mode === "sandbox" ? /^(sk|rk)_test_/ : /^(sk|rk)_live_/).test(key)
  )
    throw new ClubError("billing_unavailable", 503);
  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    timeout: 10000,
    maxNetworkRetries: 1,
  });
}
export function appOrigin(): string {
  const url = new URL(
    process.env.GRIM_SITE_URL ??
      process.env.SERVER_URL ??
      "http://localhost:3000",
  );
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new ClubError("invalid_origin", 503);
  return url.origin;
}
function normalizeSession(s: Stripe.Checkout.Session): Session {
  return {
    id: s.id,
    customer: stripeId(s.customer),
    subscription: stripeId(s.subscription) || null,
    reservation: s.metadata?.grim_reservation ?? null,
    state: s.status,
    url: s.url,
    livemode: s.livemode,
  };
}
function planMatches(
  price: Stripe.Price,
  p: Program,
  tier: Pick<Tier, "price_id" | "product_id" | "amount">,
): boolean {
  return (
    price.id === tier.price_id &&
    stripeId(price.product) === tier.product_id &&
    price.currency === p.currency &&
    price.unit_amount === tier.amount &&
    price.type === "recurring" &&
    price.recurring?.interval === "month" &&
    price.recurring.interval_count === 1 &&
    price.recurring.usage_type === "licensed" &&
    price.billing_scheme === "per_unit" &&
    !price.transform_quantity &&
    !price.custom_unit_amount &&
    price.livemode === (p.id === "live") &&
    (p.tax_mode === "not_collecting" || price.tax_behavior === p.tax_mode)
  );
}
export class StripeGateway implements BillingGateway {
  constructor(public stripe: Stripe) {}
  async checkConfiguration(p: Program) {
    const tiers = tiersSchema.safeParse(p.tiers);
    if (
      !tiers.success ||
      (p.id === "live" && p.tiers.some((tier) => !tier.benefits_confirmed))
    )
      throw new ClubError("tiers_not_ready", 503);
    for (const tier of p.tiers) {
      if (tier.shipping === null && tier.shipping_mode !== "shippo")
        throw new ClubError("shipping_not_ready", 503);
      const charges = [
        { ...tier, metadataKey: "grim_subscription" },
        ...(tier.shipping
          ? [{ ...tier.shipping, metadataKey: "grim_shipping" }]
          : []),
      ];
      for (const charge of charges) {
        const price = await this.stripe.prices.retrieve(charge.price_id, {
          expand: ["product"],
        });
        const product = price.product;
        if (
          !planMatches(price, p, charge) ||
          !price.active ||
          typeof product === "string" ||
          product.deleted ||
          !product.active ||
          product.metadata[charge.metadataKey] !== "true"
        )
          throw new ClubError("invalid_price", 503);
      }
    }
    await this.checkPortal(p);
  }
  async checkPortal(p: Program) {
    const portal = await this.stripe.billingPortal.configurations.retrieve(
      p.portal_configuration_id,
    );
    const f = portal.features;
    if (
      !portal.active ||
      portal.livemode !== (p.id === "live") ||
      !f.payment_method_update.enabled ||
      !f.invoice_history.enabled ||
      !f.customer_update.enabled ||
      !f.customer_update.allowed_updates.includes("shipping") ||
      f.subscription_update.enabled ||
      !f.subscription_cancel.enabled ||
      f.subscription_cancel.mode !== "at_period_end" ||
      f.subscription_cancel.proration_behavior !== "none"
    )
      throw new ClubError("invalid_portal", 503);
  }
  async createCustomer(m: Membership) {
    const c = await this.stripe.customers.create(
      {
        email: m.email,
        ...(m.tier_snapshot.shipping_mode === "shippo" && m.address
          ? {
              shipping: {
                name: m.address.name,
                address: {
                  line1: m.address.line1,
                  line2: m.address.line2,
                  city: m.address.city,
                  state: m.address.state,
                  postal_code: m.address.postal_code,
                  country: m.address.country,
                },
              },
            }
          : {}),
        metadata: { grim_membership: m.id, grim_program: m.program_id },
      },
      { idempotencyKey: `grim:customer:${m.id}` },
    );
    return c.id;
  }
  async customer(id: string) {
    const c = await this.stripe.customers.retrieve(id);
    if (c.deleted) throw new ClubError("customer_deleted");
    const s = c.shipping;
    const a: Address | null = s
      ? {
          name: s.name ?? "",
          line1: s.address?.line1 ?? "",
          line2: s.address?.line2 ?? "",
          city: s.address?.city ?? "",
          state: s.address?.state ?? "",
          postal_code: s.address?.postal_code ?? "",
          country: s.address?.country ?? "",
        }
      : null;
    return { address: a, livemode: c.livemode };
  }
  async shippingPrice(p: Program, amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000)
      throw new ClubError("shipping_rate_changed");
    const productId = `prod_moonafique_${p.id}_shippo_shipping_v1`;
    let product: Stripe.Product;
    try {
      product = await this.stripe.products.retrieve(productId);
    } catch (error) {
      if (
        !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
        error.code !== "resource_missing"
      )
        throw error;
      product = await this.stripe.products.create(
        {
          id: productId,
          name: "Monthly shipping · Shippo quote",
          tax_code: "txcd_92010001",
          metadata: { grim_shipping: "true", grim_program: p.id },
        },
        { idempotencyKey: `grim:shippo-product:${p.id}` },
      );
    }
    if (!product.active || product.metadata.grim_shipping !== "true")
      throw new ClubError("shipping_not_ready", 503);
    const key = `moonafique_shippo_${p.id}_${p.currency}_${amount}_${p.tax_mode}`;
    const existing = await this.stripe.prices.list({
      product: product.id,
      lookup_keys: [key],
      active: true,
      limit: 1,
    });
    const price =
      existing.data[0] ??
      (await this.stripe.prices.create(
        {
          product: product.id,
          unit_amount: amount,
          currency: p.currency,
          recurring: { interval: "month" },
          lookup_key: key,
          ...(p.tax_mode !== "not_collecting"
            ? { tax_behavior: p.tax_mode }
            : {}),
          metadata: { grim_shipping: "true" },
        },
        { idempotencyKey: `grim:shippo-price:${key}` },
      ));
    const shipping = { price_id: price.id, product_id: product.id, amount };
    if (!planMatches(price, p, shipping) || !price.active)
      throw new ClubError("invalid_price", 503);
    return shipping;
  }
  async createSession(p: Program, m: Membership, r: Reservation) {
    const tier = r.tier_snapshot;
    if (tier.shipping === null) throw new ClubError("shipping_not_ready", 503);
    if (!m.customer_id) throw new ClubError("customer_missing");
    if (r.shipping_quote_id) {
      const address = r.shipping_address;
      if (!address) throw new ClubError("shipping_quote_required");
      await this.stripe.customers.update(
        m.customer_id,
        {
          shipping: {
            name: address.name,
            address: {
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              postal_code: address.postal_code,
              country: address.country,
            },
          },
        },
        { idempotencyKey: `grim:delivery:${r.id}` },
      );
    }
    const s = await this.stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: m.customer_id,
        client_reference_id: r.id,
        metadata: {
          grim_reservation: r.id,
          grim_program: p.id,
          grim_tier: tier.id,
        },
        subscription_data: {
          metadata: {
            grim_reservation: r.id,
            grim_program: p.id,
            grim_tier: tier.id,
          },
        },
        line_items: [
          { price: tier.price_id, quantity: 1 },
          ...(tier.shipping
            ? [{ price: tier.shipping.price_id, quantity: 1 }]
            : []),
        ],
        payment_method_types: ["card"],
        allow_promotion_codes: false,
        automatic_tax: { enabled: p.tax_mode !== "not_collecting" },
        customer_update: {
          ...(r.shipping_quote_id ? {} : { shipping: "auto" as const }),
          address: "auto",
          name: "auto",
        },
        billing_address_collection: "required",
        ...(r.shipping_quote_id
          ? {}
          : {
              shipping_address_collection: {
                allowed_countries: p.countries as NonNullable<
                  NonNullable<
                    Parameters<Stripe["checkout"]["sessions"]["create"]>[0]
                  >["shipping_address_collection"]
                >["allowed_countries"],
              },
            }),
        expires_at: Math.floor(r.expires_at.getTime() / 1000),
        success_url: `${appOrigin()}/grimmunity/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appOrigin()}${membershipPage(tier)}?checkout=unfinished`,
        custom_text: {
          submit: {
            message: `${tier.name} renews monthly${tier.shipping ? ", with the separately listed shipping fee" : ", with delivery included"}. ${r.shipping_quote_id ? "Delivery uses the address you confirmed on Moonafique. " : ""}Manage future renewals in your account.`,
          },
        },
      },
      { idempotencyKey: `grim:checkout:${r.id}` },
    );
    return normalizeSession(s);
  }
  async session(id: string) {
    return normalizeSession(await this.stripe.checkout.sessions.retrieve(id));
  }
  async expireSession(id: string) {
    const current = await this.session(id);
    if (current.state !== "open") return current;
    try {
      return normalizeSession(await this.stripe.checkout.sessions.expire(id));
    } catch (error) {
      // An expiry can race payment completion. Only authoritative terminal state releases a seat.
      const latest = await this.session(id);
      if (latest.state === "open") throw error;
      return latest;
    }
  }
  async findSession(customer: string, reservation: string) {
    for await (const s of this.stripe.checkout.sessions.list({
      customer,
      limit: 100,
    })) {
      if (s.metadata?.grim_reservation === reservation)
        return normalizeSession(s);
    }
    return null;
  }
  async subscription(id: string, p: Program, savedTier?: Tier) {
    const s = await this.stripe.subscriptions.retrieve(id);
    const tier = (savedTier ? [savedTier] : p.tiers).find((tier) =>
      s.items.data.some((item) => item.price.id === tier.price_id),
    );
    const item = s.items.data.find((item) => item.price.id === tier?.price_id);
    const expected = tier
      ? [tier, ...(tier.shipping ? [tier.shipping] : [])]
      : [];
    return {
      id: s.id,
      customer: stripeId(s.customer),
      reservation: s.metadata.grim_reservation ?? null,
      status: s.status,
      livemode: s.livemode,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      start: item?.current_period_start ?? 0,
      end: item?.current_period_end ?? 0,
      priceId: item?.price.id ?? null,
      validPlan:
        !!tier &&
        tier.shipping !== null &&
        s.items.data.length === expected.length &&
        !s.items.has_more &&
        expected.every(
          (charge) =>
            s.items.data.filter(
              (other) =>
                other.quantity === 1 &&
                planMatches(other.price, p, charge) &&
                other.current_period_start === item?.current_period_start &&
                other.current_period_end === item?.current_period_end,
            ).length === 1,
        ) &&
        s.discounts.length === 0 &&
        !s.trial_start &&
        !s.trial_end &&
        !s.schedule &&
        !s.pause_collection,
    };
  }
  async chargeState(charge: Stripe.Charge): Promise<Invoice["financialState"]> {
    if (charge.disputed) {
      let found = false;
      for await (const dispute of this.stripe.disputes.list({
        charge: charge.id,
        limit: 100,
      })) {
        found = true;
        if (!["won", "warning_closed", "prevented"].includes(dispute.status))
          return "disputed";
      }
      if (!found) return "disputed";
    }
    return charge.amount_refunded > 0
      ? charge.refunded
        ? "refunded"
        : "review"
      : "paid";
  }
  async invoice(id: string, p: Program): Promise<Invoice> {
    const i = await this.stripe.invoices.retrieve(id);
    const lines: Invoice["lines"] = [];
    let adjusted =
      i.discounts.length > 0 ||
      i.starting_balance !== 0 ||
      !!i.ending_balance ||
      i.pre_payment_credit_notes_amount > 0 ||
      i.post_payment_credit_notes_amount > 0 ||
      !!i.shipping_cost ||
      (i.total_pretax_credit_amounts?.length ?? 0) > 0;
    for await (const line of this.stripe.invoices.listLineItems(id, {
      limit: 100,
    })) {
      const parent = line.parent?.subscription_item_details;
      adjusted ||=
        (line.discount_amounts?.length ?? 0) > 0 || line.discounts.length > 0;
      const priceId = stripeId(line.pricing?.price_details?.price);
      // Inspect the historic invoice's own price, not a mutable current subscription item.
      const price = priceId ? await this.stripe.prices.retrieve(priceId) : null;
      lines.push({
        invoice: line.invoice,
        price: priceId || null,
        product: stripeId(line.pricing?.price_details?.product) || null,
        subscription:
          parent?.subscription ??
          line.parent?.invoice_item_details?.subscription ??
          null,
        recurring:
          !!parent &&
          !!price &&
          // This classifies an authoritative recurring line. The service then
          // checks its exact price, product, quantity, and amount against the
          // member's saved offer, including historical or destination-rated prices.
          planMatches(price, p, {
            price_id: price.id,
            product_id: stripeId(price.product),
            amount: price.unit_amount ?? -1,
          }),
        proration:
          parent?.proration ??
          line.parent?.invoice_item_details?.proration ??
          false,
        quantity: line.quantity,
        amount: line.amount,
        currency: line.currency,
        start: line.period.start,
        end: line.period.end,
      });
    }
    let financialState: Invoice["financialState"] = adjusted
      ? "review"
      : "paid";
    let verifiedAmount = 0;
    for await (const payment of this.stripe.invoicePayments.list({
      invoice: id,
      status: "paid",
      limit: 100,
    })) {
      if (
        payment.payment.type !== "payment_intent" ||
        !payment.payment.payment_intent
      ) {
        financialState = "review";
        continue;
      }
      const pi = await this.stripe.paymentIntents.retrieve(
        stripeId(payment.payment.payment_intent),
      );
      if (
        pi.status !== "succeeded" ||
        pi.currency !== p.currency ||
        !pi.latest_charge
      ) {
        financialState = "review";
        continue;
      }
      const charge = await this.stripe.charges.retrieve(
        stripeId(pi.latest_charge),
      );
      const chargeState = await this.chargeState(charge);
      if (chargeState === "disputed") financialState = "disputed";
      else if (chargeState !== "paid" && financialState !== "disputed")
        financialState = chargeState;
      if (payment.currency === p.currency)
        verifiedAmount += payment.amount_paid ?? 0;
    }
    return {
      id: i.id,
      customer: stripeId(i.customer),
      subscription:
        stripeId(i.parent?.subscription_details?.subscription) || null,
      livemode: i.livemode,
      status: i.status,
      reason: i.billing_reason,
      amountPaid: i.amount_paid,
      total: i.total,
      taxExclusive: (i.total_taxes ?? [])
        .filter((tax) => tax.tax_behavior === "exclusive")
        .reduce((sum, tax) => sum + tax.amount, 0),
      totalExcludingTax: i.total_excluding_tax,
      automaticTaxComplete:
        i.automatic_tax?.enabled === true &&
        i.automatic_tax.status === "complete",
      amountDue: i.amount_due,
      currency: i.currency,
      paidAt: i.status_transitions.paid_at,
      lines,
      adjusted,
      paymentVerified: verifiedAmount === i.amount_paid && verifiedAmount > 0,
      financialState,
    };
  }
  async affectedInvoices(type: string, objectId: string) {
    if (type.startsWith("credit_note."))
      return [
        stripeId((await this.stripe.creditNotes.retrieve(objectId)).invoice),
      ];
    let paymentIntent = "";
    if (type.startsWith("charge.dispute.")) {
      const dispute = await this.stripe.disputes.retrieve(objectId);
      paymentIntent = stripeId(dispute.payment_intent);
      if (!paymentIntent)
        paymentIntent = stripeId(
          (await this.stripe.charges.retrieve(stripeId(dispute.charge)))
            .payment_intent,
        );
    } else {
      const chargeId = type.startsWith("refund.")
        ? stripeId((await this.stripe.refunds.retrieve(objectId)).charge)
        : objectId;
      paymentIntent = stripeId(
        (await this.stripe.charges.retrieve(chargeId)).payment_intent,
      );
    }
    if (!paymentIntent) return [];
    const ids = new Set<string>();
    for await (const p of this.stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntent },
      status: "paid",
      limit: 100,
    }))
      ids.add(stripeId(p.invoice));
    return [...ids];
  }
  async portal(p: Program, customer: string) {
    await this.checkPortal(p);
    return (
      await this.stripe.billingPortal.sessions.create({
        customer,
        configuration: p.portal_configuration_id,
        return_url: `${appOrigin()}/account/grimmunity`,
      })
    ).url;
  }
}
