'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
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
          'border-info bg-info text-info-foreground',
        soldOut: 'border-border/70 bg-muted text-muted-foreground',
        comingSoon:
          'border-warning bg-warning text-warning-foreground',
        limitedEdition:
          'border-warning bg-warning text-warning-foreground',
        new: 'border-success bg-success text-success-foreground',
        featured: 'border-primary bg-primary text-primary-foreground',
        onSale: 'border-success bg-success text-success-foreground',
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
