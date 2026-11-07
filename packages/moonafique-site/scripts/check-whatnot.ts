import { fetchWhatnotSchedule, WhatnotSyncError } from "../lib/whatnot-api";

// Read-only: verifies the seller and public schedule. Does not change a show.
async function main() {
  const token = process.env.WHATNOT_API_TOKEN?.trim();
  if (!token) {
    if (process.env.VERCEL_ENV === "production") throw new WhatnotSyncError("configuration");
    console.log("Whatnot sync is not configured for this non-production environment.");
    return;
  }
  const schedule = await fetchWhatnotSchedule(token);
  console.log(`Whatnot sync ready: verified Moonafique account; ${schedule.shows.length} public shows imported.`);
}

main().catch(error => {
  console.error(error instanceof WhatnotSyncError ? error.message : "Whatnot readiness check failed.");
  process.exitCode = 1;
});
