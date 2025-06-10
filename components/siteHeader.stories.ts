import type { Meta, StoryObj } from '@storybook/react';
// import { fn } from '@storybook/test';

import { SiteHeader } from './siteHeader';

const meta = {
  title: 'Organism/Header',
  component: SiteHeader,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    signInUrl: '/auth/signin',
    user: null,
  },
};
