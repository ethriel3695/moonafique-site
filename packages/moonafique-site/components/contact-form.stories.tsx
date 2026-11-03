import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, fn, waitFor } from "storybook/test";
import { ContactPageView } from "./contact-page";
const meta = {
  title: "First release/Contact",
  component: ContactPageView,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  args: { submitMessage: fn(async () => {}) },
} satisfies Meta<typeof ContactPageView>;
export default meta;
type Story = StoryObj<typeof meta>;
async function fill(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText("Name"), "A Collector");
  await userEvent.type(
    canvas.getByLabelText("Email"),
    "collector@example.invalid",
  );
  await userEvent.type(
    canvas.getByLabelText("Subject"),
    "A question about a piece",
  );
  await userEvent.type(
    canvas.getByLabelText("Message"),
    "Could you tell me more about the painted finish?",
  );
  return canvas;
}
export const Default: Story = {};
export const Sent: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = await fill(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }));
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Your message has been sent.",
    );
    await expect(args.submitMessage).toHaveBeenCalled();
  },
};
export const DeliveryFailure: Story = {
  args: {
    submitMessage: fn(async () => {
      throw new Error("We couldn’t send your message. Please try again.");
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = await fill(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Your message is still in the form.",
    );
    await expect(canvas.getByLabelText("Message")).toHaveValue(
      "Could you tell me more about the painted finish?",
    );
    await expect(
      canvas.getByRole("button", { name: "Send message" }),
    ).toBeEnabled();
  },
};
export const Sending: Story = {
  args: { submitMessage: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvasElement }) => {
    const canvas = await fill(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Sending…" })).toBeDisabled(),
    );
  },
};
