import { Resend, type CreateEmailOptions } from "resend";
import { z } from "zod";
import type { Pool } from "pg";
import { one, transaction } from "../grimmunity/db";
import { ClubError, type Mode } from "../grimmunity/model";

type Notification = {
  request_id: string; kind: "staff" | "customer"; email: string | null;
  message: { subject: string; html: string; text: string };
  payload: CreateEmailOptions | null; first_attempt_at: Date | null;
};

export async function deliverCustomEmails(pool: Pool, mode: Mode, options: { requestId?: string; limit?: number; deadline?: number } = {}) {
  if (process.env.CUSTOM_REQUEST_SEND_EMAILS !== "approved") return { sent: 0, skipped: "disabled" };
  const staff = z.email().parse(process.env.CUSTOM_REQUEST_STAFF_EMAIL);
  const sink = mode === "sandbox" ? z.email().parse(process.env.CUSTOM_REQUEST_TEST_EMAIL) : null;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new ClubError("email_not_configured");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const pending = (await pool.query<{ request_id: string; kind: "staff" | "customer" }>(
    `SELECT n.request_id,n.kind FROM customs.notifications n JOIN customs.requests r ON r.id=n.request_id
     WHERE r.mode=$1 AND n.state='pending' AND ($2::uuid IS NULL OR r.id=$2)
     ORDER BY n.attempts,n.created_at,n.kind LIMIT $3`, [mode, options.requestId ?? null, Math.max(1, Math.min(options.limit ?? 4, 20))])).rows;
  let sent = 0, failures = 0;
  for (const row of pending) {
    if (Date.now() >= (options.deadline ?? Infinity)) break;
    try {
      // Commit the exact recipient and content before contacting the provider.
      await transaction(pool, async (db) => {
        const notification = await one<Notification>(db,
          `SELECT n.*,r.email FROM customs.notifications n JOIN customs.requests r ON r.id=n.request_id
           WHERE n.request_id=$1 AND n.kind=$2 AND r.mode=$3 AND n.state='pending' FOR UPDATE OF n SKIP LOCKED`, [row.request_id, row.kind, mode]);
        if (!notification || notification.first_attempt_at) return;
        const to = sink ?? (notification.kind === "staff" ? staff : notification.email);
        if (!to) throw new ClubError("email_not_configured");
        const payload: CreateEmailOptions = { ...notification.message, from: process.env.RESEND_FROM_EMAIL!, to,
          replyTo: notification.kind === "staff" && notification.email ? notification.email : "hello@moonafique.com" };
        await db.query("UPDATE customs.notifications SET payload=$3,first_attempt_at=now() WHERE request_id=$1 AND kind=$2", [row.request_id, row.kind, payload]);
      });
      await transaction(pool, async (db) => {
        const notification = await one<Notification>(db,
          `SELECT n.* FROM customs.notifications n JOIN customs.requests r ON r.id=n.request_id
           WHERE n.request_id=$1 AND n.kind=$2 AND r.mode=$3 AND n.state='pending' FOR UPDATE OF n SKIP LOCKED`, [row.request_id, row.kind, mode]);
        if (!notification?.first_attempt_at || !notification.payload) return;
        // Do not risk another send beyond the provider's 24-hour deduplication window.
        if (Date.now() - notification.first_attempt_at.getTime() > 23 * 60 * 60000) {
          await db.query("UPDATE customs.notifications SET state='review' WHERE request_id=$1 AND kind=$2", [row.request_id, row.kind]);
          failures++; return;
        }
        const { data, error } = await resend.emails.send(notification.payload, { idempotencyKey: `custom-request/${row.request_id}/${row.kind}` });
        if (error || !data) { failures++; return; }
        await db.query("UPDATE customs.notifications SET state='sent',provider_id=$3,sent_at=now() WHERE request_id=$1 AND kind=$2", [row.request_id, row.kind, data.id]);
        sent++;
      });
    } catch { failures++; }
    await pool.query("UPDATE customs.notifications SET attempts=attempts+1 WHERE request_id=$1 AND kind=$2", [row.request_id, row.kind]);
  }
  return { sent, failures };
}
