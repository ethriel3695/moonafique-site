import { whatnotUrl } from "./site-content";

export type LiveShow = {
  id: string;
  title: string;
  series: "grimmfest" | "collectibles" | "art" | "print-wars";
  startsAt: string;
  href: string;
  description: string;
};

export const showTimeZone = "America/Boise";
export const scheduleCheckedOn = "2026-11-07";

// Selected shows verified against Moonafique's Whatnot schedule. Keep explicit
// offsets and direct show links. This is a curated schedule, not a live feed.
export const liveShows: LiveShow[] = [
  {
    id: "grimmfest-november-2026",
    title: "Grimmfest Extravaganza",
    series: "grimmfest",
    startsAt: "2026-11-07T20:00:00-07:00",
    href: "https://www.whatnot.com/live/85b8e152-e819-4cca-baf8-f48eeecd17fb",
    description: "Spend an evening in our Grimm world: collectible characters, painted details, and a little Moonafique mischief.",
  },
  ...[
    ["2026-11-08T15:00:00-07:00", "7aec07bd-904d-401c-b222-2dff477aa51a"],
    ["2026-11-12T20:00:00-07:00", "33381f20-0867-40e0-a63e-f57a4c18d37a"],
    ["2026-11-13T20:00:00-07:00", "bf8cb128-5ef5-48dd-b3d9-08bb0cf61b15"],
    ["2026-11-14T20:00:00-07:00", "7343c76b-8b9c-4b1c-b764-cedfec9f1048"],
  ].map(([startsAt, id]): LiveShow => ({
    id,
    startsAt,
    title: "Plot Twists & Side Quests",
    series: "collectibles",
    href: `https://www.whatnot.com/live/${id}`,
    description: "3D printed collectibles, art curiosities, and a closer look at the pieces on our table.",
  })),
  ...[
    ["2026-11-09T13:00:00-07:00", "98b1ea52-3dca-4cce-aa2d-d180ac628539"],
    ["2026-11-10T15:00:00-07:00", "50ebdee2-9dd0-4d34-9281-e88788160f97"],
    ["2026-11-16T13:00:00-07:00", "abf8f680-ea62-40c8-b355-795973c20a32"],
    ["2026-11-17T15:00:00-07:00", "0e7a7bc4-181c-4ea5-96f1-b845cbabc1a3"],
  ].map(([startsAt, id]): LiveShow => ({
    id,
    startsAt,
    title: "ACEO Art Cards",
    series: "art",
    href: `https://www.whatnot.com/live/${id}`,
    description: "Come for the art, stay for the conversation. Explore original artwork on a miniature scale.",
  })),
];

export function showDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: showTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

export function showDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: showTimeZone, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function showTime(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: showTimeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(date));
}

export function upcomingShows(now: Date, shows = liveShows) {
  return shows.filter((show) => new Date(show.startsAt).getTime() > now.getTime())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

// A time on a schedule cannot prove a broadcast is live. Keep the latest show
// from today discoverable, but label it "Scheduled today" and defer to Whatnot.
export function featuredShow(now: Date, shows = liveShows) {
  const today = shows.filter((show) => Date.parse(show.startsAt) <= now.getTime() && showDay(show.startsAt) === showDay(now))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return today[0] ?? upcomingShows(now, shows)[0];
}

export function showAction(show: LiveShow, now: Date) {
  return Date.parse(show.startsAt) <= now.getTime() ? "Open show on Whatnot" : "Bookmark on Whatnot";
}

export const allShowsUrl = whatnotUrl;
