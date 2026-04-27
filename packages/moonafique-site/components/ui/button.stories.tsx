import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LoaderCircle, ShoppingBag } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from './button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Add to cart',
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Remove</Button>
      <Button variant="link">Browse collection</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Cart">
        <ShoppingBag />
      </Button>
    </div>
  ),
};

export const BusyAndDisabled: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>
        <LoaderCircle className="animate-spin" />
        Adding...
      </Button>
      <Button disabled variant="secondary">
        Sold out
      </Button>
      <Button disabled variant="outline">
        Notify me
      </Button>
    </div>
  ),
};

export const Interactive: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /add to cart/i });

    await userEvent.click(button);

    await expect(args.onClick).toHaveBeenCalled();
    await expect(button).toHaveFocus();
  },
};