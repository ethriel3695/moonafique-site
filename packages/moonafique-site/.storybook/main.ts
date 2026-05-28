import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: [
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-mcp")
  ],

  framework: {
    name: getAbsolutePath("@storybook/nextjs-vite"),
    options: {},
  },

  features: {
    experimentalRSC: true,
  },

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },

  staticDirs: ['../public']
};
export default config;

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
