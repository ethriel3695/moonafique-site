import { after } from "next/server";
import { database } from "./db";
import { failure, sameOrigin } from "./http";
import { deliverInterestConfirmations } from "./interest-mail";
import { readInterestBody, registerInterest, type EmailPurpose } from "./interest";
import { ClubError } from "./model";
import { clientIp } from "./request-limits";
import { grimMode } from "./runtime";

export async function requestEmailOptIn(request: Request, purpose: EmailPurpose) {
  try {
    sameOrigin(request);
    const mode = grimMode();
    const enabled = purpose === "launch"
      ? process.env.GRIM_INTEREST_ENABLED === "true" && process.env.GRIM_SEND_INTEREST_EMAILS === "approved"
      : process.env.NEWSLETTER_SEND_EMAILS === "approved" && (mode === "sandbox" || !!process.env.RESEND_NEWSLETTER_SEGMENT_ID);
    if (!enabled || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL ||
        (mode === "sandbox" && !process.env.GRIM_TEST_EMAIL))
      throw new ClubError("interest_unavailable", 503);
    const input = await readInterestBody(request);
    const interestId = await registerInterest(database(), mode, input, clientIp(request), process.env.GRIM_INTEREST_SECRET ?? "", new Date(), purpose);
    if (interestId) after(async () => {
      try {
        const result = await deliverInterestConfirmations(database(), mode, { interestId });
        if (result.failures) console.error("Moonafique email confirmation remains pending.");
      } catch {
        console.error("Moonafique email confirmation remains pending.");
      }
    });
    // Duplicate addresses and honeypot hits get the same response as a new request.
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
