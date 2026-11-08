import Stripe from "stripe";
import { shopShipping } from "../lib/shop-shipping";

async function main() {
  if (process.env.VERCEL_ENV !== "production") return;
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Missing storefront credentials");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  for (const option of [shopShipping.standard, shopShipping.express, shopShipping.free]) {
    const rate = await stripe.shippingRates.retrieve(option.id);
    if (!rate.active || rate.fixed_amount?.currency !== "usd" || rate.fixed_amount.amount !== option.amount)
      throw new Error("Configured shipping option differs from the public offer");
  }
  const site = new URL(process.env.GRIM_SITE_URL || process.env.SERVER_URL || "https://www.moonafique.com");
  if (site.origin !== "https://www.moonafique.com") throw new Error("Unexpected checkout return origin");
  console.log("Storefront ready: live shipping rates and checkout return origin verified.");
}
main().catch(() => {
  console.error("Storefront verification failed. Check live Stripe shipping rates and checkout return origin.");
  process.exitCode = 1;
});
