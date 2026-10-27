import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BillingSummary } from "./billing-summary";
import { JoinForm } from "./actions";
import {
  StoryFrame,
  storyAddress,
  storyMember,
  storyTier,
  storyTierIds,
  type StoryTierId,
} from "./story-fixtures";
import {
  membershipBilling,
  type BillingMonths,
} from "@/lib/grimmunity/billing-options";
import { noticeBody } from "@/lib/grimmunity/billing-notice";
import { reviewProgram } from "@/lib/grimmunity/review-fixture";
import type { AccountView } from "@/lib/grimmunity/queries";
import type { BillingCycle } from "@/lib/grimmunity/renewals";
import type { Membership } from "@/lib/grimmunity/model";

type Scenario =
  | "signup"
  | "first"
  | "noticed"
  | "waiting"
  | "quote"
  | "address"
  | "payment"
  | "canceled"
  | "refund"
  | "email";
type Args = {
  membership: StoryTierId;
  months: BillingMonths;
  scenario: Scenario;
  shipping: number;
};
function Example({ membership, months, scenario, shipping }: Args) {
  const base = storyTier(membership),
    amount = Math.round(shipping * 100);
  const options = ([1, 6, 12] as const).map((months) => {
    const plan = membershipBilling(base.amount, months);
    return {
      months,
      amount: plan.amount,
      discount: plan.discount,
      price_id:
        months === 1 ? base.price_id : `price_story_${membership}_${months}`,
    };
  });
  const tier = {
    ...base,
    billing_options: options,
    billing: options.find((option) => option.months === months)!,
  };
  const member: Membership = {
    ...storyMember(membership),
    tier_snapshot: tier,
    cancel_at_period_end: scenario === "canceled",
  };
  const cycle: BillingCycle & {
    notice_delivered_at: Date | null;
    notice_failed_at: Date | null;
  } = {
    invoice_id: "in_story_prepaid",
    membership_id: member.id,
    initial: scenario === "first",
    period_start: new Date("2026-12-02T18:00:00Z"),
    period_end: new Date("2027-01-02T18:00:00Z"),
    state:
      scenario === "first"
        ? "initial"
        : ["address", "payment", "refund"].includes(scenario)
          ? "hold"
          : scenario === "quote"
            ? "preparing"
            : "noticed",
    address_snapshot: storyAddress,
    parcel: { length: 8, width: 8, height: 8, weight: 8 },
    rate:
      scenario === "quote"
        ? null
        : {
            id: "rate_story",
            amount,
            currency: "usd",
            carrier: "USPS",
            service: "Ground Advantage",
            estimated_days: 4,
          },
    membership_amount:
      scenario === "first"
        ? tier.billing.amount
        : months === 1
          ? tier.amount
          : 0,
    shipping_amount: scenario === "quote" ? null : amount,
    tax_amount: scenario === "quote" ? null : 0,
    total:
      scenario === "quote"
        ? null
        : (scenario === "first"
            ? tier.billing.amount
            : months === 1
              ? tier.amount
              : 0) + amount,
    fingerprint: "storybook_only",
    invoice_url: "https://invoice.stripe.com/fixture",
    notice_id: "00000000-0000-4000-8000-000000000123",
    notice_version: 1,
    charge_at: scenario === "first" ? null : new Date("2026-12-10T12:00:00Z"),
    attempted_at:
      scenario === "payment" ? new Date("2026-12-10T12:00:00Z") : null,
    coverage_invoice_id: "in_story_initial",
    hold_reason:
      scenario === "payment"
        ? "payment_needs_attention"
        : scenario === "address"
          ? "shipping_address_changed"
          : scenario === "refund"
            ? "prepaid_payment_adjustment"
            : null,
    notice_delivered_at: ["waiting", "quote", "first"].includes(scenario)
      ? null
      : new Date("2026-12-02T18:00:00Z"),
    notice_failed_at: null,
  };
  const view: AccountView = {
    membership: member,
    orders: [],
    exceptions: [],
    billingCycles: [cycle],
    coverage:
      scenario === "first"
        ? []
        : [
            {
              invoice_id: "in_story_initial",
              membership_id: member.id,
              period_start: new Date("2026-11-02T18:00:00Z"),
              period_end: new Date(
                months === 12
                  ? "2027-11-02T18:00:00Z"
                  : months === 6
                    ? "2027-05-02T18:00:00Z"
                    : "2026-12-02T18:00:00Z",
              ),
              price_id: tier.billing.price_id,
              amount: tier.billing.amount,
              financial_state: scenario === "refund" ? "hold" : "paid",
            },
          ],
  };
  if (scenario === "signup")
    return (
      <JoinForm
        key={`${membership}-${months}`}
        fixture
        managedBilling
        tiers={[tier]}
        currency="usd"
        taxAdded
        termsVersion="story_only"
        countries={["US"]}
        fixtureState={{
          billingMonths: months,
          tierId: membership,
          address: storyAddress,
          preferredColors: ["Purple", "Teal", "Blue", "Black", "Pink", "White"],
          quote: {
            id: "story_only",
            rate: cycle.rate!,
            monthlyTotal: tier.amount + amount,
          },
        }}
      />
    );
  if (scenario === "email")
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border bg-card p-7">
        <h1 className="mb-6 text-3xl">Your seven-day billing notice</h1>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7">
          {noticeBody(
            { ...reviewProgram, support_email: "hello@moonafique.com" },
            member,
            cycle,
            cycle.charge_at!,
          )}
        </pre>
      </section>
    );
  return <BillingSummary member={member} view={view} fixture />;
}
const meta = {
  title: "Memberships/Prepaid billing and notices",
  component: Example,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <StoryFrame note="These examples use the actual signup, billing summary, and email copy. All charges, emails, and account actions are disabled.">
        <Story />
      </StoryFrame>
    ),
  ],
  args: {
    membership: "grimm_keeper",
    months: 12,
    scenario: "noticed",
    shipping: 6.95,
  },
  argTypes: {
    membership: { control: "select", options: storyTierIds },
    months: { control: "radio", options: [1, 6, 12] },
    scenario: {
      control: "select",
      options: [
        "signup",
        "first",
        "noticed",
        "waiting",
        "quote",
        "address",
        "payment",
        "canceled",
        "refund",
        "email",
      ],
    },
    shipping: { control: { type: "number", min: 0.01, step: 0.01 } },
  },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AnnualKeeperShippingOnly: Story = {};
export const FirstAnnualInvoice: Story = {
  args: { scenario: "first", shipping: 6.25 },
};
export const NoticeNotDelivered: Story = { args: { scenario: "waiting" } };
export const ShippingQuoteUnavailable: Story = { args: { scenario: "quote" } };
export const AddressChangedPaymentHeld: Story = {
  args: { scenario: "address" },
};
export const PaymentNeedsAuthentication: Story = {
  args: { scenario: "payment" },
};
export const AnnualCanceledKeepsDeliveries: Story = {
  args: { scenario: "canceled" },
};
export const PrepaidRefundHold: Story = { args: { scenario: "refund" } };
export const SevenDayEmail: Story = { args: { scenario: "email" } };
export const SixMonthStarterSignup: Story = {
  args: { membership: "grimm_starter", months: 6, scenario: "signup" },
};
export const AnnualACEOPrintsSignup: Story = {
  args: { membership: "aceo_prints", months: 12, scenario: "signup" },
};
export const MonthlyOriginals: Story = {
  args: { membership: "aceo_originals", months: 1 },
};
