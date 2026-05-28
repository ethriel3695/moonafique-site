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

    await userEvent.click(shippingQuestion);

    await expect(
      canvas.getByText(/standard shipping usually arrives within 3 to 5 business days/i)
    ).toBeInTheDocument();
  },
};
