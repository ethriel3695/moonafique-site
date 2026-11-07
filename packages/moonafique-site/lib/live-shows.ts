import { whatnotUrl } from "./site-content";

export type LiveShow = {
  id: string;
  title: string;
  series: "grimmfest" | "collectibles" | "art" | "print-wars";
  status: "scheduled" | "live";
  startsAt: string | null;
  href: string;
  description: string;
};

export type LiveSchedule = { shows: LiveShow[]; syncedAt: string | null };
export const emptySchedule: LiveSchedule = { shows: [], syncedAt: null };
export const scheduleRefreshSeconds = 120;
export const showTimeZone = "America/Boise";

export function scheduleState(schedule: LiveSchedule, now: Date) {
  const age = schedule.syncedAt ? now.getTime() - Date.parse(schedule.syncedAt) : Infinity;
  if (!Number.isFinite(age) || age > 24 * 60 * 60_000 || age < -60_000) return "unavailable";
  return age > 10 * 60_000 ? "stale" : "current";
}

export function showDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: showTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

export function showDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: showTimeZone, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function showTime(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: showTimeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(date));
}

export function upcomingShows(now: Date, shows: LiveShow[]) {
  return shows.filter(show => show.startsAt && Date.parse(show.startsAt) > now.getTime())
    .sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!));
}

// Only a recent API response can establish that a show is live. Scheduled shows
// remain discoverable on their Mountain calendar day if a host starts late.
export function featuredShow(now: Date, shows: LiveShow[], trustLiveStatus = false) {
  const live = trustLiveStatus ? shows.find(show => show.status === "live") : undefined;
  const today = shows.filter(show => show.startsAt && Date.parse(show.startsAt) <= now.getTime() && showDay(show.startsAt) === showDay(now))
    .sort((a, b) => Date.parse(b.startsAt!) - Date.parse(a.startsAt!));
  return live ?? today[0] ?? upcomingShows(now, shows)[0];
}

export function showAction(show: LiveShow, now: Date, trustLiveStatus = false) {
  if (trustLiveStatus && show.status === "live") return "Watch on Whatnot";
  return !show.startsAt || Date.parse(show.startsAt) <= now.getTime() ? "Open show on Whatnot" : "Bookmark on Whatnot";
}

export const allShowsUrl = whatnotUrl;
