import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { emptySchedule, scheduleRefreshSeconds, scheduleState, type LiveSchedule } from "./live-shows";
import { fetchWhatnotSchedule, WhatnotSyncError } from "./whatnot-api";

const token = process.env.WHATNOT_API_TOKEN?.trim() ?? "";
// Rotating/removing the token cannot reuse a different connection's snapshot.
const connection = createHash("sha256").update(token).digest("hex");
let pending: Promise<LiveSchedule> | undefined;
let retryAfter = 0;

const cachedSchedule = unstable_cache(async () => {
  if (Date.now() < retryAfter) throw new WhatnotSyncError("connection");
  if (!pending) {
    pending = fetchWhatnotSchedule(token).catch(error => {
      retryAfter = Date.now() + (error instanceof WhatnotSyncError ? error.retryAfterMs : 60_000);
      throw error;
    }).finally(() => { pending = undefined; });
  }
  return pending;
}, ["whatnot-public-schedule-v3", connection], { revalidate: scheduleRefreshSeconds });

export async function getLiveSchedule(): Promise<LiveSchedule> {
  if (!token) return emptySchedule;
  try {
    let schedule = await cachedSchedule();
    // Join an already-started daily refresh so a daily browser check receives
    // the new dates in this response, without making another provider request.
    // Next retains the last successful snapshot if that refresh fails.
    if (pending) schedule = await pending.catch(() => schedule);
    return scheduleState(schedule, new Date()) === "unavailable" ? emptySchedule : schedule;
  } catch (error) {
    console.warn(error instanceof WhatnotSyncError ? error.message : "Whatnot schedule is temporarily unavailable.");
    return emptySchedule;
  }
}
