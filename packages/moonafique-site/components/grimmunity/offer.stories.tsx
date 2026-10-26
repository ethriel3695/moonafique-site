import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { OfferView } from "./views";
import {
  StoryFrame,
  storyAvailability,
  storyEdition,
  storyNow,
  storyProgram,
} from "./story-fixtures";

const meta = {
  title: "Memberships/Offer and availability",
  component: OfferView,
  parameters: {
    controls: { include: ["club", "interestEnabled"] },
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The separate Grimmunity and ACEO membership pages with fixed November example dates. Compare each collection’s tiers, enrollment, and availability without connecting billing.",
      },
    },
  },
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: (args) => <OfferView {...args} fixture />,
  args: {
    club: "grimm",
    program: storyProgram,
    edition: storyEdition,
    now: storyNow,
    availability: storyAvailability,
  },
  argTypes: {
    club: { control: "radio", options: ["grimm", "aceo"] },
    fixture: { control: false },
    now: { control: false },
  },
} satisfies Meta<typeof OfferView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const EnrollmentClosed: Story = {
  args: { program: { ...storyProgram, enabled: false }, interestEnabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Grimm Starter" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Grimm Keeper" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "ACEO Prints" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Explore ACEOs" }),
    ).toHaveAttribute("href", "/aceos");
  },
};
export const EnrollmentOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("radio")).toHaveLength(2);
    await expect(
      canvas.getByRole("radio", { name: "Grimm Starter" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("radio", { name: "ACEO Prints" }),
    ).not.toBeInTheDocument();
  },
};
export const ACEOEnrollmentClosed: Story = {
  args: {
    club: "aceo",
    program: { ...storyProgram, enabled: false },
    interestEnabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "ACEO Prints" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "ACEO Originals" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "Grimm Starter" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("heading", {
        name: "A little look into our Grim world.",
      }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Explore Grimmunity" }),
    ).toHaveAttribute("href", "/grimmunity");
  },
};
export const ACEOEnrollmentOpen: Story = {
  args: { club: "aceo" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("radio")).toHaveLength(2);
    await expect(
      canvas.getByRole("radio", { name: "ACEO Prints" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("radio", { name: "Grimm Starter" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText(/Grimm Keeper: 12 members/),
    ).not.toBeInTheDocument();
  },
};
export const LastKeeperPlace: Story = {
  args: {
    availability: {
      ...storyAvailability,
      grimm_keeper: { full: false, remaining: 1 },
    },
  },
};
export const KeeperVaulted: Story = {
  args: {
    availability: {
      ...storyAvailability,
      grimm_keeper: { full: true, remaining: 0 },
    },
  },
};
export const ACEOPrintsFull: Story = {
  args: {
    club: "aceo",
    availability: {
      ...storyAvailability,
      aceo_prints: { full: true, remaining: 0 },
    },
  },
};
export const ACEOOriginalsFull: Story = {
  args: {
    club: "aceo",
    availability: {
      ...storyAvailability,
      aceo_originals: { full: true, remaining: 0 },
    },
  },
};
export const BothACEOTiersFull: Story = {
  args: {
    club: "aceo",
    availability: {
      aceo_prints: { full: true, remaining: 0 },
      aceo_originals: { full: true, remaining: 0 },
    },
  },
};
export const OnlyStarterAvailable: Story = {
  args: {
    availability: {
      grimm_starter: { full: false, remaining: null },
      grimm_keeper: { full: true, remaining: 0 },
      aceo_prints: { full: true, remaining: 0 },
      aceo_originals: { full: true, remaining: 0 },
    },
  },
};
export const KeeperVaultedWhileEnrollmentClosed: Story = {
  args: {
    program: { ...storyProgram, enabled: false },
    availability: {
      ...storyAvailability,
      grimm_keeper: { full: true, remaining: 0 },
    },
  },
};
export const ACEOAvailabilityUnknown: Story = {
  args: {
    club: "aceo",
    program: { ...storyProgram, enabled: false },
    availability: {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("24 spots")).toBeVisible();
    await expect(canvas.queryByText(/spots left/)).not.toBeInTheDocument();
  },
};
