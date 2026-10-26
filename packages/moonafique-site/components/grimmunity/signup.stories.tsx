import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { money } from "@/lib/grimmunity/model";
import { sandboxTiers } from "@/lib/grimmunity/tiers";
import { JoinForm, type JoinFormFixtureState } from "./actions";
import {
  StoryFrame,
  storyAddress,
  storyAvailability,
  storyPreferences,
  storyTierIds,
  type StoryTierId,
} from "./story-fixtures";

type Args = {
  membership: StoryTierId;
  shippingDollars: number;
  quoteState: "not_quoted" | "quoted" | "loading" | "failed" | "expired";
  showAllTiers: boolean;
  soldOut: boolean;
  taxAdded: boolean;
};
function SignupExample(args: Args) {
  const tier = sandboxTiers.find((t) => t.id === args.membership)!;
  const cents = Math.round(args.shippingDollars * 100);
  const fixtureState: JoinFormFixtureState = {
    tierId: tier.id,
    address: storyAddress,
    preferredColors: storyPreferences.preferred_colors,
    avoidedColors: storyPreferences.avoided_colors.join(", "),
    ...(args.quoteState === "quoted"
      ? {
          quote: {
            id: "30000000-0000-4000-8000-000000000001",
            rate: {
              amount: cents,
              carrier: "USPS",
              service: "Ground Advantage (example)",
            },
            monthlyTotal: tier.amount + cents,
          },
        }
      : {}),
    quoting: args.quoteState === "loading",
    error:
      args.quoteState === "failed"
        ? "We could not get a shipping rate for this address. Check the address or contact Moonafique."
        : args.quoteState === "expired"
          ? "This shipping quote has expired. Calculate shipping again before continuing."
          : undefined,
  };
  return (
    <StoryFrame
      title={
        args.showAllTiers
          ? "Choose a monthly membership"
          : `${tier.name} monthly cost`
      }
      note="Use Controls to change the membership, example shipping amount, quote state, or sales-tax display. The shipping amount is a recurring monthly charge."
    >
      <JoinForm
        key={JSON.stringify(args)}
        fixture
        fixtureState={fixtureState}
        tiers={args.showAllTiers ? sandboxTiers : [tier]}
        currency="usd"
        countries={["US"]}
        termsVersion="storybook-only"
        taxAdded={args.taxAdded}
        availability={{
          ...storyAvailability,
          ...(args.soldOut ? { [tier.id]: { full: true, remaining: 0 } } : {}),
        }}
      />
    </StoryFrame>
  );
}
const meta = {
  title: "Memberships/Signup and monthly totals",
  component: SignupExample,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The real signup form with presentation-only states. Every action remains disabled. Change shippingDollars in Controls to compare the recurring total; tax is added at checkout when shown.",
      },
    },
  },
  args: {
    membership: "grimm_starter",
    shippingDollars: 6.25,
    quoteState: "quoted",
    showAllTiers: false,
    soldOut: false,
    taxAdded: false,
  },
  argTypes: {
    membership: {
      name: "Membership",
      control: {
        type: "select",
        labels: {
          grimm_starter: "Grimm Starter · $15",
          grimm_keeper: "Grimm Keeper · $30",
          aceo_prints: "ACEO Prints · $10",
          aceo_originals: "ACEO Originals · $20",
        },
      },
      options: storyTierIds,
    },
    shippingDollars: {
      name: "Shipping / month ($)",
      control: { type: "number", min: 0.01, max: 50, step: 0.25 },
      description:
        "Illustrative monthly postage in dollars; not a live Shippo quote.",
    },
    quoteState: {
      name: "Shipping quote state",
      control: "select",
      options: ["not_quoted", "quoted", "loading", "failed", "expired"],
    },
    showAllTiers: { name: "Show all membership choices", control: "boolean" },
    soldOut: { name: "Selected membership is full", control: "boolean" },
    taxAdded: { name: "Sales tax added at checkout", control: "boolean" },
  },
} satisfies Meta<typeof SignupExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChooseYourMembership: Story = {
  args: { showAllTiers: true, quoteState: "not_quoted" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    if (!args.showAllTiers) return;
    await userEvent.click(canvas.getByRole("radio", { name: "Grimm Keeper" }));
    await expect(
      canvas.queryByText("Make the mystery a little more you"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Calculate shipping to continue" }),
    ).toBeDisabled();
  },
};
export const StarterBeforeShipping: Story = {
  args: { quoteState: "not_quoted" },
};
export const StarterWithShipping: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    if (args.quoteState === "quoted") {
      const tier = sandboxTiers.find((t) => t.id === args.membership)!;
      const total = money({
        amount: tier.amount + Math.round(args.shippingDollars * 100),
        currency: "usd",
      });
      await expect(
        canvas.getByText(
          `Monthly ${args.taxAdded ? "subtotal" : "total"}: ${total}${args.taxAdded ? " plus applicable sales tax" : ""}`,
        ),
      ).toBeVisible();
      if (!args.soldOut)
        await expect(
          canvas.getByRole("button", {
            name: "Fixture preview · checkout disabled",
          }),
        ).toBeDisabled();
    }
    if (args.membership === "grimm_starter")
      await expect(
        canvas.getByRole("combobox", { name: "Preferred color 1" }),
      ).toHaveValue("Purple");
  },
};
export const KeeperWithShipping: Story = {
  args: { membership: "grimm_keeper" },
};
export const ACEOPrintsWithShipping: Story = {
  args: { membership: "aceo_prints" },
};
export const ACEOOriginalsWithShipping: Story = {
  args: { membership: "aceo_originals" },
};
export const HigherShippingCost: Story = {
  args: { membership: "grimm_keeper", shippingDollars: 8.95 },
};
export const LowerMailerShippingExample: Story = {
  args: { membership: "aceo_prints", shippingDollars: 4.75 },
  parameters: {
    docs: {
      description: {
        story:
          "A hypothetical lower mailer rate, not a verified price. The actual 6 oz mailer can cost the same as the 8 oz Grimm box.",
      },
    },
  },
};
export const SalesTaxAddedAtCheckout: Story = {
  args: { membership: "grimm_keeper", taxAdded: true },
};
export const LoadingShippingQuote: Story = { args: { quoteState: "loading" } };
export const ShippingQuoteFailed: Story = { args: { quoteState: "failed" } };
export const ShippingQuoteExpired: Story = { args: { quoteState: "expired" } };
export const KeeperSoldOut: Story = {
  args: { membership: "grimm_keeper", soldOut: true },
};
