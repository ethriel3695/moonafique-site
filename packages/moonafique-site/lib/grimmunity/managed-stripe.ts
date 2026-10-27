import Stripe from "stripe";
import {
  ClubError,
  type Invoice,
  type Membership,
  type Program,
  type Reservation,
  type Session,
} from "./model";
import { membershipBilling } from "./billing-options";
import type { ShippingRate } from "../shippo";

export interface ManagedBilling {
  replace(
    p: Program,
    m: Membership,
    intent: import("./renewal-replacement").ReplacementIntent,
  ): Promise<string>;
  start(
    p: Program,
    m: Membership,
    r: Reservation,
    s: Session,
  ): Promise<{ subscription: string; invoice: string }>;
  pending(m: Membership): Promise<string[]>;
  prepare(
    p: Program,
    m: Membership,
    invoice: string,
    rate: ShippingRate,
    initial?: boolean,
  ): Promise<Invoice>;
  pay(invoice: string, attempt?: number): Promise<void>;
  void(invoice: string): Promise<boolean>;
  cancel(subscription: string, end: Date, now: Date): Promise<void>;
  deliveryProduct(mode: Program["id"]): string;
  postageProduct(mode: Program["id"]): string;
  postagePrice(
    p: Program,
    amount: number,
  ): Promise<{ price_id: string; product_id: string; amount: number }>;
}
const id = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : (value?.id ?? "");

