import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Testimonials } from './testimonials';

const meta = {
  title: 'Organism/Testimonials',
  component: Testimonials,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Testimonials>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NextSlide: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText(/i had to have the extra large pteranodon/i)
    ).toBeInTheDocument();

    await userEvent.click(canvas.getAllByRole('button')[1]);

    await expect(
      canvas.getByText(/my students will love them/i)
    ).toBeInTheDocument();
  },
};
