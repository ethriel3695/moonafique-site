import { Resend } from "resend";
import { z } from "zod";
import type { Pool } from "pg";
import { ClubError, type Mode } from "./model";

const receipt = z.object({
  type: z.string(),
  created_at: z.string().datetime({ offset: true }),
  data: z.object({
    email_id: z.string().min(1).max(255),
    tags: z.record(z.string(), z.string()).optional(),
  }),
});

export async function receiveNoticeDelivery(
  pool: Pool,
  mode: Mode,
  request: Request,
  now = new Date(),
) {
  const secret = process.env.GRIM_RESEND_WEBHOOK_SECRET;
  if (!secret) throw new ClubError("email_not_configured", 503);
  const payload = await request.text();
  if (payload.length > 100000) throw new ClubError("invalid_webhook", 400);
  let verified: unknown;
  try {
    verified = new Resend(
      process.env.RESEND_API_KEY ?? "re_verification_only",
    ).webhooks.verify({
      payload,
      webhookSecret: secret,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
    });
  } catch {
    throw new ClubError("invalid_webhook", 400);
  }
  const parsed = receipt.safeParse(verified);
  if (!parsed.success) throw new ClubError("invalid_webhook", 400);
  const event = parsed.data;
  const messageId = event.data.tags?.grim_outbox;
  if (
    event.data.tags?.grim_mode !== mode ||
    !messageId ||
    !z.string().uuid().safeParse(messageId).success
  )
    return;
  const failed = [
    "email.bounced",
    "email.failed",
    "email.complained",
    "email.suppressed",
  ].includes(event.type);
  if (!failed && event.type !== "email.delivered") return;
  const happened = new Date(event.created_at);
  if (happened > now) throw new ClubError("invalid_webhook", 400);
  // The first verified delivery starts the seven-day clock. Duplicate or
  // reordered receipts cannot move it earlier, or clear a failure/complaint.
  const result = await pool.query(
    `UPDATE grim.outbox SET
    delivered_at=CASE WHEN $3 THEN delivered_at ELSE COALESCE(delivered_at,$4) END,
    delivery_failed_at=CASE WHEN $3 THEN COALESCE(delivery_failed_at,$4) ELSE delivery_failed_at END,
    delivery_event_at=GREATEST(COALESCE(delivery_event_at,$4),$4)
    WHERE program_id=$1 AND provider_id=$2 AND id=$5 RETURNING id`,
    [mode, event.data.email_id, failed, now, messageId],
  );
  // Resend can call back before the send transaction stores provider_id. A
  // retryable response prevents losing that delivery confirmation.
  if (!result.rowCount) throw new ClubError("delivery_receipt_pending", 503);
}
