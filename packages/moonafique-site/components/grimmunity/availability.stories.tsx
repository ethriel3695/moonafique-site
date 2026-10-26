import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { OfferView } from "./views";
import {
  StoryFrame,
  storyAvailability,
  storyEdition,
  storyNow,
  storyProgram,
} from "./story-fixtures";

type Args = { collection: "aceo" | "grimm"; spotsLeft: number };
function Countdown({ collection, spotsLeft }: Args) {
  const [remaining, setRemaining] = useState(spotsLeft);
  const tier = collection === "aceo" ? "aceo_prints" : "grimm_keeper";
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-5">
        <p className="text-sm">
          Try a spot being claimed. This changes the example only.
        </p>
        <Button
          disabled={remaining === 0}
          onClick={() => setRemaining((count) => Math.max(0, count - 1))}
        >
          Preview one spot being claimed
        </Button>
      </div>
      <OfferView
        fixture
        club={collection}
        now={storyNow}
        program={storyProgram}
        edition={storyEdition}
        availability={{
          ...storyAvailability,
          [tier]: { remaining, full: remaining === 0 },
        }}
      />
    </>
  );
}
const meta = {
  title: "Memberships/Spots left",
  component: Countdown,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Preview the spot counter and sold-out states. Live pages read actual database counts on load, every 30 seconds while visible, and when returning to the page. All counts here are fictional.",
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
  render: (args) => <Countdown key={JSON.stringify(args)} {...args} />,
  args: { collection: "aceo", spotsLeft: 24 },
  argTypes: {
    collection: { control: "radio", options: ["aceo", "grimm"] },
    spotsLeft: { control: { type: "number", min: 0, max: 24 } },
  },
} satisfies Meta<typeof Countdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PrintsCountingDown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("24 spots left")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Preview one spot being claimed" }),
    );
    await expect(canvas.getByText("23 spots left")).toBeVisible();
  },
};
export const LastPrintSpot: Story = {
  args: { spotsLeft: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1 spot left")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Preview one spot being claimed" }),
    );
    await expect(
      canvas.getByRole("radio", { name: "ACEO Prints" }),
    ).toBeDisabled();
    await expect(canvas.getAllByText("Sold out").length).toBeGreaterThan(0);
  },
};
export const LastKeeperSpot: Story = {
  args: { collection: "grimm", spotsLeft: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1 spot left")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Preview one spot being claimed" }),
    );
    await expect(
      canvas.getByRole("radio", { name: "Grimm Keeper" }),
    ).toBeDisabled();
    await expect(canvas.getAllByText("Vaulted for now").length).toBeGreaterThan(
      0,
    );
  },
};
