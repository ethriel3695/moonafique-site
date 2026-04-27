'use client';
import { useId } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetTitle,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipPortal,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Menu, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Cart } from '@/components/cart';
import { Logo } from '@/components/logo';
// import { User } from '@workos-inc/node';
// import { SignInButton } from '@/components/signInButton';
// import { UserMenu } from '@/components/userMenu';

const navigation = [
  { label: 'Dragons', href: '/?search=dragon' },
  { label: 'Creatures', href: '/?search=creature' },
  { label: 'Fossils', href: '/?search=fossil' },
  { label: 'Curiosities', href: '/?search=misc' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function SiteHeader() {
  //   {
  //   signInUrl,
  //   user,
  // }: {
  //   signInUrl: string;
  //   user: User | null;
  //     }
  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex min-h-20 max-w-screen-xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Sidebar />
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-full border border-border/70 bg-background/90 px-3 py-2 shadow-soft transition-colors hover:border-primary/30"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/85 via-primary to-accent shadow-soft">
              <Logo className="size-5 text-primary-foreground" style={{ zoom: 4 }} />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="font-display text-lg leading-none text-foreground">
                Moonafique
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Playful printed curiosities
              </p>
            </div>
          </Link>
        </div>
        <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-surface/85 p-1 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-2 lg:flex">
            <Sparkles className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Fresh weekly drops
            </span>
          </div>
          <SearchBar className="hidden sm:block" />
          <Cart />
          {/* {user ? (
            <UserMenu user={user} />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <SignInButton
                  user={user}
                  signInUrl={signInUrl}
                  variant="ghost"
                  iconOnly
                />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>Sign in</TooltipContent>
              </TooltipPortal>
            </Tooltip>
          )} */}
        </div>
      </div>
    </header>
  );
}

function SearchBar({ className }: { className?: string }) {
  const id = useId();
  const searchParams = useSearchParams();
  return (
    <form
      className={cn('relative max-w-lg lg:max-w-sm', className)}
      method="GET"
      action="/"
    >
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        name="search"
        id={id}
        defaultValue={searchParams.get('search') ?? ''}
        placeholder="Search dragons, fossils, and more"
        className="h-11 w-full rounded-full border-border/70 bg-background/85 pl-11 pr-4 text-sm shadow-none sm:w-[220px] lg:w-[270px]"
      />
    </form>
  );
}

function Sidebar() {
  return (
    <Sheet>
      <TooltipProvider>
        <Tooltip>
          <SheetTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 rounded-full border-border/70 bg-background/90 md:hidden"
              >
                <Menu className="size-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </TooltipTrigger>
          </SheetTrigger>
          <TooltipPortal>
            <TooltipContent align="start">Menu</TooltipContent>
          </TooltipPortal>
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <SheetContent
            side="left"
            className="flex w-full flex-col gap-6 bg-background p-5 pt-14 md:w-3/4"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Explore Moonafique
              </p>
              <div className="rounded-[1.75rem] border border-border/70 bg-surface p-4 shadow-soft">
                <SearchBar className="w-full sm:hidden" />
              </div>
            </div>
            <div className="grid gap-2">
              {navigation.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  className="justify-start rounded-2xl"
                  variant="ghost"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </SheetContent>
        </Tooltip>
      </TooltipProvider>
    </Sheet>
  );
}
