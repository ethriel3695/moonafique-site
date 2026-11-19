import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { FAQ } from './faq';

const meta = {
  title: 'Organism/FAQ',
  component: FAQ,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FAQ>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OpensAnswer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const shippingQuestion = canvas.getByRole('button', {
      name: /how long does shipping take\?/i,
    });

    const shippingAnswer = canvas.getByText(/^standard shipping\b/i);
    await expect(shippingAnswer).not.toBeVisible();
    await userEvent.click(shippingQuestion);
    await expect(shippingAnswer).toBeVisible();
  },
};
