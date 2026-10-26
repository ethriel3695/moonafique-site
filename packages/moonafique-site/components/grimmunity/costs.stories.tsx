import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { money } from "@/lib/grimmunity/model";
import { monthlyAmount } from "@/lib/grimmunity/tiers";
import { aceoParcel, grimmParcel } from "@/lib/grimmunity/package-profiles";
import { StoryFrame, storyTier, storyTierIds } from "./story-fixtures";

type Args = {
  grimmShippingDollars: number;
  aceoShippingDollars: number;
  keeperAndPrintsOnly: boolean;
};
function CostComparison({
  grimmShippingDollars,
  aceoShippingDollars,
  keeperAndPrintsOnly,
}: Args) {
  const ids = keeperAndPrintsOnly
    ? (["grimm_keeper", "aceo_prints"] as const)
    : storyTierIds;
  const rows = ids.map((id) => {
    const grimm = id.startsWith("grimm_");
    const shipping = Math.round(
      (grimm ? grimmShippingDollars : aceoShippingDollars) * 100,
    );
    const tier = storyTier(id, shipping),
      parcel = grimm ? grimmParcel : aceoParcel;
    return { tier, shipping, parcel, total: monthlyAmount(tier)! };
  });
  return (
    <StoryFrame note="Change the two shipping amounts in Controls. Prices come from the current membership configuration; postage values are examples. Applicable sales tax is additional.">
      <h1 className="mb-3 text-3xl">
        {keeperAndPrintsOnly
          ? "One Grimm + one ACEO membership"
          : "Compare the monthly cost"}
      </h1>
      <p className="mb-6 text-sm leading-6">
        Each subscription has its own shipping charge and shipment. A smaller
        ACEO mailer does not guarantee cheaper postage.
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">
            Monthly membership, example shipping, and recurring subtotal before
            tax
          </caption>
          <thead className="bg-primary/5">
            <tr>
              {[
                "Membership",
                "Membership / month",
                "Shipping / month",
                "Monthly subtotal",
                "Packed profile",
              ].map((label) => (
                <th key={label} scope="col" className="p-4 font-bold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ tier, shipping, total, parcel }) => (
              <tr key={tier.id} className="border-t">
                <th scope="row" className="p-4">
                  {tier.name}
                </th>
                <td className="p-4">
                  {money({ amount: tier.amount, currency: "usd" })}
                </td>
                <td className="p-4">
                  {money({ amount: shipping, currency: "usd" })}
                </td>
                <td className="p-4 font-bold text-primary">
                  {money({ amount: total, currency: "usd" })}
                </td>
                <td className="p-4">
                  {parcel.length} × {parcel.width} × {parcel.height} in ·{" "}
                  {parcel.weight} oz
                </td>
              </tr>
            ))}
          </tbody>
          {keeperAndPrintsOnly && (
            <tfoot className="border-t bg-primary/5">
              <tr>
                <th scope="row" className="p-4" colSpan={3}>
                  Combined monthly subtotal · two separate shipments
                </th>
                <td className="p-4 font-bold">
                  {money({
                    amount: rows.reduce((sum, row) => sum + row.total, 0),
                    currency: "usd",
                  })}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </StoryFrame>
  );
}
const meta = {
  title: "Memberships/Cost comparison",
  component: CostComparison,
  parameters: { layout: "fullscreen" },
  args: {
    grimmShippingDollars: 6.25,
    aceoShippingDollars: 6.25,
    keeperAndPrintsOnly: false,
  },
  argTypes: {
    grimmShippingDollars: {
      name: "Grimm shipping / month ($)",
      control: { type: "number", min: 0, max: 50, step: 0.25 },
    },
    aceoShippingDollars: {
      name: "ACEO shipping / month ($)",
      control: { type: "number", min: 0, max: 50, step: 0.25 },
    },
    keeperAndPrintsOnly: {
      name: "Show Keeper + ACEO Prints only",
      control: "boolean",
    },
  },
} satisfies Meta<typeof CostComparison>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AllFourMemberships: Story = {};
export const DifferentShippingCosts: Story = {
  args: { grimmShippingDollars: 7.5, aceoShippingDollars: 5.25 },
};
export const HigherCostDestination: Story = {
  args: { grimmShippingDollars: 8.95, aceoShippingDollars: 8.95 },
};
export const KeeperAndACEOPrints: Story = {
  args: { keeperAndPrintsOnly: true },
};
