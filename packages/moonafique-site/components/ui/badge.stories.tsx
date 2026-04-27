import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Badge } from './badge';

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CoreVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Featured</Badge>
      <Badge variant="secondary">Collector favorite</Badge>
      <Badge variant="outline">Made in-house</Badge>
      <Badge variant="destructive">Low stock</Badge>
    </div>
  ),
};

export const ProductStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="madeToOrder">Made to Order</Badge>
      <Badge variant="comingSoon">Coming Soon</Badge>
      <Badge variant="limitedEdition">Limited Edition</Badge>
      <Badge variant="new">New</Badge>
      <Badge variant="featured">Featured</Badge>
      <Badge variant="onSale">On Sale</Badge>
      <Badge variant="soldOut">Sold Out</Badge>
    </div>
  ),
};