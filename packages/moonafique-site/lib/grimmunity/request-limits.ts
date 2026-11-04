import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { DB } from "./db";
import { one } from "./db";

export function clientIp(request: Request) {
  // Vercel sets this value at its edge. Do not trust arbitrary forwarded headers.
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined;
  return ip && isIP(ip) ? ip : "unknown";
}

export async function limitRequest(
  db: DB, secret: string, scope: string, actor: string, limit: number, windowMs: number, now: Date,
) {
  const period = Math.floor(now.getTime() / windowMs);
  const bucket = createHmac("sha256", secret).update(JSON.stringify([scope, period, actor])).digest("hex");
  const result = await one<{ attempts: number }>(db,
    `INSERT INTO grim.interest_rate_limits(bucket,attempts,expires_at) VALUES($1,1,$2)
     ON CONFLICT(bucket) DO UPDATE SET attempts=LEAST(grim.interest_rate_limits.attempts+1,$3)
     RETURNING attempts`,
    [bucket, new Date((period + 2) * windowMs), limit + 1],
  );
  return !!result && result.attempts <= limit;
}

export async function cleanRequestLimits(db: DB, now: Date) {
  await db.query(
    `DELETE FROM grim.interest_rate_limits WHERE bucket IN (
      SELECT bucket FROM grim.interest_rate_limits WHERE expires_at<$1 LIMIT 500 FOR UPDATE SKIP LOCKED
    )`, [now],
  );
}
