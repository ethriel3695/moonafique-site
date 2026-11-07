import { describe, expect, it } from "vitest";
import { featuredShow, showAction, showDate, showDay, showTime, upcomingShows, type LiveShow } from "@/lib/live-shows";

const shows: LiveShow[] = [
  { id: "second", title: "Second", series: "art", startsAt: "2026-11-08T15:00:00-07:00", href: "https://www.whatnot.com/live/second", description: "" },
  { id: "first", title: "Grimmfest", series: "grimmfest", startsAt: "2026-11-07T20:00:00-07:00", href: "https://www.whatnot.com/live/first", description: "" },
];

describe("show schedule lifecycle", () => {
  it("orders confirmed future shows regardless of content order", () => {
    expect(upcomingShows(new Date("2026-11-07T12:00:00-07:00"), shows).map(s => s.id)).toEqual(["first", "second"]);
  });
  it("keeps tonight’s show discoverable after its scheduled start without claiming it is live", () => {
    const now = new Date("2026-11-07T22:00:00-07:00");
    expect(featuredShow(now, shows)?.id).toBe("first");
    expect(upcomingShows(now, shows).map(s => s.id)).toEqual(["second"]);
    expect(showAction(shows[1], now)).toBe("Open show on Whatnot");
  });
  it("advances the card at Mountain midnight, not UTC midnight", () => {
    expect(featuredShow(new Date("2026-11-08T06:59:59Z"), shows)?.id).toBe("first");
    expect(featuredShow(new Date("2026-11-08T07:00:00Z"), shows)?.id).toBe("second");
  });
  it("has no expired next show after the schedule runs out", () => {
    expect(featuredShow(new Date("2026-11-09T07:00:00Z"), shows)).toBeUndefined();
    expect(upcomingShows(new Date("2026-11-09T07:00:00Z"), shows)).toEqual([]);
  });
  it("formats the event in Mountain Time and handles daylight saving time", () => {
    expect(showDate("2026-11-08T03:00:00Z")).toBe("Sat, Nov 7, 2026");
    expect(showTime("2026-11-08T03:00:00Z")).toBe("8:00 PM MST");
    expect(showTime("2026-08-08T02:00:00Z")).toBe("8:00 PM MDT");
    expect(showDay("2026-11-08T03:00:00Z")).toBe("2026-11-07");
  });
});
