import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, stripe } from "@/lib/stripe";
import { isOneTimePrice } from "@/lib/catalog-policy";
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
    const { items } = cartSchema.parse(await req.json());
    if (!items.length) return NextResponse.json({ url: null });
    let cartTotal = 0;
    for (const item of items) {
      const price = await stripe.prices.retrieve(item.priceId, {
        expand: ["product"],
      });
      if (!isOneTimePrice(price) || price.currency !== "usd")
        return NextResponse.json(
          { error: "This item is not available for one-time checkout." },
          { status: 400 },
        );
      cartTotal += price.unit_amount! * item.quantity;
    }
    return NextResponse.json({
      url: await createCheckoutSession(items, cartTotal),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to create checkout. Check your cart and try again." },
      { status: error instanceof z.ZodError ? 400 : 503 },
    );
  }
}
