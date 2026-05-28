import type { Meta, StoryObj } from '@storybook/nextjs-vite';
// import { fn } from 'storybook/test';

import { CartProvider } from '@/lib/cart-context';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  decorators: [
    (Story) => (
      <CartProvider>
        <TooltipProvider delayDuration={0}>
          <Story />
        </TooltipProvider>
      </CartProvider>
    ),
  ],
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// This needs to be mocked out better
export const Default: Story = {};
