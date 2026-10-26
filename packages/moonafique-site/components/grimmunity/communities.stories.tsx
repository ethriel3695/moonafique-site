import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { CommunitiesView } from "./communities";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Memberships/Communities overview",
  component: CommunitiesView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
} satisfies Meta<typeof CommunitiesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BothCollections: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Explore Grimmunity" }),
    ).toHaveAttribute("href", "/grimmunity");
    await expect(
      canvas.getByRole("link", { name: "Explore ACEOs" }),
    ).toHaveAttribute("href", "/aceos");
    await expect(canvas.getByText("Grimm Starter")).toBeVisible();
    await expect(canvas.getByText("ACEO Originals")).toBeVisible();
  },
};
