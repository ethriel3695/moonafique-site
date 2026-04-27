import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Logo } from './logo';

const meta = {
  title: 'Atoms/Logo',
  component: Logo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    className: 'h-24 w-24 text-foreground',
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HeaderScale: Story = {
  args: {
    className: 'h-10 w-10 text-foreground',
  },
};
