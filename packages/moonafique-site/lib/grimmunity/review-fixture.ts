// Presentation-only fixtures shared by local review screens. Never used for billing or authorization.
import { sandboxTiers, tierAllocations } from "./tiers";
import { launchPlan } from "./launch-plan";
import type { Edition, Membership, Program } from "./model";
import type { AccountView, OrderView } from "./queries";
const date = (s: string) => new Date(s);
export const reviewProgram: Program = {
  id: "sandbox",
  enabled: true,
  approved_at: null,
  tiers: sandboxTiers,
  currency: "usd",
  member_cap: launchPlan.memberCap,
  retained_copies: 1,
  countries: ["US"],
  shipping_text:
    "Shipping is quoted through Shippo for your address and renews monthly with each membership.",
  tax_mode: "not_collecting",
  terms_version: "sandbox-review-v1",
  cancellation_text:
    "Cancel before the next renewal in your account. Already-paid editions remain due unless refunded.",
  recovery_text:
    "Test policy: payments recovered before the edition cutoff may be packed; later payments require review.",
  support_email: "support@example.invalid",
  portal_configuration_id: "bpc_fixture",
  timezone: "America/Boise",
};
export const reviewEdition: Edition = {
  tier_allocations: tierAllocations(sandboxTiers),
  id: "11111111-1111-4111-8111-111111111111",
  program_id: "sandbox",
  month: launchPlan.firstShipmentMonth,
  title: "November subscriber design",
  capacity: launchPlan.memberCap,
  retained_copies: 1,
  enrollment_open: date("2026-11-01T06:00:00Z"),
  enrollment_close: date("2026-11-06T07:00:00Z"),
  period_open: date("2026-11-01T06:00:00Z"),
  period_close: date("2026-12-01T07:00:00Z"),
  payment_cutoff: date("2026-11-11T07:00:00Z"),
  address_cutoff: date("2026-11-12T07:00:00Z"),
  dispatch_start: date("2026-11-12T07:00:00Z"),
  dispatch_end: date("2026-11-19T07:00:00Z"),
  state: "open",
};
const address = {
  name: "Sandbox Collector",
  line1: "123 Fixture Lane",
  line2: "",
  city: "Boise",
  state: "ID",
  postal_code: "83702",
  country: "US",
};
export const reviewMember: Membership = {
  id: "22222222-2222-4222-8222-222222222222",
  program_id: "sandbox",
  tier_snapshot: sandboxTiers[0],
  preferences: {
    preferred_colors: ["Purple", "Teal", "Blue", "Black", "Pink", "White"],
    avoided_colors: ["Orange"],
  },
  owner_id: "user_fixture",
  email: "collector@example.invalid",
  customer_id: "cus_fixture",
  subscription_id: "sub_fixture",
  status: "active",
  seat_held: true,
  cancel_at_period_end: false,
  period_start: date("2026-12-02T18:00:00Z"),
  period_end: date("2027-01-02T18:00:00Z"),
  address,
  address_valid: true,
};
const nov: OrderView = {
  id: "33333333-3333-4333-8333-333333333333",
  invoice_id: "in_november_fixture",
  tier_snapshot: sandboxTiers[0],
  membership_id: reviewMember.id,
  edition_id: reviewEdition.id,
  state: "shipped",
  address_snapshot: address,
  locked_at: date("2026-11-12T19:00:00Z"),
  shipped_at: date("2026-11-13T19:00:00Z"),
  tracking_number: "SANDBOX-NOV-001",
  tracking_url: null,
  title: "November subscriber design",
  month: "2026-11",
  dispatch_start: reviewEdition.dispatch_start,
  dispatch_end: reviewEdition.dispatch_end,
  address_cutoff: reviewEdition.address_cutoff,
  financial_state: "paid",
  review_reason: null,
  amount_paid: sandboxTiers[0].amount + 600,
  currency: "usd",
  email: reviewMember.email,
  address,
};
const dec: OrderView = {
  ...nov,
  id: "44444444-4444-4444-8444-444444444444",
  invoice_id: "in_december_fixture",
  title: "December subscriber design",
  month: "2026-12",
  state: "paid",
  address_snapshot: null,
  locked_at: null,
  shipped_at: null,
  tracking_number: null,
  dispatch_start: date("2026-12-12T07:00:00Z"),
  dispatch_end: date("2026-12-19T07:00:00Z"),
  address_cutoff: date("2026-12-12T07:00:00Z"),
};
export const reviewAccount: AccountView = {
  membership: reviewMember,
  orders: [dec, nov],
  exceptions: [],
};
export const reviewStaff: OrderView[] = [
  { ...nov, state: "ready", shipped_at: null, tracking_number: null },
  {
    ...nov,
    id: "55555555-5555-4555-8555-555555555555",
    invoice_id: "in_second_fixture",
    state: "needs_address",
    email: "second-collector@example.invalid",
    address: null,
    address_snapshot: null,
    locked_at: null,
    shipped_at: null,
    tracking_number: null,
  },
];
