import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';
import { Lora, Manrope } from 'next/font/google';
import { MadeAtMoonafique } from './made-at-moonafique';
import { showcaseFeatures } from '@/lib/showcase';

const lora = Lora({ subsets: ['latin'], variable: '--font-display' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' });

const meta = {
  title: 'Organism/Made at Moonafique',
  component: MadeAtMoonafique,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className={`${lora.variable} ${manrope.variable} ${manrope.className}`}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  args: { showDraftPlaceholders: false },
} satisfies Meta<typeof MadeAtMoonafique>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LocalDraft: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('article')).toHaveLength(3);
    const images = canvas.getAllByRole('img') as HTMLImageElement[];
    await expect(images).toHaveLength(6);
    await waitFor(() => {
      for (const image of images) {
        expect(image.complete && image.naturalWidth > 0).toBe(true);
        expect(image.alt.trim().length).toBeGreaterThan(0);
      }
    });
    await expect(canvas.getByText('Grimfest house crests · digital artwork')).toBeVisible();
    await expect(canvas.queryByText(/Image transfer pending/)).not.toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'The Devil’s Favorite Lyre' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Meet the makers' })).toHaveAttribute('href', '/about');
    await expect(canvas.queryByRole('button', { name: /buy|add to cart/i })).not.toBeInTheDocument();
  },
};

export const MissingMediaStaysLocal: Story = {
  args: {
    showDraftPlaceholders: false,
    features: showcaseFeatures.map((feature) => ({ ...feature, images: undefined })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('region', { name: 'Come a little closer.' })).not.toBeInTheDocument();
    await expect(canvas.queryByText(/local draft/i)).not.toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { features: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('region')).not.toBeInTheDocument();
  },
};
