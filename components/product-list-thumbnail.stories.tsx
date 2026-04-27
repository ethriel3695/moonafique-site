import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CartProvider } from '@/lib/cart-context';
import {
  ProductListThumbnail,
  ProductListThumbnailSkeleton,
} from './product-list-thumbnail';

const sampleProduct = {
  id: 'prod_story_ptero',
  name: 'Pteranodon Wall Glide',
  description: 'A lightweight print with layered wing detail.',
  images: ['/placeholder.svg'],
  price: {
    id: 'price_story_ptero',
    amount: 38,
    display_amount: '$38.00',
  },
  metadata: {
    status: 'featured' as const,
    category: 'creature',
    stock: 5,
  },
};

const meta = {
  title: 'Organism/Product List Thumbnail',
  component: ProductListThumbnail,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <CartProvider>
        <TooltipProvider delayDuration={0}>
          <div className="max-w-sm p-4">
            <Story />
            <Toaster />
          </div>
        </TooltipProvider>
      </CartProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  args: {
    product: sampleProduct,
  },
} satisfies Meta<typeof ProductListThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ComingSoon: Story = {
  args: {
    product: {
      ...sampleProduct,
      metadata: {
        ...sampleProduct.metadata,
        status: 'comingSoon',
      },
    },
  },
};

export const MadeToOrder: Story = {
  args: {
    product: {
      ...sampleProduct,
      metadata: {
        ...sampleProduct.metadata,
        status: 'madeToOrder',
        stock: 0,
        madeToOrder: true,
      },
    },
  },
};

export const Skeleton: StoryObj<typeof ProductListThumbnailSkeleton> = {
  render: () => <ProductListThumbnailSkeleton />,
};