import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StaffOrders } from "./views";
import {
  StoryFrame,
  storyOrder,
  storyShippingLabel,
  storyTierIds,
} from "./story-fixtures";

const meta = {
  title: "Memberships/Packing and fulfillment",
  component: StaffOrders,
  parameters: {
    layout: "fullscreen",
    controls: { exclude: ["orders", "fixture"] },
  },
  decorators: [
    (Story) => (
      <StoryFrame
        title="Packing and fulfillment"
        note="Compare the saved contents, color preferences, paid total, delivery address, and packing status for each membership."
      >
        <Story />
      </StoryFrame>
    ),
  ],
  render: (args) => <StaffOrders {...args} fixture />,
  args: { orders: storyTierIds.map((id) => storyOrder(id)) },
  argTypes: { fixture: { control: false } },
} satisfies Meta<typeof StaffOrders>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllFourPaidOrders: Story = {};
export const StarterColorPreferences: Story = {
  args: { orders: [storyOrder("grimm_starter")] },
};
export const ReadyWithShippingRates: Story = {
  args: {
    orders: [
      {
        ...storyOrder("grimm_keeper", "ready"),
        shipping_label: storyShippingLabel(),
      },
    ],
  },
};
export const MissingAddress: Story = {
  args: {
    orders: [{ ...storyOrder("aceo_prints", "needs_address"), address: null }],
  },
};
export const PaymentHold: Story = {
  args: {
    orders: [
      {
        ...storyOrder("aceo_originals", "hold"),
        financial_state: "disputed",
        review_reason: "financial_adjustment",
      },
    ],
  },
};
export const Shipped: Story = {
  args: { orders: [storyOrder("grimm_keeper", "shipped")] },
};
export const NoPaidOrders: Story = { args: { orders: [] } };
