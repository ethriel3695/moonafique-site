import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Lora, Manrope } from 'next/font/google';
import { CreationsShowcase } from './creations-showcase';
import { printWarsCreations } from '@/lib/creations-showcase';

const lora = Lora({ subsets: ['latin'], variable: '--font-display' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' });

const meta = {
  title: 'Organism/Creations Showcase',
  component: CreationsShowcase,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className={`${lora.variable} ${manrope.variable} ${manrope.className}`}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen', a11y: { test: 'error' } },
} satisfies Meta<typeof CreationsShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Homepage: Story = {};

export const PhotosPending: Story = {
  args: {
    creations: printWarsCreations.map((creation) => ({ ...creation, photos: undefined })),
  },
};
