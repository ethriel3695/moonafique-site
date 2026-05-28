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
            className="group flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-[#f2f2f2] shadow-soft transition-colors hover:border-primary/30"
            aria-label="Moonafique home"
          >
            <Logo className="size-10" />
          </Link>
        </div>
        <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-surface/85 p-1 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-bold text-foreground/85 transition-colors hover:bg-background hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/#shop"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent/35 px-3.5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/50"
          >
            <Sparkles className="size-3.5" />
            New Drops
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
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
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/75" />
      <Input
        type="search"
        name="search"
        id={id}
        defaultValue={searchParams.get('search') ?? ''}
        placeholder="Search dragons, fossils, and more"
        className="h-11 w-full rounded-full border-border/70 bg-background/90 pl-11 pr-4 text-sm font-semibold text-foreground shadow-none placeholder:text-muted-foreground sm:w-[220px] lg:w-[270px]"
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
                className="size-10 shrink-0 rounded-full border-border/70 bg-background/90 lg:hidden"
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
              <Button
                asChild
                className="justify-start rounded-2xl bg-accent/35 text-accent-foreground hover:bg-accent/50"
                variant="ghost"
              >
                <Link href="/#shop">
                  <Sparkles className="size-4" />
                  New Drops
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Tooltip>
      </TooltipProvider>
    </Sheet>
  );
}
