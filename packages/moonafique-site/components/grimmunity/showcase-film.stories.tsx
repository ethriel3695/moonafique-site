import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { GrimShowcaseFilm } from "./showcase-film";

const meta = {
  component: GrimShowcaseFilm,
  parameters: { layout: "centered" },
} satisfies Meta<typeof GrimShowcaseFilm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowcaseFilm: Story = {
  play: async ({ canvas }) => {
    const film = canvas.getByLabelText("Grimmfest: August through October Grim of the Month showcase");
    await expect(film).toHaveAttribute("poster", "/showcase/grim-of-the-month-film-poster.jpg");
    await expect(canvas.getByRole("button", { name: /^(play|pause) video$/i })).toBeVisible();
  },
};
