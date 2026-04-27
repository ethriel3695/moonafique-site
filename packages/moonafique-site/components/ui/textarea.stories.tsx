import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Textarea } from './textarea';

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
  args: {
    placeholder: 'Tell us which creature you want printed next...',
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  render: () => (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Wishlist request
        <Textarea placeholder="Tell us which creature you want printed next..." />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Restock request
        <Textarea defaultValue="Please notify me when the lunar fox is back in stock." />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Error state
        <Textarea aria-invalid="true" defaultValue="" placeholder="A message is required" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Disabled state
        <Textarea disabled defaultValue="Submissions are paused for maintenance." />
      </label>
    </div>
  ),
};

export const Typing: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox');

    await userEvent.click(textarea);
    await userEvent.type(textarea, 'A tiny dragon with articulated wings');

    await expect(args.onChange).toHaveBeenCalled();
    await expect(textarea).toHaveValue(
      'A tiny dragon with articulated wings'
    );
  },
};