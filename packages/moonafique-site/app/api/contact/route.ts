import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactSchema } from "@/lib/contact";
import { isRateLimited } from "@/lib/rate-limit";
export const runtime = "nodejs";
const failure = (status: number, error: string) =>
  NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next can use an internal hostname in request.url. Compare the browser's
  // origin with the public Host and the proxy-provided protocol instead.
  const host = request.headers.get("host") ?? url.host;
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "https" || forwardedProtocol === "http"
      ? forwardedProtocol
      : url.protocol.slice(0, -1);
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(`${protocol}://${host}`).origin;
  } catch {
    return failure(
      403,
      "Please send your message from the Moonafique website.",
    );
  }
  if (origin && origin !== expectedOrigin)
    return failure(
      403,
      "Please send your message from the Moonafique website.",
    );
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 20000)
      return failure(413, "Please keep your message under 5,000 characters.");
    body = JSON.parse(text);
  } catch {
    return failure(400, "Please check the form and try again.");
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success)
    return failure(400, "Please check your name, email, subject, and message.");
  const data = parsed.data;
  if (data.company)
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`contact:${ip}`))
    return failure(
      429,
      "Too many messages. Please try again later or email hello@moonafique.com.",
    );
  // Local and preview reviews must never send to the real inbox by accident.
  if (
    !process.env.RESEND_API_KEY ||
    process.env.CONTACT_SEND_EMAILS !== "approved" ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
  )
    return failure(
      503,
      "We couldn’t send your message. Please email hello@moonafique.com.",
    );
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send(
      {
        from:
          process.env.RESEND_FROM_EMAIL ??
          "Moonafique <noreply@moonafique.com>",
        to: "hello@moonafique.com",
        replyTo: data.email,
        subject: `Website message: ${data.subject}`,
        text: `From: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
      },
      { idempotencyKey: `contact/${data.submissionKey}` },
    );
    if (result.error || !result.data?.id)
      return failure(
        503,
        "We couldn’t send your message. Please try again or email hello@moonafique.com.",
      );
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failure(
      503,
      "We couldn’t send your message. Please try again or email hello@moonafique.com.",
    );
  }
}
