import { createHmac } from "node:crypto";
import type { Pool } from "pg";
import { one, transaction } from "../grimmunity/db";
import { ClubError, type Mode } from "../grimmunity/model";
import { acknowledgementVersion, requestInput, shopToday, staffUpdateInput, type CustomRequest } from "./model";
import { customRequestMessage } from "../../emails/custom-request-email";
import { appOrigin } from "../grimmunity/stripe-gateway";

export async function submitRequest(pool: Pool, mode: Mode, input: unknown, ip: string, secret: string, now = new Date(), options: { staffEmailTest?: boolean } = {}) {
  const data = requestInput.parse(input);
  if (data.website) return null;
  if (data.hasDeadline && data.neededBy < shopToday(now)) throw new ClubError("custom_date_past", 400);
  if (secret.length < 32) throw new ClubError("custom_unavailable", 503);
  const hour = Math.floor(now.getTime() / 3_600_000);
  // Separate from the interest-list digest; raw addresses are never stored here.
  const bucket = createHmac("sha256", secret).update(`customs:${mode}:${hour}:${ip}`).digest("hex");
  const result = await transaction(pool, async (db) => {
    await db.query("DELETE FROM customs.rate_limits WHERE bucket IN (SELECT bucket FROM customs.rate_limits WHERE expires_at<$1 LIMIT 500)", [now]);
    const rate = await one<{ attempts: number }>(db,
      `INSERT INTO customs.rate_limits(bucket,attempts,expires_at) VALUES($1,1,$2)
       ON CONFLICT(bucket) DO UPDATE SET attempts=LEAST(customs.rate_limits.attempts+1,6) RETURNING attempts`,
      [bucket, new Date((hour + 2) * 3_600_000)]);
    if (!rate || rate.attempts > 5) return { allowed: false };
    const created = await one<{ id: string }>(db,
      `INSERT INTO customs.requests(mode,submission_key,name,email,whatnot_username,request,details,needed_by,occasion,acknowledgement_version)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(mode,submission_key) DO NOTHING RETURNING id`,
      [mode, data.submissionKey, data.name, data.email || null, data.whatnotUsername || null, data.request, data.details,
        data.hasDeadline ? data.neededBy : null, data.hasDeadline ? data.occasion : "", acknowledgementVersion]);
    const saved = created ?? await one<{ id: string }>(db, "SELECT id FROM customs.requests WHERE mode=$1 AND submission_key=$2", [mode, data.submissionKey]);
    if (!saved) throw new ClubError("custom_unavailable", 503);
    if (created) {
      const emailData = { id: created.id, name: data.name, email: data.email || null, whatnotUsername: data.whatnotUsername || null,
        request: data.request, details: data.details, requestedDate: data.hasDeadline ? data.neededBy : null, occasion: data.hasDeadline ? data.occasion : "" };
      for (const kind of data.email ? ["staff", "customer"] as const : ["staff"] as const) {
        const message = await customRequestMessage(kind, emailData, appOrigin(), mode === "sandbox" || options.staffEmailTest);
        await db.query("INSERT INTO customs.notifications(request_id,kind,message) VALUES($1,$2,$3)", [created.id, kind, message]);
      }
      if (options.staffEmailTest) await db.query("UPDATE customs.requests SET status='completed',staff_notes='Staff email template test. No customer order, production, or follow-up required.' WHERE id=$1", [created.id]);
    }
    return { allowed: true, id: saved.id };
  });
  if (!result.allowed) throw new ClubError("custom_rate_limited", 429);
  return result.id;
}

export type QueueFilter = "open" | "closed" | "all";
export async function requestQueue(pool: Pool, mode: Mode, filter: QueueFilter = "open", page = 1) {
  const currentPage = Math.max(1, Math.min(10000, Number.isSafeInteger(page) ? page : 1));
  const where = filter === "closed" ? "status IN ('completed','declined')"
    : filter === "all" ? "true" : "status IN ('new','reviewing','in_progress')";
  const total = await one<{ count: string }>(pool, `SELECT count(*) FROM customs.requests WHERE mode=$1 AND ${where}`, [mode]);
  const rows = (await pool.query<CustomRequest>(
    `SELECT id,name,email,whatnot_username,request,details,needed_by::text,occasion,status,staff_notes,revision,created_at,updated_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('kind',n.kind,'state',n.state) ORDER BY n.kind) FROM customs.notifications n WHERE n.request_id=r.id),'[]'::jsonb) AS notifications
     FROM customs.requests r WHERE mode=$1 AND ${where}
     ORDER BY created_at ASC,id ASC LIMIT 50 OFFSET $2`, [mode, (currentPage - 1) * 50])).rows;
  return { rows, total: Number(total?.count ?? 0), page: currentPage };
}

export async function updateRequest(pool: Pool, mode: Mode, input: unknown, staffId: string) {
  const data = staffUpdateInput.parse(input);
  const saved = await one<{ id: string }>(pool,
    `UPDATE customs.requests SET status=$1,staff_notes=$2,revision=revision+1,updated_at=now(),updated_by=$3
     WHERE id=$4 AND mode=$5 AND revision=$6 RETURNING id`,
    [data.status, data.staffNotes, staffId, data.id, mode, data.revision]);
  if (!saved) throw new ClubError("custom_changed", 409);
  return { ok: true };
}