export class ManagedStripe implements ManagedBilling {
  constructor(
    private stripe: Stripe,
    private invoice: (id: string, p: Program) => Promise<Invoice>,
  ) {}
  deliveryProduct(mode: Program["id"]) {
    return `prod_moonafique_${mode}_delivery_v3`;
  }
  postageProduct(mode: Program["id"]) {
    return `prod_moonafique_${mode}_postage_v3`;
  }
  async postagePrice(p: Program, amount: number) {
    return {
      price_id: await this.price(p, amount),
      product_id: this.postageProduct(p.id),
      amount,
    };
  }
  private async price(p: Program, amount: number, delivery = false) {
    if (
      !Number.isSafeInteger(amount) ||
      (delivery ? amount !== 0 : amount <= 0 || amount > 100000)
    )
      throw new ClubError("shipping_rate_changed");
    const productId = delivery
      ? this.deliveryProduct(p.id)
      : this.postageProduct(p.id);
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
          name: delivery ? "Monthly delivery schedule" : "Monthly shipping",
          tax_code: "txcd_92010001",
          metadata: { grim_managed_shipping: "true" },
        },
        { idempotencyKey: `grim:v3:product:${productId}` },
      );
    }
    if (!product.active || product.metadata.grim_managed_shipping !== "true")
      throw new ClubError("shipping_not_ready", 503);
    const lookup = `moonafique_v3_${productId}_${p.currency}_${amount}_${p.tax_mode}`;
    const found = await this.stripe.prices.list({
      product: productId,
      lookup_keys: [lookup],
      active: true,
      limit: 2,
    });
    if (found.data.length > 1) throw new ClubError("invalid_price", 503);
    const price =
      found.data[0] ??
      (await this.stripe.prices.create(
        {
          product: productId,
          currency: p.currency,
          unit_amount: amount,
          lookup_key: lookup,
          ...(delivery ? { recurring: { interval: "month" as const } } : {}),
          ...(p.tax_mode === "not_collecting"
            ? {}
            : { tax_behavior: p.tax_mode }),
          metadata: { grim_managed_shipping: "true" },
        },
        { idempotencyKey: `grim:v3:price:${lookup}` },
      ));
    if (
      !price.active ||
      price.livemode !== (p.id === "live") ||
      id(price.product) !== productId ||
      price.unit_amount !== amount ||
      price.currency !== p.currency ||
      price.billing_scheme !== "per_unit" ||
      price.transform_quantity ||
      price.custom_unit_amount ||
      (p.tax_mode !== "not_collecting" && price.tax_behavior !== p.tax_mode) ||
      (delivery
        ? price.recurring?.interval !== "month" ||
          price.recurring.interval_count !== 1
        : !!price.recurring)
    )
      throw new ClubError("invalid_price", 503);
    return price.id;
  }
  async start(p: Program, m: Membership, r: Reservation, s: Session) {
    if (
      !m.customer_id ||
      !s.setupIntent ||
      !r.tier_snapshot.billing ||
      !r.tier_snapshot.shipping ||
      !r.shipping_address
    )
      throw new ClubError("checkout_identity_mismatch");
    const setup = await this.stripe.setupIntents.retrieve(s.setupIntent);
    if (
      setup.status !== "succeeded" ||
      setup.livemode !== (p.id === "live") ||
      id(setup.customer) !== m.customer_id ||
      setup.metadata?.grim_reservation !== r.id ||
      !setup.payment_method
    )
      throw new ClubError("checkout_identity_mismatch");
    const matches: Stripe.Subscription[] = [];
    for await (const sub of this.stripe.subscriptions.list({
      customer: m.customer_id,
      status: "all",
      limit: 100,
    }))
      if (sub.metadata.grim_reservation === r.id) matches.push(sub);
    if (matches.length > 1) throw new ClubError("checkout_needs_review");
    let sub = matches[0];
    if (!sub) {
      if (Date.now() - r.created_at.getTime() > 23 * 3600000)
        throw new ClubError("checkout_needs_review");
      const delivery = await this.price(p, 0, true);
      const shipping = await this.price(p, r.tier_snapshot.shipping.amount);
      sub = await this.stripe.subscriptions.create(
        {
          customer: m.customer_id,
          billing_mode: { type: "flexible" },
          collection_method: "send_invoice",
          days_until_due: 30,
          items: [
            { price: r.tier_snapshot.billing.price_id },
            { price: delivery },
          ],
          add_invoice_items: [{ price: shipping, quantity: 1 }],
          default_payment_method: id(setup.payment_method),
          payment_settings: {
            payment_method_types: ["card"],
            save_default_payment_method: "on_subscription",
          },
          automatic_tax: { enabled: p.tax_mode !== "not_collecting" },
          metadata: {
            grim_reservation: r.id,
            grim_program: p.id,
            grim_tier: r.tier_snapshot.id,
            grim_billing: "notice_shipping_v1",
          },
        },
        { idempotencyKey: `grim:v3:subscription:${r.id}` },
      );
    }
    if (
      sub.metadata.grim_billing !== "notice_shipping_v1" ||
      sub.collection_method !== "send_invoice" ||
      !sub.latest_invoice
    )
      throw new ClubError("checkout_needs_review");
    // send_invoice never auto-charges; pause also retains every later monthly
    // invoice as a draft. Both safeguards survive worker or webhook outages.
    await this.stripe.subscriptions.update(
      sub.id,
      { pause_collection: { behavior: "keep_as_draft" } },
      { idempotencyKey: `grim:v3:pause:${r.id}` },
    );
    const firstInvoices: string[] = [];
    for await (const invoice of this.stripe.invoices.list({
      subscription: sub.id,
      limit: 100,
    }))
      if (invoice.billing_reason === "subscription_create")
        firstInvoices.push(invoice.id);
    if (firstInvoices.length !== 1)
      throw new ClubError("checkout_needs_review");
    await this.stripe.invoices.update(firstInvoices[0], {
      auto_advance: false,
      due_date: Math.floor(r.expires_at.getTime() / 1000),
    });
    return { subscription: sub.id, invoice: firstInvoices[0] };
  }
  async pending(m: Membership) {
    const result: string[] = [];
    if (!m.subscription_id) return result;
    for await (const invoice of this.stripe.invoices.list({
      subscription: m.subscription_id,
      limit: 100,
    }))
      if (invoice.status === "draft" || invoice.status === "open")
        result.push(invoice.id);
    return result.reverse();
  }
  async prepare(
    p: Program,
    m: Membership,
    invoiceId: string,
    rate: ShippingRate,
    initial = false,
  ) {
    const raw = await this.stripe.invoices.retrieve(invoiceId);
    if (
      raw.livemode !== (p.id === "live") ||
      id(raw.customer) !== m.customer_id ||
      id(raw.parent?.subscription_details?.subscription) !==
        m.subscription_id ||
      raw.collection_method !== "send_invoice"
    )
      throw new ClubError("invoice_identity_mismatch");
    if (!["draft", "open", "paid"].includes(raw.status ?? ""))
      throw new ClubError("renewal_needs_review");
    if (raw.status === "draft") {
      await this.stripe.invoices.update(invoiceId, { auto_advance: false });
      if (!initial) {
        const lines = await this.stripe.invoices.listLineItems(invoiceId, {
          limit: 100,
        });
        const postage = lines.data.filter(
          (line) =>
            id(line.pricing?.price_details?.product) ===
            this.postageProduct(p.id),
        );
        if (postage.length > 1 || lines.has_more)
          throw new ClubError("renewal_needs_review");
        if (!postage.length)
          await this.stripe.invoiceItems.create(
            {
              customer: m.customer_id!,
              invoice: invoiceId,
              pricing: { price: await this.price(p, rate.amount) },
              quantity: 1,
              description: `${rate.carrier} ${rate.service} · monthly shipping`,
              metadata: { grim_invoice: invoiceId },
            },
            { idempotencyKey: `grim:v3:postage:${invoiceId}` },
          );
      }
      await this.stripe.invoices.finalizeInvoice(
        invoiceId,
        { auto_advance: false },
        { idempotencyKey: `grim:v3:finalize:${invoiceId}` },
      );
    }
    return this.invoice(invoiceId, p);
  }
  async pay(invoice: string, attempt = 1) {
    // The caller verifies the exact frozen invoice and a delivered, aged notice.
    await this.stripe.invoices.pay(
      invoice,
      { off_session: true },
      { idempotencyKey: `grim:v3:pay:${invoice}:${attempt}` },
    );
  }
  async replace(
    p: Program,
    m: Membership,
    intent: import("./renewal-replacement").ReplacementIntent,
  ) {
    if (!m.customer_id || !m.subscription_id || !m.tier_snapshot.billing)
      throw new ClubError("invoice_identity_mismatch");
    const existing: Stripe.Invoice[] = [];
    for await (const invoice of this.stripe.invoices.list({
      subscription: m.subscription_id,
      limit: 100,
    }))
      if (invoice.metadata?.grim_replacement === intent.request_key)
        existing.push(invoice);
    if (existing.length > 1) throw new ClubError("replacement_needs_review");
    if (!(await this.void(intent.original_invoice_id)))
      throw new ClubError("replacement_needs_review");
    let invoice = existing[0];
    if (!invoice) {
      if (Date.now() - intent.created_at.getTime() > 23 * 3600000)
        throw new ClubError("replacement_needs_review");
      invoice = await this.stripe.invoices.create(
        {
          customer: m.customer_id,
          subscription: m.subscription_id,
          collection_method: "send_invoice",
          days_until_due: 30,
          auto_advance: false,
          automatic_tax: { enabled: p.tax_mode !== "not_collecting" },
          metadata: {
            grim_replacement: intent.request_key,
            grim_membership: m.id,
            grim_program: p.id,
          },
        },
        { idempotencyKey: `grim:v3:replacement:${intent.request_key}` },
      );
    }
    if (invoice.status !== "draft") return invoice.id;
    await this.price(p, 0, true);
    const period = {
      start: Math.floor(intent.period_start.getTime() / 1000),
      end: Math.floor(intent.period_end.getTime() / 1000),
    };
    await this.stripe.invoiceItems.create(
      {
        customer: m.customer_id,
        invoice: invoice.id,
        price_data: {
          product: this.deliveryProduct(p.id),
          currency: p.currency,
          unit_amount: 0,
          ...(p.tax_mode === "not_collecting"
            ? {}
            : { tax_behavior: p.tax_mode }),
        },
        period,
        metadata: { grim_delivery: intent.request_key },
        description: "Monthly delivery schedule",
      },
      { idempotencyKey: `grim:v3:replacement-delivery:${intent.request_key}` },
    );
    if (intent.base_amount) {
      if (
        intent.base_amount !== m.tier_snapshot.billing.amount ||
        !intent.base_start ||
        !intent.base_end
      )
        throw new ClubError("replacement_needs_review");
      await this.stripe.invoiceItems.create(
        {
          customer: m.customer_id,
          invoice: invoice.id,
          price_data: {
            product: m.tier_snapshot.product_id,
            currency: p.currency,
            unit_amount: intent.base_amount,
            ...(p.tax_mode === "not_collecting"
              ? {}
              : { tax_behavior: p.tax_mode }),
          },
          period: {
            start: Math.floor(intent.base_start.getTime() / 1000),
            end: Math.floor(intent.base_end.getTime() / 1000),
          },
          metadata: { grim_membership_price: m.tier_snapshot.billing.price_id },
          description: `${m.tier_snapshot.name} · ${m.tier_snapshot.billing.months} months`,
        },
        {
          idempotencyKey: `grim:v3:replacement-membership:${intent.request_key}`,
        },
      );
    }
    return invoice.id;
  }
  async void(invoice: string) {
    const current = await this.stripe.invoices.retrieve(invoice);
    if (current.status === "paid") return false;
    if (current.status === "void") return true;
    if (current.status === "draft") {
      await this.stripe.invoices.finalizeInvoice(invoice, {
        auto_advance: false,
      });
    }
    try {
      await this.stripe.invoices.voidInvoice(invoice);
    } catch (error) {
      if ((await this.stripe.invoices.retrieve(invoice)).status === "paid")
        return false;
      throw error;
    }
    return true;
  }
  async cancel(subscription: string, end: Date, now: Date) {
    if (end > now)
      await this.stripe.subscriptions.update(subscription, {
        cancel_at: Math.floor(end.getTime() / 1000),
        proration_behavior: "none",
      });
    else
      await this.stripe.subscriptions.cancel(subscription, {
        invoice_now: false,
        prorate: false,
      });
  }
}

export function managedPriceMatches(
  price: Stripe.Price,
  p: Program,
  m: Membership["tier_snapshot"],
) {
  const billing = m.billing;
  if (!billing) return false;
  const plan = membershipBilling(m.amount, billing.months);
  return (
    price.id === billing.price_id &&
    id(price.product) === m.product_id &&
    price.unit_amount === plan.amount &&
    price.currency === p.currency &&
    price.livemode === (p.id === "live") &&
    price.type === "recurring" &&
    price.recurring?.interval === plan.recurring.interval &&
    price.recurring.interval_count === plan.recurring.interval_count &&
    price.recurring.usage_type === "licensed" &&
    price.billing_scheme === "per_unit" &&
    !price.transform_quantity &&
    !price.custom_unit_amount &&
    (p.tax_mode === "not_collecting" || price.tax_behavior === p.tax_mode)
  );
}
