import { Resend } from "resend";
import type { Pool } from "pg";
import { one, transaction } from "./db";
import { ClubError, type Mode } from "./model";
import { appOrigin } from "./stripe-gateway";
type Message = {
  id: string;
  email: string;
  subject: string;
  body: string;
  first_attempt_at: Date;
  dedupe_key: string;
};
export async function drainOutbox(pool: Pool, mode: Mode, send = false, options: { limit?: number; deadline?: number } = {}) {
  if (!send)
    return (
      await pool.query(
        "SELECT id,subject,state,attempts FROM grim.outbox WHERE program_id=$1 AND state<>'sent' ORDER BY created_at",
        [mode],
      )
    ).rows;
  const sink = process.env.GRIM_TEST_EMAIL;
  if (mode === "sandbox" && !sink) throw new ClubError("test_email_required");
  if (mode === "live" && process.env.GRIM_SEND_EMAILS !== "approved")
    throw new ClubError("email_disabled");
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    throw new ClubError("email_not_configured");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const pending = (
    await pool.query<{ id: string }>(
      "SELECT id FROM grim.outbox WHERE program_id=$1 AND state='pending' ORDER BY created_at LIMIT $2",
      [mode, Math.max(1, Math.min(options.limit ?? 100, 100))],
    )
  ).rows;
  let sent = 0;
  for (const row of pending) {
    if (Date.now() >= (options.deadline ?? Infinity)) break;
    // Persist the ambiguity window before delivery; do not blindly retry beyond Resend's 24-hour deduplication period.
    await pool.query(
      "UPDATE grim.outbox SET first_attempt_at=COALESCE(first_attempt_at,now()),attempts=attempts+1 WHERE id=$1 AND state='pending'",
      [row.id],
    );
    await transaction(pool, async (db) => {
      const m = await one<Message>(
        db,
        `SELECT o.*,m.email FROM grim.outbox o JOIN grim.memberships m ON m.id=o.membership_id WHERE o.id=$1 AND o.state='pending' FOR UPDATE OF o SKIP LOCKED`,
        [row.id],
      );
      if (!m) return;
      if (Date.now() - m.first_attempt_at.getTime() > 23 * 60 * 60000) {
        await db.query("UPDATE grim.outbox SET state='review' WHERE id=$1", [
          m.id,
        ]);
        return;
      }
      const { data, error } = await resend.emails.send(
        {
          from: process.env.RESEND_FROM_EMAIL!,
          to: mode === "sandbox" ? sink! : m.email,
          subject: mode === "sandbox" ? `[SANDBOX] ${m.subject}` : m.subject,
          text: `${m.body}\n\nManage your membership: ${appOrigin()}/account/grimmunity`,
        },
        { idempotencyKey: `grim/${m.id}` },
      );
      if (error || !data) throw new ClubError("notification_pending", 503);
      await db.query(
        "UPDATE grim.outbox SET state='sent',provider_id=$2,sent_at=now() WHERE id=$1",
        [m.id, data.id],
      );
      sent++;
    });
  }
  return { sent };
}
