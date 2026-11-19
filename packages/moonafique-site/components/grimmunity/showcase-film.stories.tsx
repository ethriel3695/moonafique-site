import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { FilmPosterOnlyContext, GrimShowcaseFilm } from "./showcase-film";

const meta = {
  component: GrimShowcaseFilm,
  parameters: { layout: "centered" },
} satisfies Meta<typeof GrimShowcaseFilm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowcaseFilm: Story = {};

export const CapturePoster: Story = {
  decorators: [
    (Story) => <FilmPosterOnlyContext.Provider value={true}><Story /></FilmPosterOnlyContext.Provider>,
  ],
  play: async ({ canvas }) => {
    const poster = canvas.getByRole("img", { name: /Grimmfest: August through October/ });
    await expect(poster).toHaveAttribute("src", "/showcase/grim-of-the-month-film-poster.jpg");
    await expect(canvas.getByRole("button", { name: "Play video" })).toBeVisible();
  },
};
