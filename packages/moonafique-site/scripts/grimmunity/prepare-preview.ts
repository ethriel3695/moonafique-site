import { database, one } from "../../lib/grimmunity/db";
import { migrate } from "../../lib/grimmunity/migrations";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { provisionPreview } from "./provision-preview";

// Run explicitly in the sandbox deployment's build command, never a normal build.
async function main() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.GRIM_MODE !== "sandbox")
    throw new Error("Sandbox preparation requires a Vercel Preview deployment.");
  const expected = process.env.GRIM_EXPECTED_NEON_PROJECT_ID;
  if (!expected || process.env.GRIM_NEON_PROJECT_ID !== expected)
    throw new Error("The connected Neon project does not match the sandbox database.");
  if (process.env.GRIM_LIVE_ENROLLMENT === "approved")
    throw new Error("Live enrollment must remain disabled in the sandbox.");

  const pool = database();
  try {
    const schema = await one<{ present: boolean }>(pool, "SELECT to_regclass('grim.program') IS NOT NULL AS present");
    if (schema?.present && await one(pool, "SELECT id FROM grim.program WHERE id='live'"))
      throw new Error("Refusing to seed a database containing a live program.");
    await migrate(pool);
    await seedSandbox(pool);
    if (process.env.GRIM_VERIFY_STRIPE === "approved") {
      const { verifyStripeLifecycle } = await import("./verify-stripe-lifecycle");
      await verifyStripeLifecycle();
    }
    const phase = process.env.GRIM_PREVIEW_SETUP;
    if (phase) {
      if (phase !== "provision" && phase !== "enable") throw Error("Unknown preview setup phase");
      await provisionPreview(pool, phase);
    }
    const program = await one(pool,
      "SELECT enabled,member_cap,currency,tiers->0->>'amount' AS membership_cents,tiers->0->'shipping'->>'amount' AS shipping_cents FROM grim.program WHERE id='sandbox'",
    );
    const migrations = (await pool.query("SELECT version FROM grim.schema_migrations ORDER BY version")).rows;
    console.log("Grimmunity sandbox database verified:", JSON.stringify({ migrations, program }));
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  // Connection errors can contain credentials; do not include raw provider errors in build logs.
  console.error("Grimmunity preview database preparation failed. Check Preview mode, the expected Neon project, and database connectivity.");
  process.exitCode = 1;
});
