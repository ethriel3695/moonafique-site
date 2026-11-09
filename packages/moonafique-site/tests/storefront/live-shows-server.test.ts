import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { LiveSchedule } from "@/lib/live-shows";

const cache = vi.hoisted(() => ({ value: { shows: [], syncedAt: "2026-11-08T10:00:00Z" } as LiveSchedule, refresh: true }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => Promise<LiveSchedule>) => async () => {
    // Next returns the retained snapshot after starting an expired entry's refresh.
    if (cache.refresh) void callback().catch(() => {});
    return cache.value;
  },
}));
vi.mock("@/lib/whatnot-api", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/whatnot-api")>(),
  fetchWhatnotSchedule: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T10:01:00Z"));
  vi.stubEnv("WHATNOT_API_TOKEN", "test-token");
  cache.refresh = true;
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("daily schedule responses", () => {
  it("waits for the pending refresh and returns its new snapshot in the same request", async () => {
    const { fetchWhatnotSchedule } = await import("@/lib/whatnot-api");
    const fresh: LiveSchedule = { shows: [], syncedAt: new Date().toISOString() };
    vi.mocked(fetchWhatnotSchedule).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(fresh), 100)));
    const { getLiveSchedule } = await import("@/lib/live-shows-server");
    const response = getLiveSchedule();
    await vi.advanceTimersByTimeAsync(100);
    expect(await response).toEqual(fresh);
    expect(fetchWhatnotSchedule).toHaveBeenCalledTimes(1);
  });

  it("retains yesterday's schedule when the daily refresh fails", async () => {
    const { fetchWhatnotSchedule } = await import("@/lib/whatnot-api");
    vi.mocked(fetchWhatnotSchedule).mockRejectedValue(new Error("connection failed"));
    const { getLiveSchedule } = await import("@/lib/live-shows-server");
    expect(await getLiveSchedule()).toEqual(cache.value);
  });

  it("serves a cached snapshot without another provider request before it expires", async () => {
    cache.refresh = false;
    const { fetchWhatnotSchedule } = await import("@/lib/whatnot-api");
    const { getLiveSchedule } = await import("@/lib/live-shows-server");
    expect(await getLiveSchedule()).toEqual(cache.value);
    expect(fetchWhatnotSchedule).not.toHaveBeenCalled();
  });
});
