import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { EmailSignupForm } from './email-signup-form';

const meta = {
  title: 'Molecule/Email Signup Form',
  component: EmailSignupForm,
  tags: ['autodocs'],
  args: { subscribe: async () => undefined },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl rounded-2xl bg-primary p-4 text-primary-foreground">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof EmailSignupForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CheckYourInbox: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email address' }), 'collector@example.invalid');
    await userEvent.click(canvas.getByRole('button', { name: 'Subscribe' }));
    await expect(await canvas.findByText('One more step: check your inbox.')).toBeVisible();
  },
};
