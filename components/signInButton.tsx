'use client';

import { Button } from '@radix-ui/themes';
import { cn } from '@/lib/utils';
import { User } from '@workos-inc/node';
import { handleSignOut } from '@/app/actions/auth';
import { LucideUser } from 'lucide-react';

export function SignInButton({
  large,
  user,
  signInUrl,
  variant = 'classic',
  classNames,
  iconOnly = false,
}: {
  large?: boolean;
  user: User | null;
  signInUrl: string;
  variant?:
    | 'surface'
    | 'classic'
    | 'soft'
    | 'outline'
    | 'solid'
    | 'ghost'
    | undefined;
  classNames?: string;
  iconOnly?: boolean;
}) {
  if (user) {
    return (
      <form action={handleSignOut} className="flex items-center">
        <Button
          size={large ? '3' : '2'}
          type="submit"
          className={cn(
            'text-sm cursor-pointer font-medium hover:underline underline-offset-4',
            iconOnly && 'p-0 h-9 w-9 flex items-center justify-center'
          )}
          variant={variant}
          role="button"
          title="Sign Out"
        >
          {iconOnly ? <LucideUser className="size-5" /> : 'Sign Out'}
        </Button>
      </form>
    );
  }

  return (
    <Button
      asChild
      title="Sign In"
      size={large ? '3' : '2'}
      className={cn(
        'text-sm cursor-pointer font-medium hover:underline underline-offset-4 hover:bg-slate-100 rounded-full',
        iconOnly && 'p-0 h-9 w-9 flex items-center justify-center',
        classNames
      )}
    >
      <a href={signInUrl}>
        {iconOnly ? (
          <>
            <LucideUser className="size-5" />
            <span className="sr-only">Sign in</span>
          </>
        ) : (
          <>Sign In {large && 'with AuthKit'}</>
        )}
      </a>
    </Button>
  );
}
