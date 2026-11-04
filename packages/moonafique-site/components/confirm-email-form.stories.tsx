import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ConfirmEmailForm } from "./confirm-email-form";

const meta = {
  title: "First release/Email confirmation",
  component: ConfirmEmailForm,
  args: { confirm: async () => "launch" },
} satisfies Meta<typeof ConfirmEmailForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmLaunchEmail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm email" }));
    await expect(await canvas.findByRole("status")).toHaveTextContent("You’re on the membership launch list.");
  },
};

export const ExpiredLink: Story = {
  args: { confirm: async () => { throw new Error("This confirmation link is invalid or has expired. Request a new email from the signup form."); } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm email" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("invalid or has expired");
  },
};
