import { z } from "zod";
import { tierIds, type Tier, type ClubId, type TierAllocations } from "./tiers";
import { preferencesSchema, type ColorPreferences } from "./preferences";

export type Mode = "sandbox" | "live";
export type Program = {
  billing_policy?: "notice_shipping_v1" | null;
  managed_portal_configuration_id?: string | null;
  id: Mode;
  enabled: boolean;
  approved_at: Date | null;
  tiers: Tier[];
  currency: string;
  member_cap: number;
  retained_copies: number;
  countries: string[];
  shipping_text: string;
  tax_mode: "inclusive" | "exclusive" | "not_collecting";
  fulfillment_lead_days?: number | null;
  terms_version: string;
  cancellation_text: string;
  recovery_text: string;
  support_email: string;
  portal_configuration_id: string;
  timezone: string;
};
export type Edition = {
  tier_allocations?: TierAllocations | null;
  id: string;
  program_id: Mode;
  month: string;
  title: string;
  capacity: number;
  retained_copies: number;
  enrollment_open: Date;
  enrollment_close: Date;
  period_open: Date;
  period_close: Date;
  payment_cutoff: Date;
  address_cutoff: Date;
  dispatch_start: Date;
  dispatch_end: Date;
  state: "draft" | "open" | "closed" | "vaulted";
};
export type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};
export type Membership = {
  club?: ClubId;
  preferences?: ColorPreferences | null;
  id: string;
  program_id: Mode;
  tier_snapshot: Tier;
  owner_id: string;
  email: string;
  customer_id: string | null;
  subscription_id: string | null;
  status: string;
  seat_held: boolean;
  cancel_at_period_end: boolean;
  period_start: Date | null;
  period_end: Date | null;
  address: Address | null;
  address_valid: boolean;
};
export type Reservation = {
  shipping_address?: Address | null;
  shipping_quote_id?: string | null;
  preferences?: ColorPreferences | null;
  id: string;
  program_id: Mode;
  membership_id: string;
  edition_id: string;
  tier_snapshot: Tier;
  request_key: string;
  session_id: string | null;
  session_url: string | null;
  state: string;
  expires_at: Date;
  created_at: Date;
};
export type Fulfillment = {
  ship_by?: Date | null;
  id: string;
  invoice_id: string;
  membership_id: string;
  edition_id: string;
  state: string;
  address_snapshot: Address | null;
  locked_at: Date | null;
  shipped_at: Date | null;
  tracking_number: string | null;
  tracking_url: string | null;
};
export type Receipt = {
  id: string;
  type: string;
  object_id: string;
  livemode: boolean;
};
export type Subscription = {
  id: string;
  customer: string;
  reservation: string | null;
  status: string;
  livemode: boolean;
  cancelAtPeriodEnd: boolean;
  start: number;
  end: number;
  validPlan: boolean;
  priceId: string | null;
};
export type Session = {
  setupIntent?: string | null;
  id: string;
  customer: string;
  subscription: string | null;
  reservation: string | null;
  state: "open" | "complete" | "expired" | null;
  url: string | null;
  livemode: boolean;
};
export type Invoice = {
  autoAdvance?: boolean;
  hostedUrl?: string | null;
  collectionMethod?: string;
  metadata?: Record<string, string>;
  id: string;
  subscription: string | null;
  customer: string;
  livemode: boolean;
  status: string | null;
  reason: string | null;
  amountPaid: number;
  total: number;
  taxExclusive?: number;
  totalExcludingTax?: number | null;
  automaticTaxComplete?: boolean;
  amountDue: number;
  currency: string;
  paidAt: number | null;
  lines: Array<{
    id?: string;
    metadata?: Record<string, string>;
    invoice: string | null;
    price: string | null;
    product: string | null;
    subscription: string | null;
    recurring: boolean;
    proration: boolean;
    quantity: number | null;
    amount: number;
    currency: string;
    start: number;
    end: number;
  }>;
  adjusted: boolean;
  paymentVerified: boolean;
  financialState: "paid" | "review" | "refunded" | "disputed";
};
export interface BillingGateway {
  managed?: import("./managed-stripe").ManagedBilling;
  shippingPrice?(
    p: Program,
    amount: number,
  ): Promise<NonNullable<Tier["shipping"]>>;
  checkConfiguration(p: Program): Promise<void>;
  createCustomer(m: Membership): Promise<string>;
  customer(id: string): Promise<{ address: Address | null; livemode: boolean }>;
  createSession(p: Program, m: Membership, r: Reservation): Promise<Session>;
  session(id: string): Promise<Session>;
  expireSession(id: string): Promise<Session>;
  findSession(customer: string, reservation: string): Promise<Session | null>;
  subscription(id: string, p: Program, savedTier?: Tier): Promise<Subscription>;
  invoice(id: string, p: Program): Promise<Invoice>;
  affectedInvoices(type: string, objectId: string): Promise<string[]>;
  portal(p: Program, customer: string, managed?: boolean): Promise<string>;
}
export class ClubError extends Error {
  constructor(
    public code: string,
    public status = 409,
  ) {
    super(code);
  }
}
export const checkoutInput = z
  .object({
    requestKey: z.string().uuid(),
    tierId: z.enum(tierIds),
    termsVersion: z.string().min(1),
    country: z.string().regex(/^[A-Z]{2}$/),
    consent: z.literal(true),
    preferences: preferencesSchema.optional(),
    shippingQuoteId: z.string().uuid().optional(),
    billingMonths: z
      .union([z.literal(1), z.literal(6), z.literal(12)])
      .optional(),
  })
  .strict();
export function addressValid(a: Address | null, countries: string[]): boolean {
  return (
    !!a &&
    countries.includes(a.country) &&
    [a.name, a.line1, a.city, a.postal_code].every(
      (v) => typeof v === "string" && v.trim().length > 0 && v.length <= 250,
    ) &&
    (!["US", "CA"].includes(a.country) || !!a.state.trim())
  );
}
export function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe =
    /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) || /^[\t\r\n]/.test(raw)
      ? `'${raw}`
      : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function dateLabel(value: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Boise",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
export function money(p: { amount: number; currency: string }): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currency,
  }).format(p.amount / 100);
}
