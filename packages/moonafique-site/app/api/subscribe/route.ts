import { Resend, type ErrorResponse } from 'resend';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WelcomeEmail } from '@/emails/welcome-email';
import { isRateLimited } from '@/lib/rate-limit';
import { headers } from 'next/headers';

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  return new Resend(apiKey);
}

function isAlreadySavedError(error: ErrorResponse) {
  const message = error.message.toLowerCase();

  return (
    error.statusCode === 409 ||
    message.includes('already exists') ||
    message.includes('already in')
  );
}

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
    const resend = getResendClient();
    const newsletterSegmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;

    const { data: contact, error: contactError } =
      await resend.contacts.create({
        email,
        unsubscribed: false,
        ...(newsletterSegmentId
          ? { segments: [{ id: newsletterSegmentId }] }
          : {}),
      });

    if (contactError && !isAlreadySavedError(contactError)) {
      console.error('Resend contact error:', contactError);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: contactError.statusCode ?? 500 }
      );
    }

    if (contactError && newsletterSegmentId) {
      const { error: segmentError } = await resend.contacts.segments.add({
        email,
        segmentId: newsletterSegmentId,
      });

      if (segmentError && !isAlreadySavedError(segmentError)) {
        console.error('Resend segment error:', segmentError);
        return NextResponse.json(
          { error: 'Failed to subscribe' },
          { status: segmentError.statusCode ?? 500 }
        );
      }
    }

    const { data, error } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ?? 'Moonafique <noreply@moonafique.com>',
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
      {
        message: 'Successfully subscribed!',
        contactId: contact?.id,
        emailId: data?.id,
      },
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
