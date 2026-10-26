import { createHmac } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import { one, transaction } from "./db";
import { ClubError, type Mode } from "./model";
import { interestMessage } from "../../emails/grimmunity-interest-email";

export const interestConsentVersion = "grimmunity-confirmation-and-launch-v2";
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
) {
  const data = interestInput.parse(input);
  if (data.website) return; // Quietly discard the hidden bot field.
  if (secret.length < 32) throw new ClubError("interest_unavailable", 503);
  const hour = Math.floor(now.getTime() / 3_600_000);
  // Store a short-lived keyed digest, never the visitor's raw IP address.
  const bucket = createHmac("sha256", secret)
    .update(`${mode}:${hour}:${ip}`)
    .digest("hex");
  const result = await transaction(pool, async (db) => {
    await db.query(
      "DELETE FROM grim.interest_rate_limits WHERE bucket IN (SELECT bucket FROM grim.interest_rate_limits WHERE expires_at<$1 LIMIT 500)",
      [now],
    );
    const rate = await one<{ attempts: number }>(db,
      `INSERT INTO grim.interest_rate_limits(bucket,attempts,expires_at) VALUES($1,1,$2)
       ON CONFLICT(bucket) DO UPDATE SET attempts=LEAST(grim.interest_rate_limits.attempts+1,9)
       RETURNING attempts`,
      [bucket, new Date((hour + 2) * 3_600_000)],
    );
    if (!rate || rate.attempts > 8) return { allowed: false };
    const created = await one<{ id: string }>(db,
      `INSERT INTO grim.interest(mode,email,consent_version) VALUES($1,$2,$3)
       ON CONFLICT(mode,email) DO NOTHING RETURNING id`,
      [mode, data.email, interestConsentVersion],
    );
    if (created) {
      await db.query("INSERT INTO grim.interest_notifications(interest_id,message) VALUES($1,$2)",
        [created.id, await interestMessage(mode === "sandbox")]);
    }
    const contact = created ?? await one<{ id: string }>(db,
      "SELECT id FROM grim.interest WHERE mode=$1 AND email=$2", [mode, data.email]);
    return { allowed: true, id: contact?.id };
  });
  if (!result.allowed) throw new ClubError("interest_rate_limited", 429);
  return result.id;
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
