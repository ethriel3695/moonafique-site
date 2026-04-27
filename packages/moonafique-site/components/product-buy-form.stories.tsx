import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CartProvider } from '@/lib/cart-context';
import { ProductBuyForm } from './product-buy-form';

const sampleProduct = {
  id: 'prod_story_dragon',
  name: 'Fossil Dragon Hatchling',
  description: 'A desk-sized articulated dragon print.',
  images: ['/placeholder.svg'],
  price: {
    id: 'price_story_dragon',
    amount: 24,
    display_amount: '$24.00',
  },
  metadata: {
    status: 'available' as const,
    category: 'dragon',
    stock: 6,
  },
};

const meta = {
  title: 'Molecule/Product Buy Form',
  component: ProductBuyForm,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <CartProvider>
        <TooltipProvider delayDuration={0}>
          <div className="w-full max-w-sm p-4">
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
} satisfies Meta<typeof ProductBuyForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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

export const AdjustQuantity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const numberField = canvas.getByRole('spinbutton');
    const buttons = canvas.getAllByRole('button');

    await userEvent.click(buttons[1]);

    await expect(numberField).toHaveValue(2);
  },
};
