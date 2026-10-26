import { randomUUID } from "node:crypto";
import type {
  Address,
  BillingGateway,
  Invoice,
  Membership,
  Program,
  Reservation,
  Session,
  Subscription,
} from "../../lib/grimmunity/model";
import { monthlyAmount, type Tier } from "../../lib/grimmunity/tiers";
import { testTiers as sandboxTiers } from "./tier-fixtures";
export const delivery: Address = {
  name: "Sandbox Collector",
  line1: "123 Fixture Lane",
  line2: "",
  city: "Boise",
  state: "ID",
  postal_code: "83702",
  country: "US",
};
export class FakeBilling implements BillingGateway {
  customers = new Map<string, { address: Address | null; livemode: boolean }>();
  sessions = new Map<string, Session>();
  subscriptions = new Map<string, Subscription>();
  invoices = new Map<string, Invoice>();
  sessionTiers = new Map<string, Tier>();
  creates = 0;
  expiryRace = false;
  failInvoice = false;
  lastPortalCustomer = "";
  async checkConfiguration() {}
  async shippingPrice(_p: Program, amount: number) {
    return {
      price_id: `price_shipping_${amount}_fixture`,
      product_id: "prod_shipping_fixture",
      amount,
    };
  }
  async createCustomer(m: Membership) {
    const id = `cus_${m.id}`;
    this.customers.set(id, {
      address: m.address ?? { ...delivery },
      livemode: false,
    });
    return id;
  }
  async customer(id: string) {
    return structuredClone(this.customers.get(id)!);
  }
  async createSession(_p: Program, m: Membership, r: Reservation) {
    this.creates++;
    const id = `cs_test_${r.id}`;
    const s: Session = {
      id,
      customer: m.customer_id!,
      subscription: null,
      reservation: r.id,
      state: "open",
      url: `https://checkout.stripe.com/c/pay/${id}`,
      livemode: false,
    };
    this.sessions.set(id, s);
    this.sessionTiers.set(id, r.tier_snapshot);
    return structuredClone(s);
  }
  async session(id: string) {
    return structuredClone(this.sessions.get(id)!);
  }
  async expireSession(id: string) {
    const s = this.sessions.get(id)!;
    if (this.expiryRace) {
      this.complete(id);
      this.expiryRace = false;
    } else if (s.state === "open") s.state = "expired";
    return this.session(id);
  }
  async findSession(customer: string, reservation: string) {
    return structuredClone(
      [...this.sessions.values()].find(
        (s) => s.customer === customer && s.reservation === reservation,
      ) ?? null,
    );
  }
  async subscription(id: string) {
    return structuredClone(this.subscriptions.get(id)!);
  }
  async invoice(id: string) {
    if (this.failInvoice) throw Error("Stripe temporarily unavailable");
    return structuredClone(this.invoices.get(id)!);
  }
  async affectedInvoices() {
    return [...this.invoices.keys()];
  }
  async portal(_p: Program, customer: string) {
    this.lastPortalCustomer = customer;
    return "https://billing.stripe.com/p/session/fixture";
  }
  complete(
    sessionId: string,
    start = "2026-11-02T18:00:00Z",
    end = "2026-12-02T18:00:00Z",
  ) {
    const s = this.sessions.get(sessionId)!;
    s.state = "complete";
    s.subscription = `sub_${s.reservation}`;
    const sub: Subscription = {
      id: s.subscription,
      customer: s.customer,
      reservation: s.reservation,
      status: "active",
      livemode: false,
      cancelAtPeriodEnd: false,
      start: Date.parse(start) / 1000,
      end: Date.parse(end) / 1000,
      validPlan: true,
      priceId: this.sessionTiers.get(sessionId)!.price_id,
    };
    this.subscriptions.set(sub.id, sub);
    const invoice = this.paidInvoice(sub, start, end);
    return { sub, invoice };
  }
  paidInvoice(sub: Subscription, start: string, end: string) {
    const tier =
      [...this.sessionTiers.values()].find(
        (tier) => tier.price_id === sub.priceId,
      ) ?? sandboxTiers.find((tier) => tier.price_id === sub.priceId)!;
    const id = `in_${randomUUID()}`,
      begin = Date.parse(start) / 1000,
      finish = Date.parse(end) / 1000;
    const i: Invoice = {
      id,
      subscription: sub.id,
      customer: sub.customer,
      livemode: false,
      status: "paid",
      reason: "subscription_cycle",
      amountPaid: monthlyAmount(tier)!,
      total: monthlyAmount(tier)!,
      amountDue: monthlyAmount(tier)!,
      currency: "usd",
      paidAt: begin + 10,
      lines: [tier, ...(tier.shipping ? [tier.shipping] : [])].map(
        (charge) => ({
          invoice: id,
          price: charge.price_id,
          product: charge.product_id,
          subscription: sub.id,
          recurring: true,
          proration: false,
          quantity: 1,
          amount: charge.amount,
          currency: "usd",
          start: begin,
          end: finish,
        }),
      ),
      adjusted: false,
      paymentVerified: true,
      financialState: "paid",
    };
    this.invoices.set(id, i);
    return i;
  }
}
