import { database, one } from "../lib/grimmunity/db";
import { WhatnotReports } from "../lib/whatnot-analytics/api";
import { migrateAnalytics, readAnalytics, seedRefresh } from "../lib/whatnot-analytics/store";

async function main() {
  // Real reports never enter local builds or Vercel Preview environments.
  if (process.env.VERCEL_ENV !== "production") return;
  if (process.env.GRIM_MODE !== "live" || !process.env.GRIM_EXPECTED_NEON_PROJECT_ID || process.env.GRIM_NEON_PROJECT_ID !== process.env.GRIM_EXPECTED_NEON_PROJECT_ID)
    throw Error("Production storage identity could not be verified.");
  const pool = database();
  try {
    if (await one(pool, "SELECT id FROM grim.program WHERE id='sandbox'")) throw Error("Sandbox database rejected.");
    const api = new WhatnotReports(process.env.WHATNOT_ANALYTICS_API_TOKEN?.trim() ?? "");
    const account = await api.account();
    await migrateAnalytics(pool);
    const saved = await readAnalytics(pool);
    if (saved.snapshot && saved.snapshot.sellerId !== account.id) throw Error("Seller identity changed.");
    if (!saved.snapshot && process.env.WHATNOT_ANALYTICS_INITIAL_IMPORT === "approved") {
      const result = await seedRefresh(pool, api, {
        seller_financial_report: process.env.WHATNOT_INITIAL_FINANCIAL_REPORT ?? "",
        analytics_overview_report: process.env.WHATNOT_INITIAL_DAILY_REPORT ?? "",
        analytics_livestreams_report: process.env.WHATNOT_INITIAL_SHOWS_REPORT ?? "",
      });
      if (result?.status !== "ready") throw Error("Initial reports are not ready.");
    }
    console.log("Private Whatnot storage and account verified. No financial records are included in build output.");
  } finally { await pool.end(); }
}
main().catch(() => {
  console.error("Private Whatnot preparation failed. Check production storage, analytics permissions, and report readiness.");
  process.exitCode = 1;
});
