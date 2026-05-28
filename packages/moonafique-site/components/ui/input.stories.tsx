import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Input } from './input';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
  args: {
    placeholder: 'Search the Moonafique menagerie',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  render: () => (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Search inventory
        <Input placeholder="Search the Moonafique menagerie" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Search term with error
        <Input defaultValue="Dragon hatchling" aria-invalid="true" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Disabled search example
        <Input defaultValue="Collectors only" disabled />
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
    const input = canvas.getByRole('textbox');

    await userEvent.click(input);
    await userEvent.type(input, 'Dragon');

    await expect(args.onChange).toHaveBeenCalled();
    await expect(input).toHaveValue('Dragon');
  },
};