"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCartContext } from "@/lib/cart-context";
import { MAX_CART_QUANTITY, type CartItem } from "@/lib/cart-items";
import { formatCurrency } from "@/lib/utils";
export async function requestCheckout(items: CartItem[]) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({
        priceId: item.price.id,
        quantity: item.quantity,
      })),
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.url)
    throw new Error(
      data?.error || "We couldn’t open checkout. Please try again.",
    );
  const url = new URL(data.url);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
    throw new Error("We couldn’t open checkout. Please try again.");
  return url.href;
}
export function Cart({
  createCheckout = requestCheckout,
}: {
  createCheckout?: (items: CartItem[]) => Promise<string>;
}) {
  const { items, removeItem, updateQuantity, total } = useCartContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  async function handleCheckout() {
    if (busy.current || !items.length) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      window.location.assign(await createCheckout(items));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn’t open checkout. Please try again.",
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative shrink-0"
          aria-label={count ? `Open cart, ${count} items` : "Open cart"}
        >
          <ShoppingBag aria-hidden="true" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground"
            >
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-5 pt-12 sm:max-w-md"
      >
        <SheetTitle className="text-3xl">Your cart</SheetTitle>
        <SheetDescription>
          Review your pieces before continuing to secure checkout.
        </SheetDescription>
        <div className="mt-5 flex-1 space-y-6 overflow-y-auto">
          {items.length ? (
            items.map((item) => (
              <article
                key={item.id}
                className="flex gap-4 border-b border-border pb-5"
              >
                <Image
                  src={item.image || "/placeholder-image.png"}
                  alt={item.name}
                  width={72}
                  height={90}
                  className="h-24 w-20 rounded-lg bg-surface object-contain"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg leading-6">{item.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(item.price.unit_amount)} each
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Remove one ${item.name}`}
                      disabled={loading}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus aria-hidden="true" />
                    </Button>
                    <span
                      aria-label={`Quantity for ${item.name}`}
                      className="min-w-6 text-center"
                    >
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Add one ${item.name}`}
                      disabled={loading || item.quantity >= MAX_CART_QUANTITY}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${item.name} from cart`}
                  disabled={loading}
                  onClick={() => removeItem(item.id)}
                >
                  <X aria-hidden="true" />
                </Button>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-surface p-6">
              <p className="text-lg">Your cart is empty.</p>
              <p className="mt-3 leading-7 text-muted-foreground">
                Find something you’d like to collect.
              </p>
              <SheetClose asChild>
                <Link
                  href="/#shop"
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
                >
                  Browse the shop
                </Link>
              </SheetClose>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Shipping and applicable tax are shown at checkout.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/40 p-3 text-sm leading-6"
              >
                {error} Your cart has been kept.
              </p>
            )}
            <Button
              className="w-full"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? "Opening checkout…" : "Continue to checkout"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
