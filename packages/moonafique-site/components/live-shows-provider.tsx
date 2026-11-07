"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { emptySchedule, scheduleState, type LiveSchedule } from "@/lib/live-shows";

const ScheduleContext = createContext<LiveSchedule>(emptySchedule);

export function LiveShowsProvider({ initialSchedule, children }: { initialSchedule: LiveSchedule; children?: ReactNode }) {
  const [schedule, setSchedule] = useState(initialSchedule);
  useEffect(() => {
    let active = true;
    let pending = false;
    let lastAttempt = 0;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden || pending || Date.now() - lastAttempt < 15_000) return;
      lastAttempt = Date.now();
      pending = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 15_000);
      try {
        const response = await fetch("/api/live-shows", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const next: LiveSchedule = await response.json();
        if (!active || !Array.isArray(next.shows) || typeof next.syncedAt !== "string" || !Number.isFinite(Date.parse(next.syncedAt))) return;
        // A valid empty list clears cancelled shows. A failed fetch preserves
        // the previous snapshot until its age makes it unusable.
        setSchedule(previous => !previous.syncedAt || Date.parse(next.syncedAt!) >= Date.parse(previous.syncedAt) ? next : previous);
      } catch { /* Keep the last successful response; the UI checks its age. */ }
      finally { window.clearTimeout(timeout); pending = false; }
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return <ScheduleContext.Provider value={schedule}>{children}</ScheduleContext.Provider>;
}

export function useLiveSchedule(now: Date) {
  const schedule = useContext(ScheduleContext);
  const state = scheduleState(schedule, now);
  return { ...schedule, shows: state === "unavailable" ? [] : schedule.shows, state, trustLiveStatus: state === "current" };
}
