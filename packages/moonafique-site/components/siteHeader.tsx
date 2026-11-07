"use client";
import { useId } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetTitle,
  SheetContent,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Cart } from "@/components/cart";
import { Logo } from "@/components/logo";
import { siteNavigation } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-screen-xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Sidebar />
          <Link
            href="/"
            aria-label="Moonafique home"
            className="flex shrink-0 items-center gap-2"
          >
            <Logo className="size-11" />
            <span className="hidden font-display text-2xl text-primary min-[360px]:inline sm:text-3xl">
              Moonafique
            </span>
          </Link>
        </div>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 xl:flex"
        >
          {siteNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn("rounded-full px-3 py-3 text-sm font-semibold hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary", pathname === item.href && "bg-secondary text-primary")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <SearchBar className="hidden md:block" />
          <Cart />
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
      role="search"
      className={cn("relative", className)}
      method="GET"
      action="/#shop"
    >
      <label htmlFor={id} className="sr-only">
        Search the shop
      </label>
      <Search
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        name="search"
        id={id}
        defaultValue={searchParams.get("search") ?? ""}
        placeholder="Search the shop"
        className="h-11 w-full rounded-full pl-9 md:w-44"
      />
    </form>
  );
}
function Sidebar() {
  const pathname = usePathname();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 xl:hidden"
          aria-label="Open menu"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[min(90vw,380px)] flex-col gap-6 overflow-y-auto bg-background p-6 pt-14"
      >
        <SheetTitle className="text-2xl">Explore Moonafique</SheetTitle>
        <SearchBar />
        <nav aria-label="Mobile navigation" className="grid gap-2">
          {siteNavigation.map((item) => (
            <SheetClose key={item.href} asChild>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn("rounded-xl px-3 py-3 text-lg font-semibold hover:bg-secondary", pathname === item.href && "bg-secondary text-primary")}
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
          <SheetClose asChild>
            <Link
              href="/customs"
              className="rounded-xl px-3 py-3 font-semibold text-primary hover:bg-secondary"
            >
              Request a custom creation
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              href="/#follow"
              className="rounded-xl px-3 py-3 font-semibold text-primary hover:bg-secondary"
            >
              Follow the work
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
