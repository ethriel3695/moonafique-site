"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrimGroupPhoto } from "@/components/grimmunity/group-photo";
import { allShowsUrl, featuredShow, showAction, showDate, showDay, showTime, upcomingShows, type LiveShow } from "@/lib/live-shows";
import { useLiveSchedule } from "@/components/live-shows-provider";

function useShowClock(initialNow: string) {
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return now;
}

export function ShowTime({ show }: { show: LiveShow }) {
  return show.startsAt ? <time dateTime={show.startsAt}>{showDate(show.startsAt)} <span aria-hidden="true">·</span> {showTime(show.startsAt)}</time> : <span>Live on Whatnot</span>;
}

export function NextShowCard({ initialNow, compact = false }: { initialNow: string; compact?: boolean }) {
  const now = useShowClock(initialNow);
  const schedule = useLiveSchedule(now);
  const show = featuredShow(now, schedule.shows, schedule.trustLiveStatus);
  const live = show?.status === "live" && schedule.trustLiveStatus;
  const started = show?.startsAt && Date.parse(show.startsAt) <= now.getTime();
  const image = show?.series === "art"
    ? { src: "/showcase/IMG_0906.jpeg", alt: "An original Moonafique dinosaur ACEO with colorful painted details." }
    : { src: "/showcase/grim-of-the-month-august-september-october.jpg", alt: "Three painted Moonafique Grims with their matching pets." };
  return (
    <section aria-labelledby={compact ? "next-show-heading" : "featured-show-heading"} className="overflow-hidden rounded-[2rem] border border-primary/20 bg-card shadow-soft">
      <div className={compact ? "grid md:grid-cols-[minmax(0,1fr)_260px]" : "grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]"}>
        <div className="min-w-0 p-6 sm:p-9">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary">
            <CalendarDays className="size-4" aria-hidden="true" />
            {live ? "Live now on Whatnot" : started ? "Scheduled today" : show ? "Next on Whatnot" : "Live with Moonafique"}
          </p>
          <h2 id={compact ? "next-show-heading" : "featured-show-heading"} className="mt-4 break-words text-3xl leading-tight sm:text-4xl">
            {show?.title ?? (schedule.state === "unavailable" ? "Meet us on Whatnot." : "There’s more to come.")}
          </h2>
          {show && <p className="mt-4 text-sm font-bold text-primary"><ShowTime show={show} /></p>}
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            {show?.description ?? "Find the latest shows on Whatnot and follow Moonafique for the next announcement."}
          </p>
          {schedule.state === "stale" ? <p className="mt-3 text-sm text-muted-foreground">We’re having trouble refreshing these dates. Check Whatnot for the latest schedule.</p>
            : started && !live && <p className="mt-3 text-sm text-muted-foreground">Check Whatnot for the current show status.</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild><a href={show?.href ?? allShowsUrl} target="_blank" rel="noopener noreferrer">
              {show ? showAction(show, now, schedule.trustLiveStatus) : "Find shows on Whatnot"}<ArrowUpRight aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
            </a></Button>
            {compact ? <Link href="/live-shows" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline">All live shows <ArrowRight aria-hidden="true" className="size-4" /></Link>
              : show?.series === "grimmfest" && <Link href="/grimmunity#grimmfest" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline">Explore Grimmfest <ArrowRight aria-hidden="true" className="size-4" /></Link>}
          </div>
        </div>
        <div className={`relative items-center justify-center bg-[#17131d] p-5 sm:p-6 ${compact ? "hidden md:flex" : "flex"}`}>
          {show?.series === "art" ? <Image src={image.src} alt={image.alt} width={1152} height={1536} sizes={compact ? "260px" : "(min-width: 1024px) 420px, 85vw"} className="aspect-square w-full max-w-[420px] rounded-2xl object-contain" /> : <GrimGroupPhoto sizes={compact ? "260px" : undefined} />}
        </div>
      </div>
    </section>
  );
}

export function ShowSchedule({ initialNow }: { initialNow: string }) {
  const now = useShowClock(initialNow);
  const [visibleCount, setVisibleCount] = useState(8);
  const schedule = useLiveSchedule(now);
  const shows = upcomingShows(now, schedule.shows);
  const featured = featuredShow(now, schedule.shows, schedule.trustLiveStatus);
  // The featured show is already presented in full immediately above this list.
  const remaining = shows.filter((show) => show.id !== featured?.id);
  return <section aria-labelledby="schedule-heading" className="mt-12 sm:mt-16">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Make a little time for something unexpected</p><h2 id="schedule-heading" className="mt-3 text-3xl sm:text-4xl">{featured ? "Coming up after that." : "More time at the live table."}</h2></div>
      <a href={allShowsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline underline-offset-4">Full Whatnot schedule <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a>
    </div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">All times are Mountain Time. These dates update automatically from Whatnot. New shows and schedule changes usually appear within a few minutes.</p>
    {remaining.length ? <ol id="upcoming-show-list" className="mt-6 divide-y divide-border border-y border-border">
      {remaining.slice(0, visibleCount).map((show) => <li key={show.id} className="grid gap-3 py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center">
        <time dateTime={show.startsAt!} className="text-sm"><span className="block font-bold text-primary">{showDate(show.startsAt!)}</span><span className="mt-1 block text-muted-foreground">{showTime(show.startsAt!)}</span></time>
        <div className="min-w-0"><h3 className="break-words text-2xl">{show.title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{show.description}</p></div>
        <a href={show.href} target="_blank" rel="noopener noreferrer" aria-label={`View ${show.title}, ${showDate(show.startsAt!)}, on Whatnot (opens in a new tab)`} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-bold text-primary hover:bg-secondary sm:col-start-2 lg:col-start-auto">View show <ArrowUpRight aria-hidden="true" className="size-4" /></a>
      </li>)}
    </ol> : <p className="mt-6 rounded-2xl border border-border bg-surface p-6 leading-7">{schedule.state === "unavailable" ? "The schedule is temporarily unavailable here. Open our Whatnot profile for the latest shows." : "More dates will appear here as they’re scheduled on Whatnot. Follow us there for new show announcements."}</p>}
    {remaining.length > 8 && <div className="mt-6 flex flex-wrap items-center gap-4">
      <Button type="button" variant="outline" className="min-h-11" aria-controls="upcoming-show-list" disabled={visibleCount >= remaining.length} onClick={() => setVisibleCount(count => count + 8)}>{visibleCount >= remaining.length ? "All dates shown" : "Show more dates"}</Button>
      <p className="text-sm text-muted-foreground" role="status">Showing {Math.min(visibleCount, remaining.length)} of {remaining.length} upcoming dates.</p>
    </div>}
    <p className="mt-4 text-xs leading-5 text-muted-foreground" role="status">{schedule.syncedAt && schedule.state !== "unavailable" ? <>{schedule.state === "stale" ? "Last successful update" : "Updated from Whatnot"}: <time dateTime={schedule.syncedAt}>{showDate(schedule.syncedAt)} at {showTime(schedule.syncedAt)}</time>.{schedule.state === "stale" && " Please confirm dates on Whatnot."}</> : "You can always find our full schedule on Whatnot."}</p>
  </section>;
}

export function GrimmfestShowLink({ initialNow }: { initialNow: string }) {
  const now = useShowClock(initialNow);
  const schedule = useLiveSchedule(now);
  const shows = schedule.shows.filter((show) => show.series === "grimmfest");
  const show = featuredShow(now, shows, schedule.trustLiveStatus);
  const live = show?.status === "live" && schedule.trustLiveStatus;
  return <div className="mt-6 border-t border-white/20 pt-5">
    <p className="text-sm font-semibold text-[#eee1f4]">{show ? <><span className="mb-2 block text-xs uppercase tracking-[.14em] text-[#d6b9eb]">{live ? "Grimmfest is live on Whatnot" : show.startsAt && showDay(show.startsAt) === showDay(now) ? "Today on Whatnot" : "Next Grimmfest"}</span><ShowTime show={show} /></> : schedule.state === "unavailable" ? "Find the latest Grimmfest dates on Whatnot." : "The next Grimmfest date will appear here when it’s scheduled on Whatnot."}</p>
    <a href={show?.href ?? allShowsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 max-w-full items-center gap-2 rounded-full bg-[#f8f0fc] px-6 py-3 text-sm font-bold text-[#4c326d] hover:bg-white">
      {show ? showAction(show, now, schedule.trustLiveStatus) : "Follow Moonafique on Whatnot"}<ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span>
    </a>
    {schedule.state === "stale" ? <p className="mt-3 text-xs leading-5 text-[#d3c8d9]">Dates may have changed. Check Whatnot for the latest schedule.</p> : show?.startsAt && Date.parse(show.startsAt) <= now.getTime() && !live && <p className="mt-3 text-xs leading-5 text-[#d3c8d9]">Scheduled start time. Check Whatnot for the current show status.</p>}
  </div>;
}
