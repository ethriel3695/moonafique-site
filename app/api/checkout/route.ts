import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';

interface CartItem {
  priceId: string;
  quantity: number;
  price: number;
}

export async function POST(req: NextRequest) {
  const { items }: { items: CartItem[] } = await req.json();
  try {
    // Create Stripe checkout session
    let session = null;
    if (items.length !== 0) {
      // Calculate total cart value from items
      const cartTotal = items.reduce((total: number, item: CartItem) => {
        return total + item.price * item.quantity;
      }, 0);

      session = await createCheckoutSession(items, cartTotal);
    }
    return NextResponse.json({ url: session });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Error creating Stripe session', message: err },
      { status: 500 }
    );
  }
}
