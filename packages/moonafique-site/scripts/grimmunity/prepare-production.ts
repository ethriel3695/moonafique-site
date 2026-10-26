import { database, one } from "../../lib/grimmunity/db";
import { migrate } from "../../lib/grimmunity/migrations";

async function main() {
  if (process.env.VERCEL_ENV !== "production" || process.env.GRIM_MODE !== "live")
    throw new Error("Production preparation requires live mode on Vercel Production.");
  const expected = process.env.GRIM_EXPECTED_NEON_PROJECT_ID;
  if (!expected || process.env.GRIM_NEON_PROJECT_ID !== expected)
    throw new Error("The connected Neon project does not match the production database.");
  const pool = database();
  try {
    const schema = await one<{ present: boolean }>(pool, "SELECT to_regclass('grim.program') IS NOT NULL AS present");
    if (schema?.present && await one(pool, "SELECT id FROM grim.program WHERE id='sandbox'"))
      throw new Error("Refusing to use a sandbox database for production.");
    await migrate(pool);
    if (process.env.GRIM_PRODUCTION_SETUP === "draft") {
      const { prepareLiveDraft } = await import("./prepare-live-draft");
      await prepareLiveDraft(pool);
    }
    if (process.env.GRIM_INTEREST_SMOKE_CLEANUP === "approved") {
      const result = await pool.query("DELETE FROM grim.interest WHERE mode='live' AND email='grimmunity-launch-smoke-20261024@example.invalid'");
      console.log(`Removed ${result.rowCount} synthetic interest smoke-test record(s).`);
    }
    console.log("Grimmunity production schema verified. Enrollment approval was not changed.");
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error("Grimmunity production preparation failed. Check the environment, expected Neon project, and connectivity.");
  process.exitCode = 1;
});
