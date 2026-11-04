import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import { one, transaction } from "./db";
import { ClubError, type Mode } from "./model";
import { appOrigin } from "./stripe-gateway";
import { cleanRequestLimits, limitRequest } from "./request-limits";

export type EmailPurpose = "launch" | "newsletter";
export const interestConsentVersion = "grimmunity-confirmed-launch-v3";
const hour = 3_600_000;
export const interestInput = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  consent: z.literal(true),
  website: z.string().max(200).optional().default(""),
});

export async function registerInterest(
  pool: Pool,
  mode: Mode,
  input: unknown,
  ip: string,
  secret: string,
  now = new Date(),
  purpose: EmailPurpose = "launch",
) {
  const data = interestInput.parse(input);
  if (data.website) return; // Quietly discard the hidden bot field.
  if (secret.length < 32) throw new ClubError("interest_unavailable", 503);
  const scope = `email:${mode}:${purpose}`;
  const expiresAt = new Date(now.getTime() + 24 * hour);
  const result = await transaction(pool, async (db) => {
    await cleanRequestLimits(db, now);
    if (!await limitRequest(db, secret, `${scope}:ip`, ip, 8, hour, now) ||
        !await limitRequest(db, secret, `${scope}:hour`, "all", 120, hour, now) ||
        !await limitRequest(db, secret, `${scope}:day`, "all", 400, 24 * hour, now))
      return { allowed: false };
    const created = await one<{ id: string }>(db,
      `INSERT INTO grim.email_opt_ins(mode,purpose,email,consent_version,confirmation_expires_at) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(mode,purpose,email) DO UPDATE SET consent_version=EXCLUDED.consent_version,
         confirmation_expires_at=EXCLUDED.confirmation_expires_at
       WHERE grim.email_opt_ins.confirmed_at IS NULL AND grim.email_opt_ins.confirmation_expires_at<=$6
       RETURNING id`,
      [mode, purpose, data.email, purpose === "launch" ? interestConsentVersion : "newsletter-confirmed-v1", expiresAt, now],
    );
    if (created) {
      const token = confirmationToken(secret, mode, created.id, expiresAt.getTime());
      const url = `${appOrigin()}/confirm-email#${token}`;
      const list = purpose === "launch" ? "membership launch list" : "newsletter";
      const subject = `${mode === "sandbox" ? "[TEST] " : ""}Confirm your Moonafique ${list} signup`;
      const details = purpose === "launch" ? "This doesn’t reserve a membership or charge you." : "You can unsubscribe from the newsletter at any time.";
      const message = {
        subject,
        text: `Confirm your signup for the Moonafique ${list}: ${url}\n\n${details}\n\nIf you didn’t request this, ignore this email. The link expires in 24 hours.`,
        html: `<p>Confirm your signup for the Moonafique ${list}.</p><p><a href="${url}">Review and confirm your email</a></p><p>${details}</p><p>If you didn’t request this, ignore this email. The link expires in 24 hours.</p>`,
      };
      await db.query(
        `INSERT INTO grim.email_opt_in_notifications(interest_id,message) VALUES($1,$2)
         ON CONFLICT(interest_id) DO UPDATE SET message=EXCLUDED.message, payload=NULL, state='pending',
           attempts=0, first_attempt_at=NULL, provider_id=NULL, sent_at=NULL, created_at=now()`,
        [created.id, message],
      );
    }
    const contact = created ?? await one<{ id: string }>(db,
      `SELECT id FROM grim.email_opt_ins WHERE mode=$1 AND purpose=$2 AND email=$3
       AND confirmed_at IS NULL AND confirmation_expires_at>$4`, [mode, purpose, data.email, now]);
    return { allowed: true, id: contact?.id };
  });
  if (!result.allowed) throw new ClubError("interest_rate_limited", 429);
  return result.id;
}

function confirmationToken(secret: string, mode: Mode, id: string, expires: number) {
  const message = `${id}.${expires}`;
  const signature = createHmac("sha256", secret).update(`email-confirm:${mode}:${message}`).digest("base64url");
  return `${message}.${signature}`;
}

export async function confirmEmail(
  pool: Pool, mode: Mode, token: string, secret: string,
  activateNewsletter: (email: string) => Promise<void>, now = new Date(),
) {
  if (secret.length < 32) throw new ClubError("interest_unavailable", 503);
  const invalid = () => new ClubError("invalid_email_confirmation", 400);
  const match = /^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.(\d{13})\.[\w-]{43}$/.exec(token);
  if (!match) throw invalid();
  const [, id, expiry] = match;
  const expires = Number(expiry);
  if (expires <= now.getTime() || !timingSafeEqual(Buffer.from(token), Buffer.from(confirmationToken(secret, mode, id, expires))))
    throw invalid();
  return transaction(pool, async (db) => {
    const contact = await one<{ email: string; purpose: EmailPurpose; confirmed_at: Date | null }>(db,
      `SELECT email,purpose,confirmed_at FROM grim.email_opt_ins WHERE id=$1 AND mode=$2 AND confirmation_expires_at=$3 FOR UPDATE`,
      [id, mode, new Date(expires)],
    );
    if (!contact) throw invalid();
    if (contact.confirmed_at) return contact.purpose;
    if (contact.purpose === "newsletter" && mode === "live") await activateNewsletter(contact.email);
    await db.query("UPDATE grim.email_opt_ins SET confirmed_at=$2 WHERE id=$1", [id, now]);
    return contact.purpose;
  });
}

export async function readInterestBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ClubError("invalid_request", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new ClubError("invalid_request", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export function interestCSV(rows: { email: string; created_at: Date; consent_version: string }[]) {
  const cell = (value: string) => `"${(/^[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  return ["email,joined_at,consent_version", ...rows.map((row) =>
    [row.email, row.created_at.toISOString(), row.consent_version].map(cell).join(","),
  )].join("\r\n");
}
