import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
// import { createShipment } from '@/lib/shippo';
// import { generateInvoicePdf } from '@/lib/invoice';
// import { sendInvoiceEmail } from '@/app/api/subscribe/route';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed. ${err}` },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    // 1. Get shipping address from session
    const shippingAddress = session.shipping_details;
    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'No shipping address found in session' },
        { status: 400 }
      );
    }

    // const label = await createShipment(shippingAddress);

    // 5. Generate/send invoice with Resend
    // const invoice = await generateInvoicePdf(session);
    // await sendInvoiceEmail({
    //   to: session.customer_details?.email || '',
    //   trackingUrl: label.trackingNumber || '',
    //   invoicePdf: invoice,
    // });
  }

  return NextResponse.json({ received: true });
}
