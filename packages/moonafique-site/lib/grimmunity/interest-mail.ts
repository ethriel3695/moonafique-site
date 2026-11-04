import { Resend, type CreateEmailOptions } from "resend";
import type { Pool } from "pg";
import { one, transaction } from "./db";
import { ClubError, type Mode } from "./model";

type Notification = {
  interest_id: string;
  email: string;
  confirmation_expires_at: Date;
  message: { subject: string; html: string; text: string };
  payload: CreateEmailOptions | null;
  first_attempt_at: Date | null;
};

export async function deliverInterestConfirmations(
  pool: Pool,
  mode: Mode,
  options: { interestId?: string; limit?: number; deadline?: number } = {},
) {
  const purposes = [
    ...(process.env.GRIM_SEND_INTEREST_EMAILS === "approved" ? ["launch"] : []),
    ...(process.env.NEWSLETTER_SEND_EMAILS === "approved" ? ["newsletter"] : []),
  ];
  if (!purposes.length) return { sent: 0, skipped: "disabled" };
  const sink = process.env.GRIM_TEST_EMAIL;
  if (mode === "sandbox" && !sink) throw new ClubError("test_email_required");
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new ClubError("email_not_configured");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const pending = (await pool.query<{ interest_id: string }>(
    `SELECT n.interest_id FROM grim.interest_notifications n JOIN grim.interest i ON i.id=n.interest_id
     WHERE i.mode=$1 AND n.state='pending' AND ($2::uuid IS NULL OR i.id=$2)
       AND i.purpose=ANY($4::text[]) AND i.confirmation_expires_at>now() AND i.confirmed_at IS NULL
     ORDER BY n.created_at LIMIT $3`,
    [mode, options.interestId ?? null, Math.max(1, Math.min(options.limit ?? 5, 25)), purposes],
  )).rows;
  let sent = 0, failures = 0;
  for (const row of pending) {
    if (Date.now() >= (options.deadline ?? Infinity)) break;
    // Save the exact request before sending. A crash or later copy edit must not change a retry.
    await transaction(pool, async (db) => {
      const notification = await one<Notification>(db,
        `SELECT n.*,i.email FROM grim.interest_notifications n JOIN grim.interest i ON i.id=n.interest_id
         WHERE n.interest_id=$1 AND i.mode=$2 AND n.state='pending'
           AND i.purpose=ANY($3::text[]) AND i.confirmation_expires_at>now() AND i.confirmed_at IS NULL
         FOR UPDATE OF n SKIP LOCKED`, [row.interest_id, mode, purposes]);
      if (!notification || notification.first_attempt_at) return;
      const payload = {
        ...notification.message,
        from: process.env.RESEND_FROM_EMAIL!,
        to: mode === "sandbox" ? sink! : notification.email,
        replyTo: "hello@moonafique.com",
      };
      await db.query("UPDATE grim.interest_notifications SET payload=$2,first_attempt_at=now() WHERE interest_id=$1", [row.interest_id, payload]);
    });
    try {
      await transaction(pool, async (db) => {
        const notification = await one<Notification>(db,
          `SELECT n.*,i.confirmation_expires_at FROM grim.interest_notifications n JOIN grim.interest i ON i.id=n.interest_id
           WHERE n.interest_id=$1 AND i.mode=$2 AND n.state='pending'
             AND i.purpose=ANY($3::text[]) AND i.confirmation_expires_at>now() AND i.confirmed_at IS NULL
           FOR UPDATE OF n SKIP LOCKED`, [row.interest_id, mode, purposes]);
        if (!notification?.first_attempt_at || !notification.payload) return;
        // Resend retains idempotency keys for 24 hours. An older ambiguous send needs review.
        if (Date.now() - notification.first_attempt_at.getTime() > 23 * 60 * 60000) {
          await db.query("UPDATE grim.interest_notifications SET state='review' WHERE interest_id=$1", [row.interest_id]);
          failures++;
          return;
        }
        const { data, error } = await resend.emails.send(notification.payload,
          { idempotencyKey: `grim-interest/${row.interest_id}/${notification.confirmation_expires_at.getTime()}` });
        if (error || !data) { failures++; return; }
        await db.query("UPDATE grim.interest_notifications SET state='sent',provider_id=$2,sent_at=now() WHERE interest_id=$1", [row.interest_id, data.id]);
        sent++;
      });
    } catch {
      // Never roll back the signup or log provider errors containing personal data.
      failures++;
    }
    await pool.query("UPDATE grim.interest_notifications SET attempts=attempts+1 WHERE interest_id=$1", [row.interest_id]);
  }
  return { sent, failures };
}
