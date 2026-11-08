import Stripe from 'stripe';
import { shopShippingOptions } from './shop-shipping';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is required to connect to Stripe.');
}

export const stripe = new Stripe(stripeSecretKey);

export async function createCheckoutSession(
  // line_items: Stripe.Checkout.SessionCreateParams.LineItem[]
  line_items: { priceId: string; quantity: number }[],
  cartTotal: number
) {
  const siteUrl = process.env.GRIM_SITE_URL || process.env.SERVER_URL || 'https://www.moonafique.com';
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: shopShippingOptions(cartTotal),
    line_items: line_items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/#shop`,
  });

  return session.url;
}
