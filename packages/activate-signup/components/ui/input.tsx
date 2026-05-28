import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-input/80 bg-background/90 px-4 py-3 text-base text-foreground shadow-soft ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = 'Input';

export { Input };