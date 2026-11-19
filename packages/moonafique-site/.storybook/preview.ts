import { createElement } from "react";
import { FilmPlaybackContext } from "../components/grimmunity/showcase-film";
import { lora, manrope } from "../lib/site-fonts";
import type { Preview } from "@storybook/nextjs-vite";
import "@radix-ui/themes/styles.css";
import "../app/globals.css";

const preview: Preview = {
  decorators: [
    (Story) => {
      const capturing = typeof window !== "undefined" && (
        window.navigator.userAgent.includes("Chromatic") ||
        new URLSearchParams(window.location.search).get("chromatic") === "true"
      );
      return createElement(FilmPlaybackContext.Provider, { value: capturing ? "poster" : "auto" }, createElement(Story));
    },
    (Story) =>
      createElement(
        "div",
        {
          className: `${manrope.className} ${manrope.variable} ${lora.variable}`,
          style: { fontFamily: manrope.style.fontFamily },
        },
        createElement(Story),
      ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    nextjs: {
      appDirectory: true, // 👈 Set this
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
  tags: ["autodocs"],
};

export default preview;
