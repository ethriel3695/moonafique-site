import assert from "node:assert/strict";
import { Resend } from "resend";
import { database } from "../lib/grimmunity/db";

// Read-only deployment check: never sends mail or adds a contact.
async function main() {
  if (process.env.GRIM_MODE !== "live" || process.env.NEWSLETTER_SEND_EMAILS !== "approved") return;
  for (const key of ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_NEWSLETTER_SEGMENT_ID", "GRIM_DATABASE_URL", "GRIM_INTEREST_SECRET", "GRIM_SITE_URL"]) {
    assert.ok(process.env[key], `Newsletter configuration is missing ${key}.`);
  }
  assert.equal(new URL(process.env.GRIM_SITE_URL!).origin, "https://www.moonafique.com");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const segment = await resend.segments.get(process.env.RESEND_NEWSLETTER_SEGMENT_ID!);
  assert.ok(!segment.error && segment.data?.id === process.env.RESEND_NEWSLETTER_SEGMENT_ID, "Newsletter segment is unavailable. Check the Resend key's contact permissions and segment ID.");
  const domains = await resend.domains.list();
  const senderDomain = process.env.RESEND_FROM_EMAIL!.match(/@([^>\s]+)/)?.[1];
  assert.ok(!domains.error && domains.data?.data.some(domain => domain.name === senderDomain && domain.status === "verified"), "Newsletter sender domain is not verified.");
  const pool = database();
  try {
    const result = await pool.query("SELECT to_regclass('grim.email_opt_ins') IS NOT NULL AS ready, to_regclass('grim.email_opt_in_notifications') IS NOT NULL AS outbox");
    assert.deepEqual(result.rows[0], { ready: true, outbox: true });
  } finally {
    await pool.end();
  }
  console.log("Newsletter ready: verified sender, accessible segment, and confirmation storage. No mail sent.");
}

main().catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : "Newsletter readiness check failed. Check provider access and database connectivity.");
  process.exitCode = 1;
});
