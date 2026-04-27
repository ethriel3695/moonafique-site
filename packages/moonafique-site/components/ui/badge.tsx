'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-primary/15 bg-primary/10 text-primary',
        secondary:
          'border-border/70 bg-secondary text-secondary-foreground',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive',
        outline: 'border-border/80 bg-background/80 text-foreground',
        madeToOrder:
          'border-info/20 bg-info/10 text-info',
        soldOut: 'border-border/70 bg-muted text-muted-foreground',
        comingSoon:
          'border-warning/25 bg-warning/15 text-warning-foreground',
        limitedEdition:
          'border-warning/25 bg-warning/15 text-warning-foreground',
        new: 'border-success/25 bg-success/15 text-success',
        featured: 'border-primary/15 bg-primary/10 text-primary',
        onSale: 'border-success/25 bg-success/15 text-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
