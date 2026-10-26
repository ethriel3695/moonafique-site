import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ShippingPanel } from "./shipping-panel";
import { StoryFrame, storyOrder, storyShippingLabel } from "./story-fixtures";

const quoted = storyShippingLabel();
const purchased = {
  ...quoted,
  state: "purchased" as const,
  rate_id: quoted.rates[0].id,
  amount: 625,
  transaction_id: "story_transaction",
  label_url: "https://example.invalid/sample-label.pdf",
  tracking_number: "EXAMPLE-TRACKING-001",
  tracking_url: "https://example.invalid/tracking",
};
const meta = {
  title: "Memberships/Shippo labels",
  component: ShippingPanel,
  parameters: {
    controls: { exclude: ["id", "label", "fixture"] },
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Staff label states using the actual shipping panel. Service selection works; API calls, downloads, purchases, and dispatch actions are disabled.",
      },
    },
  },
  decorators: [
    (Story) => (
      <StoryFrame title="Shipping label examples">
        <div className="max-w-xl rounded-3xl border bg-card p-6">
          <Story />
        </div>
      </StoryFrame>
    ),
  ],
  render: (args) => <ShippingPanel {...args} fixture />,
  args: { id: storyOrder("grimm_keeper").id, label: quoted },
  argTypes: { fixture: { control: false } },
} satisfies Meta<typeof ShippingPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NoRatesYet: Story = { args: { label: null } };
export const RatesAvailable: Story = {};
export const ChooseAnotherService: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "Shipping service" }),
      "rate_story_ups",
    );
    await expect(
      canvas.getByRole("button", { name: "Create test label · $6.79" }),
    ).toBeDisabled();
  },
};
export const ACEOMailerRates: Story = {
  args: {
    id: storyOrder("aceo_prints").id,
    label: storyShippingLabel("aceo_prints"),
  },
};
export const LabelPurchasedAwaitingDispatch: Story = {
  args: { label: purchased },
};
export const PurchaseInProgress: Story = {
  args: {
    label: {
      ...quoted,
      state: "purchasing",
      rate_id: quoted.rates[0].id,
      amount: 625,
    },
  },
};
export const PurchaseOutcomeUnknown: Story = {
  args: {
    label: {
      ...quoted,
      state: "review",
      rate_id: quoted.rates[0].id,
      amount: 625,
    },
  },
};
export const RecordedTransactionNeedsReview: Story = {
  args: {
    label: {
      ...quoted,
      state: "review",
      rate_id: quoted.rates[0].id,
      amount: 625,
      transaction_id: "story_transaction",
    },
  },
};
