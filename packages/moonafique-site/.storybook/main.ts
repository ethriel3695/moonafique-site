import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: [
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-mcp'
  ],

  framework: {
    name: '@storybook/nextjs-vite',
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
