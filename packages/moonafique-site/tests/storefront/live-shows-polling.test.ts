import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startSchedulePolling } from "@/lib/live-shows-polling";
import type { LiveSchedule } from "@/lib/live-shows";

const day = 24 * 60 * 60 * 1000;
const initial: LiveSchedule = { shows: [], syncedAt: "2026-11-09T10:00:00Z" };
let browser: EventTarget;
let page: EventTarget & { hidden: boolean };
let cleanup: (() => void) | undefined;
const fetcher = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(initial.syncedAt!));
  browser = new EventTarget();
  page = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("window", Object.assign(browser, { setTimeout, clearTimeout }));
  vi.stubGlobal("document", page);
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockReset().mockImplementation(async () => Response.json({ shows: [], syncedAt: new Date().toISOString() }));
});
afterEach(() => { cleanup?.(); cleanup = undefined; vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("daily show polling", () => {
  it("waits a full day and ignores repeated focus events between daily requests", async () => {
    const receive = vi.fn();
    cleanup = startSchedulePolling(initial, receive);
    await vi.advanceTimersByTimeAsync(day - 1);
    browser.dispatchEvent(new Event("focus"));
    page.dispatchEvent(new Event("visibilitychange"));
    expect(fetcher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(receive).toHaveBeenCalledTimes(1);
    browser.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(day - 1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("waits only for the remaining part of the snapshot's day", async () => {
    vi.setSystemTime(Date.now() + day - 1000);
    cleanup = startSchedulePolling(initial, vi.fn());
    await vi.advanceTimersByTimeAsync(999);
    expect(fetcher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("defers a hidden tab's overdue refresh until it is visible", async () => {
    page.hidden = true;
    cleanup = startSchedulePolling(initial, vi.fn());
    await vi.advanceTimersByTimeAsync(day * 2);
    expect(fetcher).not.toHaveBeenCalled();
    page.hidden = false;
    page.dispatchEvent(new Event("visibilitychange"));
    browser.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("checks an overdue snapshot once and waits until the next day after failure", async () => {
    vi.setSystemTime(Date.now() + day);
    fetcher.mockResolvedValue(new Response(null, { status: 503 }));
    const receive = vi.fn();
    cleanup = startSchedulePolling(initial, receive);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    browser.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(day - 1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(receive).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops timers and tab listeners on cleanup", async () => {
    cleanup = startSchedulePolling(initial, vi.fn());
    cleanup();
    await vi.advanceTimersByTimeAsync(day * 2);
    browser.dispatchEvent(new Event("focus"));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
