import { scheduleRefreshSeconds, type LiveSchedule } from "./live-shows";

// Only poll when the daily snapshot is due. Returning to a tab does not
// bypass this limit, and a hidden tab waits until it becomes visible.
export function startSchedulePolling(initialSchedule: LiveSchedule, receive: (schedule: LiveSchedule) => void) {
  const interval = scheduleRefreshSeconds * 1000;
  const syncedAt = Date.parse(initialSchedule.syncedAt ?? "");
  let nextAttempt = Number.isFinite(syncedAt) && syncedAt <= Date.now() + 60_000 ? syncedAt + interval : 0;
  let active = true;
  let pending = false;
  let timer: number | undefined;
  let controller: AbortController | undefined;
  const arm = () => { timer = window.setTimeout(refresh, Math.max(0, nextAttempt - Date.now())); };
  const refresh = async () => {
    if (!active || document.hidden || pending || Date.now() < nextAttempt) return;
    window.clearTimeout(timer);
    nextAttempt = Date.now() + interval;
    pending = true;
    controller = new AbortController();
    const timeout = window.setTimeout(() => controller?.abort(), 15_000);
    try {
      const response = await fetch("/api/live-shows", { cache: "no-store", signal: controller.signal });
      if (!response.ok) return;
      const next: LiveSchedule = await response.json();
      if (!active || !Array.isArray(next.shows) || typeof next.syncedAt !== "string" || !Number.isFinite(Date.parse(next.syncedAt))) return;
      receive(next);
    } catch { /* Keep the last successful snapshot until its age makes it unusable. */ }
    finally {
      window.clearTimeout(timeout);
      pending = false;
      if (active) arm();
    }
  };
  arm();
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    active = false;
    controller?.abort();
    window.clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
