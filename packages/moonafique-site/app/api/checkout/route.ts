import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, stripe } from "@/lib/stripe";
import { isOneTimePrice } from "@/lib/catalog-policy";
import { failure, sameOrigin } from "@/lib/grimmunity/http";
import { ClubError } from "@/lib/grimmunity/model";
import { guardProviderRequest } from "@/lib/grimmunity/provider-request-guard";
import { z } from "zod";
const cartSchema = z.object({
  items: z
    .array(
      z.object({
        priceId: z.string().startsWith("price_"),
        quantity: z.number().int().min(1).max(100),
        price: z.number().optional(),
      }),
    )
    .max(100),
});
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { items } = cartSchema.parse(await req.json());
    if (!items.length) return NextResponse.json({ url: null });
    await guardProviderRequest(req, "storefront");
    const combined = new Map<string, number>();
    for (const item of items)
      combined.set(
        item.priceId,
        (combined.get(item.priceId) ?? 0) + item.quantity,
      );
    if ([...combined.values()].some((quantity) => quantity > 100))
      return NextResponse.json(
        { error: "Please keep quantities between 1 and 100." },
        { status: 400 },
      );
    const checkoutItems = [...combined].map(([priceId, quantity]) => ({
      priceId,
      quantity,
    }));
    let cartTotal = 0;
    for (const item of checkoutItems) {
      const price = await stripe.prices.retrieve(item.priceId, {
        expand: ["product"],
      });
      if (!isOneTimePrice(price) || price.currency !== "usd")
        return NextResponse.json(
          { error: "This item is not available for one-time checkout." },
          { status: 400 },
        );
      const product = price.product as import("stripe").Stripe.Product;
      const stock =
        product.metadata.stock === undefined || product.metadata.stock === ""
          ? undefined
          : Number(product.metadata.stock);
      const madeToOrder =
        product.metadata.status === "madeToOrder" ||
        (stock === 0 && product.metadata.madeToOrder === "true");
      if (
        product.metadata.status === "comingSoon" ||
        product.metadata.status === "soldOut" ||
        (!madeToOrder &&
          stock !== undefined &&
          (!Number.isFinite(stock) || item.quantity > stock))
      )
        return NextResponse.json(
          {
            error:
              "An item is no longer available in that quantity. Please review your cart.",
          },
          { status: 400 },
        );
      cartTotal += price.unit_amount! * item.quantity;
    }
    return NextResponse.json({
      url: await createCheckoutSession(checkoutItems, cartTotal),
    });
  } catch (error) {
    if (error instanceof ClubError) return failure(error);
    return NextResponse.json(
      { error: "Unable to create checkout. Check your cart and try again." },
      { status: error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503 },
    );
  }
}
