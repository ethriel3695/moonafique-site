import { describe, expect, it, vi } from "vitest";
import { fetchWhatnotSchedule, WhatnotSyncError } from "@/lib/whatnot-api";
import { emptySchedule, featuredShow, scheduleState, showAction, type LiveShow } from "@/lib/live-shows";

const id = (n: number) => `85b8e152-e819-4cca-baf8-${n.toString().padStart(12, "0")}`;
const show = (n: number, extra: Record<string, unknown> = {}) => ({
  id: id(n), title: "Grimm-Fest Extravaganza", status: "scheduled", visibility: "public",
  scheduled_start_at: "2026-11-08T03:00:00.000Z",
  url: "https://www.whatnot.com/dashboard/lives/edit/private-dashboard",
  description: "Raw provider copy is not automatically published.", ...extra,
});
const page = (data: unknown[], next_cursor: string | null = null) => ({ data, next_cursor });
function fakeApi(...responses: unknown[]) {
  return vi.fn<typeof fetch>().mockImplementation(async () => {
    const next = responses.shift();
    if (next === undefined) throw Error("Unexpected request");
    return next instanceof Response ? next : Response.json(next);
  });
}
const user = { username: "Moonafique" };

describe("official Whatnot schedule import", () => {
  it("verifies the seller, follows pagination, sorts and deduplicates shows, and uses viewer links", async () => {
    const api = fakeApi(user,
      page([show(2, { title: "ACEO cards", scheduled_start_at: "2026-11-09T03:00:00.000Z" })], "next cursor/?"),
      page([show(1)]), page([show(1, { status: "live" })]));
    const result = await fetchWhatnotSchedule("test-token", api);
    expect(result.shows.map(s => [s.id, s.series, s.status])).toEqual([[id(1), "grimmfest", "live"], [id(2), "art", "scheduled"]]);
    expect(result.shows[0].href).toBe(`https://www.whatnot.com/live/${id(1)}`);
    expect(JSON.stringify(result)).not.toMatch(/private-dashboard|Raw provider|test-token/);
    expect(result.syncedAt).toMatch(/^\d{4}-/);
    expect(String(api.mock.calls[0][0])).toBe("https://api.whatnot.com/seller-api/rest/v2/users/me");
    expect(new URL(String(api.mock.calls[2][0])).searchParams.get("cursor")).toBe("next cursor/?");
    for (const [url, options] of api.mock.calls) {
      expect(new URL(String(url)).origin).toBe("https://api.whatnot.com");
      expect(options).toMatchObject({ redirect: "error", cache: "no-store", headers: { Authorization: "Bearer test-token" } });
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("excludes private, ended, cancelled, stopped and undated scheduled shows; limits 3DA to Print Wars", async () => {
    const api = fakeApi(user, page([
      show(1, { visibility: "private" }), show(2, { status: "ended" }), show(3, { status: "cancelled" }),
      show(4, { status: "stopped" }), show(5, { scheduled_start_at: null }),
      show(6, { title: "3DA Giving Tree" }), show(7, { title: "3D-Addicts raid" }),
      show(8, { title: "3DA Print Wars" }), show(9, { title: "Grim-Fest" }),
    ]), page([show(10, { status: "live", scheduled_start_at: null })]));
    const result = await fetchWhatnotSchedule("test-token", api);
    expect(result.shows.map(s => s.id).sort()).toEqual([id(8), id(9), id(10)].sort());
    expect(result.shows.find(s => s.id === id(8))?.series).toBe("print-wars");
    expect(result.shows.find(s => s.id === id(9))?.series).toBe("grimmfest");
  });

  it("removes a show whose visibility changes during the import", async () => {
    const result = await fetchWhatnotSchedule("test-token", fakeApi(user, page([show(1)]), page([show(1, { status: "live", visibility: "private" })])));
    expect(result.shows).toEqual([]);
  });

  it("treats an empty schedule as a successful replacement", async () => {
    const result = await fetchWhatnotSchedule("test-token", fakeApi(user, page([]), page([])));
    expect(result.shows).toEqual([]);
    expect(result.syncedAt).not.toBeNull();
  });

  it("refuses another seller's token before requesting their shows", async () => {
    const api = fakeApi({ username: "someone_else" });
    await expect(fetchWhatnotSchedule("test-token", api)).rejects.toMatchObject({ code: "account" });
    expect(api).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 429, 500])("rejects HTTP %s without exposing response details or keeping a partial import", async status => {
    const api = fakeApi(user, page([show(1)], "page2"), new Response("sensitive provider detail", { status, headers: { "Retry-After": "180" } }));
    let error: unknown;
    try { await fetchWhatnotSchedule("test-token", api); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(WhatnotSyncError);
    expect(String(error)).not.toMatch(/sensitive|test-token/);
    if (status === 429) expect((error as WhatnotSyncError).retryAfterMs).toBe(180_000);
  });

  it("rejects a repeated cursor instead of saving a truncated schedule", async () => {
    await expect(fetchWhatnotSchedule("test-token", fakeApi(user, page([show(1)], "repeat"), page([show(2)], "repeat"))))
      .rejects.toMatchObject({ code: "pagination" });
  });

  it.each([{ id: "../../dashboard" }, { scheduled_start_at: "not a date" }, { visibility: "unknown" }])("rejects malformed provider data %j", async extra => {
    await expect(fetchWhatnotSchedule("test-token", fakeApi(user, page([show(1, extra)]))))
      .rejects.toMatchObject({ code: "response" });
  });

  it("sanitizes network failures and refuses whitespace in credentials", async () => {
    const api = vi.fn<typeof fetch>().mockRejectedValue(Error("test-token network detail"));
    await expect(fetchWhatnotSchedule("test-token", api)).rejects.toThrow("Whatnot schedule sync failed: connection.");
    await expect(fetchWhatnotSchedule("Bearer test-token", api)).rejects.toMatchObject({ code: "configuration" });
    expect(api).toHaveBeenCalledTimes(1);
  });
});

describe("schedule freshness and live status", () => {
  const now = new Date("2026-11-08T04:00:00Z");
  const live: LiveShow = { id: id(1), title: "Grimmfest", series: "grimmfest", status: "live", startsAt: null, href: `https://www.whatnot.com/live/${id(1)}`, description: "" };

  it("labels missing and day-old snapshots unavailable and ten-minute-old snapshots stale", () => {
    expect(scheduleState(emptySchedule, now)).toBe("unavailable");
    expect(scheduleState({ shows: [], syncedAt: "2026-11-08T03:59:00Z" }, now)).toBe("current");
    expect(scheduleState({ shows: [], syncedAt: "2026-11-08T03:49:59Z" }, now)).toBe("stale");
    expect(scheduleState({ shows: [], syncedAt: "2026-11-07T03:59:59Z" }, now)).toBe("unavailable");
  });

  it("only trusts live status from a fresh snapshot, including an unscheduled broadcast", () => {
    expect(featuredShow(now, [live], true)).toBe(live);
    expect(featuredShow(now, [live], false)).toBeUndefined();
    expect(showAction(live, now, true)).toBe("Watch on Whatnot");
    expect(showAction(live, now, false)).toBe("Open show on Whatnot");
  });
});
