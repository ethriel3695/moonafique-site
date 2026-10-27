import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { membershipTiers } from "@/lib/grimmunity/tiers";
import { money } from "@/lib/grimmunity/model";
import { StoryFrame, type StoryTierId } from "./story-fixtures";

type Args = {
  membership: StoryTierId;
  months: 1 | 6 | 12;
  firstShipping: number;
  nextShipping: number;
};
function BillingProposal({
  membership,
  months,
  firstShipping,
  nextShipping,
}: Args) {
  const tier = membershipTiers.find((item) => item.id === membership)!;
  const discount = months === 12 ? 10 : months === 6 ? 5 : 0;
  const base = tier.amount * months;
  const membershipDue = Math.round((base * (100 - discount)) / 100);
  const firstPostage = Math.round(firstShipping * 100);
  const nextPostage = Math.round(nextShipping * 100);
  const price = (amount: number) => money({ amount, currency: "usd" });
  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border bg-card p-6 sm:p-9">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        Pricing proposal · not available for purchase
      </p>
      <h1 className="mt-4 text-4xl">{tier.name}</h1>
      <p className="mt-4 leading-7">
        {months === 1
          ? "Pay for your membership monthly."
          : `Prepay ${months} months of your membership and save ${discount}%.`}{" "}
        Your collection still arrives monthly. Shipping is quoted and billed
        separately each month.
      </p>
      <h2 className="mt-8 text-2xl">At signup</h2>
      <dl className="mt-4 divide-y">
        <div className="flex justify-between gap-4 py-3">
          <dt>
            {months === 1
              ? "First month’s membership"
              : `${months} months of membership`}
          </dt>
          <dd className="font-bold">{price(membershipDue)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between gap-4 py-3 text-primary">
            <dt>Membership savings ({discount}%)</dt>
            <dd>{price(base - membershipDue)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 py-3">
          <dt>First month’s shipping · example</dt>
          <dd>{price(firstPostage)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-4 text-xl font-bold">
          <dt>Total before tax</dt>
          <dd>{price(membershipDue + firstPostage)}</dd>
        </div>
      </dl>
      <div className="mt-6 rounded-2xl bg-primary/5 p-6">
        <h2 className="text-2xl">Example: the next month</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt>
              {months === 1 ? "Membership" : "Membership · already prepaid"}
            </dt>
            <dd>{months === 1 ? price(tier.amount) : price(0)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Shipping · example updated carrier rate</dt>
            <dd>{price(nextPostage)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-bold">
            <dt>Monthly total before tax</dt>
            <dd>{price((months === 1 ? tier.amount : 0) + nextPostage)}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm leading-6">
          The planned renewal notice shows the membership charge, shipping,
          applicable tax, total, and charge date at least seven days before
          automatic payment. These are sample shipping amounts.
        </p>
      </div>
      <p className="mt-5 text-sm leading-6 text-muted-foreground">
        The proposed discount applies to membership only. Shipping is additional
        for every monthly delivery. Prepaid renewal, cancellation, and
        fulfillment handling must pass testing before this option can open.
      </p>
    </section>
  );
}
const meta = {
  title: "Memberships/Billing options proposal",
  component: BillingProposal,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <StoryFrame note="The 5% six-month and 10% annual discounts are proposed for owner review. No prepaid Stripe prices or checkout options have been activated.">
        <Story />
      </StoryFrame>
    ),
  ],
  args: {
    membership: "grimm_starter",
    months: 6,
    firstShipping: 6.25,
    nextShipping: 6.95,
  },
  argTypes: {
    membership: {
      control: "select",
      options: membershipTiers.map((tier) => tier.id),
    },
    months: { control: "radio", options: [1, 6, 12] },
    firstShipping: { control: { type: "number", min: 0, step: 0.01 } },
    nextShipping: { control: { type: "number", min: 0, step: 0.01 } },
  },
} satisfies Meta<typeof BillingProposal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SixMonthStarter: Story = {};
export const AnnualKeeper: Story = {
  args: { membership: "grimm_keeper", months: 12 },
};
export const AnnualPrints: Story = {
  args: { membership: "aceo_prints", months: 12 },
};
export const SixMonthOriginals: Story = {
  args: { membership: "aceo_originals", months: 6 },
};
export const MonthlyComparison: Story = { args: { months: 1 } };
