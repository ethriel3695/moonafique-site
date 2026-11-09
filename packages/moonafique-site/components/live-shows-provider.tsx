"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { emptySchedule, scheduleState, trustScheduleLiveStatus, type LiveSchedule } from "@/lib/live-shows";
import { startSchedulePolling } from "@/lib/live-shows-polling";

const ScheduleContext = createContext<LiveSchedule>(emptySchedule);

export function LiveShowsProvider({ initialSchedule, children }: { initialSchedule: LiveSchedule; children?: ReactNode }) {
  const [schedule, setSchedule] = useState(initialSchedule);
  useEffect(() => startSchedulePolling(initialSchedule, next => {
    // A valid empty list clears cancelled shows; older snapshots cannot
    // replace newer dates already displayed in this tab.
    setSchedule(previous => !previous.syncedAt || Date.parse(next.syncedAt!) >= Date.parse(previous.syncedAt) ? next : previous);
  }), [initialSchedule]);
  return <ScheduleContext.Provider value={schedule}>{children}</ScheduleContext.Provider>;
}

export function useLiveSchedule(now: Date) {
  const schedule = useContext(ScheduleContext);
  const state = scheduleState(schedule, now);
  return { ...schedule, shows: state === "unavailable" ? [] : schedule.shows, state, trustLiveStatus: trustScheduleLiveStatus(schedule, now) };
}
