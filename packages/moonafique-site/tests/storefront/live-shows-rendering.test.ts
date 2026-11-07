import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveShowsProvider } from "@/components/live-shows-provider";
import { NextShowCard, ShowSchedule, GrimmfestShowLink } from "@/components/live-shows";
import type { LiveSchedule, LiveShow } from "@/lib/live-shows";

const initialNow = "2026-11-08T02:00:00.000Z";
const show: LiveShow = { id: "show", title: "Grimm-Fest & friends", series: "grimmfest", status: "scheduled", startsAt: "2026-11-08T03:00:00.000Z", href: "https://www.whatnot.com/live/show", description: "Join us." };
function render(schedule: LiveSchedule) {
  return renderToString(createElement(LiveShowsProvider, { initialSchedule: schedule },
    createElement(NextShowCard, { initialNow, key: "card" }),
    createElement(ShowSchedule, { initialNow, key: "schedule" }),
    createElement(GrimmfestShowLink, { initialNow, key: "grimmfest" }),
  ));
}

describe("server-rendered show experience", () => {
  it("renders the same imported date and viewer link in the next-show and Grimmfest features", () => {
    const html = render({ shows: [show], syncedAt: initialNow });
    expect(html.match(/8:00 PM MST/g)).toHaveLength(2);
    expect(html.match(/href="https:\/\/www.whatnot.com\/live\/show"/g)).toHaveLength(2);
    expect(html).toContain("Grimm-Fest &amp; friends");
    expect(html).toContain("Updated from Whatnot");
    expect(html).not.toContain("Live now on Whatnot");
  });

  it("handles empty schedules and unavailable connections with useful profile links", () => {
    const empty = render({ shows: [], syncedAt: initialNow });
    expect(empty).toContain("There’s more to come.");
    expect(empty).toContain("More dates will appear");
    const unavailable = render({ shows: [], syncedAt: null });
    expect(unavailable).toContain("Meet us on Whatnot.");
    expect(unavailable).toContain("schedule is temporarily unavailable");
    expect(unavailable).toContain("Follow Moonafique on Whatnot");
  });

  it("warns about stale dates and hides dates older than a day", () => {
    const stale = render({ shows: [{ ...show, status: "live" }], syncedAt: "2026-11-08T01:40:00Z" });
    expect(stale).toContain("Last successful update");
    expect(stale).toContain("Dates may have changed");
    expect(stale).not.toContain("Live now on Whatnot");
    const expired = render({ shows: [show], syncedAt: "2026-11-07T01:59:59Z" });
    expect(expired).not.toContain("8:00 PM MST");
    expect(expired).not.toContain("Grimm-Fest &amp; friends");
  });

  it("can feature a current spontaneous live show without inventing a start time", () => {
    const html = render({ shows: [{ ...show, status: "live", startsAt: null }], syncedAt: initialNow });
    expect(html).toContain("Live now on Whatnot");
    expect(html).toContain("Grimmfest is live on Whatnot");
    expect(html).toContain("Watch on Whatnot");
    expect(html).not.toContain("8:00 PM MST");
  });
});
