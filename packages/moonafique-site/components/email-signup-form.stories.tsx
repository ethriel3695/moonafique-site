import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Toaster } from '@/components/ui/toaster';
import { EmailSignupForm } from './email-signup-form';

const meta = {
  title: 'Molecule/Email Signup Form',
  component: EmailSignupForm,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl p-4">
        <Story />
        <Toaster />
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