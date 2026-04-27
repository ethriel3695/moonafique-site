import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WelcomeEmail } from '@/emails/welcome-email';
import { isRateLimited } from '@/lib/rate-limit';
import { headers } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = subscribeSchema.parse(body);

    // Add subscriber to your email list
    const { data, error } = await resend.emails.send({
      from: 'Moonafique <noreply@moonafique.com>',
      to: email,
      subject: 'Welcome to Moonafique!',
      react: WelcomeEmail({ email }),
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: error.statusCode ?? 500 }
      );
    }

    return NextResponse.json(
      { message: 'Successfully subscribed!', emailId: data?.id },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// export async function sendInvoiceEmail({
//   to,
//   trackingUrl,
//   invoicePdf,
// }: {
//   to: string;
//   trackingUrl: string;
//   invoicePdf: Buffer;
// }) {
//   await resend.emails.send({
//     from: 'Moonafique <hello@moonafique.com>',
//     to,
//     subject: 'Your Moonafique Order + Tracking Info',
//     html: `<p>Thanks for your order! Track it <a href="${trackingUrl}">here</a>.</p>`,
//     attachments: [
//       {
//         filename: 'invoice.pdf',
//         content: invoicePdf.toString('base64'),
//         contentType: 'application/pdf',
//       },
//     ],
//   });
// }
