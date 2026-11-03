"use client";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/schema";
import { useToast } from "@/components/ui/use-toast";
import { useCartContext } from "@/lib/cart-context";
import { MAX_CART_QUANTITY } from "@/lib/cart-items";
export function ProductBuyForm({ product }: { product: Product }) {
  const id = useId();
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const busy = useRef(false);
  const { toast } = useToast();
  const { addItem, items } = useCartContext();
  const stock = product.metadata?.stock;
  const madeToOrder =
    product.metadata?.status === "madeToOrder" ||
    (stock === 0 && product.metadata?.madeToOrder === true);
  const comingSoon = product.metadata?.status === "comingSoon";
  const soldOut =
    product.metadata?.status === "soldOut" || (stock === 0 && !madeToOrder);
  const max =
    !madeToOrder && stock !== undefined
      ? Math.max(0, Math.min(stock, MAX_CART_QUANTITY))
      : MAX_CART_QUANTITY;
  const count = Number(quantity);
  const valid = Number.isInteger(count) && count >= 1 && count <= max;
  const unavailable = comingSoon || soldOut;
  async function handleAddToCart() {
    if (busy.current || unavailable) return;
    if (!valid) {
      setError(`Choose a whole quantity between 1 and ${max}.`);
      return;
    }
    const inCart = items.find((item) => item.id === product.id)?.quantity ?? 0;
    if (inCart + count > max) {
      setError(
        `Your cart can contain up to ${max} of this item. You already have ${inCart}.`,
      );
      return;
    }
    busy.current = true;
    setAdding(true);
    setError("");
    try {
      await addItem(
        {
          id: product.id,
          name: product.name,
          price: {
            id: product.price.id,
            unit_amount: product.price.amount ?? 0,
          },
          image: product.images?.[0] || "/placeholder-image.png",
        },
        count,
      );
      toast({
        title: "Added to cart",
        description: `${count} × ${product.name}`,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn’t add this item. Please try again.",
      );
    } finally {
      busy.current = false;
      setAdding(false);
    }
  }
  return (
    <div className="space-y-3">
      {!unavailable && (
        <div>
          <label htmlFor={id} className="mb-2 block text-sm font-semibold">
            Quantity<span className="sr-only"> for {product.name}</span>
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Decrease quantity for ${product.name}`}
              disabled={!valid || count <= 1 || adding}
              onClick={() => {
                setQuantity(String(count - 1));
                setError("");
              }}
            >
              <Minus aria-hidden="true" />
            </Button>
            <Input
              id={id}
              type="number"
              min={1}
              max={max}
              step={1}
              value={quantity}
              disabled={adding}
              onChange={(event) => {
                setQuantity(event.target.value);
                setError("");
              }}
              aria-invalid={!valid}
              aria-describedby={error ? `${id}-error` : undefined}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Increase quantity for ${product.name}`}
              disabled={!valid || count >= max || adding}
              onClick={() => {
                setQuantity(String(count + 1));
                setError("");
              }}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      )}
      <Button
        type="button"
        className="w-full"
        onClick={handleAddToCart}
        disabled={unavailable || adding}
      >
        <ShoppingCart aria-hidden="true" />
        {comingSoon
          ? "Coming soon"
          : soldOut
            ? "Sold out"
            : adding
              ? "Adding…"
              : madeToOrder
                ? "Add made-to-order item"
                : "Add to cart"}
      </Button>
    </div>
  );
}
