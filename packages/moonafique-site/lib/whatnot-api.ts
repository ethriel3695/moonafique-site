import { z } from "zod";
import type { LiveSchedule, LiveShow } from "./live-shows";

const apiBase = "https://api.whatnot.com/seller-api/rest/v2";
const account = "moonafique";
const showSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(2000),
  status: z.enum(["scheduled", "live", "stopped", "ended", "cancelled"]),
  visibility: z.enum(["public", "private"]),
  scheduled_start_at: z.iso.datetime().nullable(),
});
const pageSchema = z.object({ data: z.array(showSchema).max(50), next_cursor: z.string().min(1).max(2048).nullable() });

// Only these fixed messages may reach logs. Never log provider response bodies,
// request options, tokens, private shows, or the underlying fetch error.
export class WhatnotSyncError extends Error {
  constructor(public readonly code: "configuration" | "connection" | "authorization" | "account" | "response" | "pagination" | "rate-limit", public readonly retryAfterMs = 60_000) {
    super(`Whatnot schedule sync failed: ${code}.`);
    this.name = "WhatnotSyncError";
  }
}

function seriesFor(title: string): LiveShow["series"] {
  if (/print[\s-]*wars/i.test(title)) return "print-wars";
  if (/grimm?[\s-]*fest/i.test(title)) return "grimmfest";
  if (/\baceos?\b|art cards/i.test(title)) return "art";
  return "collectibles";
}

const descriptions: Record<LiveShow["series"], string> = {
  grimmfest: "Spend an evening in our Grimm world: collectible characters, painted details, and a little Moonafique mischief.",
  art: "Come for the art, stay for the conversation. Explore original artwork on a miniature scale.",
  "print-wars": "Join us for 3DA’s Print Wars: a creative challenge and a closer look at our latest entry.",
  collectibles: "Join Moonafique at the live table. Open the show on Whatnot for the details and a reminder.",
};

// Called only by the server cache and the read-only deployment check.
export async function fetchWhatnotSchedule(token: string, fetcher: typeof fetch = fetch): Promise<LiveSchedule> {
  if (!token || /\s/.test(token)) throw new WhatnotSyncError("configuration");
  const signal = AbortSignal.timeout(10_000);
  async function read(path: string) {
    try {
      const response = await fetcher(`${apiBase}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store", redirect: "error", signal,
      });
      if (response.status === 401 || response.status === 403) throw new WhatnotSyncError("authorization");
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After") ?? "60";
        const delay = /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
        throw new WhatnotSyncError("rate-limit", Number.isFinite(delay) ? Math.max(60_000, delay) : 60_000);
      }
      if (!response.ok) throw new WhatnotSyncError("connection");
      return await response.json();
    } catch (error) {
      throw error instanceof WhatnotSyncError ? error : new WhatnotSyncError("connection");
    }
  }

  const user = z.object({ username: z.string() }).safeParse(await read("/users/me"));
  if (!user.success) throw new WhatnotSyncError("response");
  if (user.data.username.toLowerCase() !== account) throw new WhatnotSyncError("account");

  const shows = new Map<string, LiveShow>();
  // Scheduled first, then live, so a show that starts during pagination takes
  // its newer live status. A failed page rejects the entire replacement.
  for (const status of ["scheduled", "live"] as const) {
    let cursor: string | null = null;
    const visited = new Set<string>();
    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({ status, limit: "50", reverse: "false" });
      if (cursor) params.set("cursor", cursor);
      const result = pageSchema.safeParse(await read(`/shows?${params}`));
      if (!result.success) throw new WhatnotSyncError("response");
      for (const show of result.data.data) {
        if (show.visibility !== "public" || (show.status !== "scheduled" && show.status !== "live")) {
          shows.delete(show.id);
          continue;
        }
        if (show.status === "scheduled" && !show.scheduled_start_at) continue;
        const series = seriesFor(show.title);
        // Keep the owner's 3DA references limited to Print Wars. The full
        // Whatnot profile remains available for other group events.
        if (series !== "print-wars" && /\b3da\b|3d[\s-]*addicts/i.test(show.title)) continue;
        shows.set(show.id, {
          id: show.id, title: show.title, series, status: show.status,
          startsAt: show.scheduled_start_at,
          // The API's `url` points to the private seller dashboard.
          href: `https://www.whatnot.com/live/${show.id}`,
          description: descriptions[series],
        });
      }
      cursor = result.data.next_cursor;
      if (!cursor) break;
      if (visited.has(cursor) || page === 9) throw new WhatnotSyncError("pagination");
      visited.add(cursor);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  return {
    shows: [...shows.values()].sort((a, b) => (a.startsAt ? Date.parse(a.startsAt) : 0) - (b.startsAt ? Date.parse(b.startsAt) : 0)),
    syncedAt: new Date().toISOString(),
  };
}
