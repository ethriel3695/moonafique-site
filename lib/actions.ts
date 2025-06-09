'use server';

import { createCheckoutSession } from '@/lib/stripe';

export async function checkoutAction(_prevState: unknown, formData: FormData) {
  const priceId = formData.get('priceId') as string;
  // For single item checkout, we need to provide quantity and price
  // Since we don't have price info here, we'll assume 0 total (no free shipping)
  const items = [{ priceId, quantity: 1 }];
  const cartTotal = 0; // Unknown price, so no free shipping eligibility
  await createCheckoutSession(items, cartTotal);
}
