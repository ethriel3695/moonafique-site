import Stripe from 'stripe';

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
  // Free shipping threshold is $100 (10000 cents)
  const freeShippingThreshold = 5000;
  const isEligibleForFreeShipping = cartTotal >= freeShippingThreshold;

  // Determine shipping options based on cart total
  const shippingOptions = isEligibleForFreeShipping
    ? [
        {
          shipping_rate: 'shr_1RSMOHDuU4RwQbePwGlvZ1sn', // Free shipping option
        },
      ]
    : [
        {
          shipping_rate: 'shr_1RSMAZDuU4RwQbePucfmbcN7',
        },
        {
          shipping_rate: 'shr_1RSMB3DuU4RwQbePtknEuIWR',
        },
      ];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    shipping_options: shippingOptions,
    line_items: line_items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: `${process.env.SERVER_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  });

  return session.url;
}
