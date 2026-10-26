import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AccountContent } from "./views";
import {
  StoryFrame,
  storyAccount,
  storyAddress,
  storyMember,
  storyOrder,
} from "./story-fixtures";

const meta = {
  title: "Memberships/Member account",
  component: AccountContent,
  parameters: {
    layout: "fullscreen",
    controls: { exclude: ["view", "fixture"] },
  },
  decorators: [
    (Story) => (
      <StoryFrame note="Paid edition amounts include the example $6.25 shipping charge. Billing portal and preference updates are disabled here.">
        <Story />
      </StoryFrame>
    ),
  ],
  render: (args) => <AccountContent {...args} fixture />,
  args: { view: storyAccount("grimm_starter") },
  argTypes: { fixture: { control: false } },
} satisfies Meta<typeof AccountContent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NoMembershipYet: Story = {
  args: { view: { membership: undefined, orders: [], exceptions: [] } },
};
export const Starter: Story = {};
export const Keeper: Story = { args: { view: storyAccount("grimm_keeper") } };
export const ACEOPrints: Story = {
  args: { view: storyAccount("aceo_prints") },
};
export const ACEOOriginals: Story = {
  args: { view: storyAccount("aceo_originals") },
};
export const GrimmAndACEOTogether: Story = {
  args: {
    view: {
      membership: storyMember("grimm_keeper"),
      memberships: [storyMember("grimm_keeper"), storyMember("aceo_prints")],
      orders: [storyOrder("grimm_keeper"), storyOrder("aceo_prints")],
      exceptions: [],
    },
  },
};
export const CancelingAtPeriodEnd: Story = {
  args: {
    view: {
      ...storyAccount("grimm_keeper"),
      membership: {
        ...storyMember("grimm_keeper"),
        cancel_at_period_end: true,
      },
    },
  },
};
export const CanceledWithPaidEdition: Story = {
  args: {
    view: {
      ...storyAccount("aceo_originals"),
      membership: {
        ...storyMember("aceo_originals"),
        status: "canceled",
        seat_held: false,
      },
    },
  },
};
export const DeliveryAddressNeeded: Story = {
  args: {
    view: {
      ...storyAccount("grimm_starter"),
      membership: {
        ...storyMember("grimm_starter"),
        address: null,
        address_valid: false,
      },
      orders: [
        { ...storyOrder("grimm_starter", "needs_address"), address: null },
      ],
    },
  },
};
export const PaymentNeedsAttention: Story = {
  args: {
    view: {
      ...storyAccount("aceo_prints"),
      membership: { ...storyMember("aceo_prints"), status: "past_due" },
      orders: [],
      exceptions: [
        {
          id: "story_exception",
          invoice_id: "in_story_failed",
          reason: "Payment failed",
          created_at: new Date("2026-12-02T18:00:00Z"),
          resolution: null,
          resolved_at: null,
        },
      ],
    },
  },
};
export const ShippedEdition: Story = {
  args: {
    view: {
      ...storyAccount("grimm_keeper"),
      orders: [storyOrder("grimm_keeper", "shipped")],
    },
  },
};
export const RefundHold: Story = {
  args: {
    view: {
      ...storyAccount("aceo_originals"),
      orders: [
        {
          ...storyOrder("aceo_originals", "hold"),
          financial_state: "refunded",
          review_reason: "financial_adjustment",
          address: storyAddress,
        },
      ],
    },
  },
};
