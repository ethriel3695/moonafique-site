"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrimGroupPhoto } from "@/components/grimmunity/group-photo";
import { allShowsUrl, featuredShow, liveShows, scheduleCheckedOn, showAction, showDate, showDay, showTime, upcomingShows, type LiveShow } from "@/lib/live-shows";

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
  return <time dateTime={show.startsAt}>{showDate(show.startsAt)} <span aria-hidden="true">·</span> {showTime(show.startsAt)}</time>;
}

export function NextShowCard({ initialNow, compact = false }: { initialNow: string; compact?: boolean }) {
  const now = useShowClock(initialNow);
  const show = featuredShow(now);
  const started = show && Date.parse(show.startsAt) <= now.getTime();
  const image = show?.series === "art"
    ? { src: "/showcase/IMG_0906.jpeg", alt: "An original Moonafique dinosaur ACEO with colorful painted details." }
    : { src: "/showcase/grim-of-the-month-august-september-october.jpg", alt: "Three painted Moonafique Grims with their matching pets." };
  return (
    <section aria-labelledby={compact ? "next-show-heading" : "featured-show-heading"} className="overflow-hidden rounded-[2rem] border border-primary/20 bg-card shadow-soft">
      <div className={compact ? "grid md:grid-cols-[1fr_260px]" : "grid lg:grid-cols-[1.1fr_.9fr]"}>
        <div className="p-6 sm:p-9">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary">
            <CalendarDays className="size-4" aria-hidden="true" />
            {started ? "Scheduled today" : show ? "Next on Whatnot" : "Live with Moonafique"}
          </p>
          <h2 id={compact ? "next-show-heading" : "featured-show-heading"} className="mt-4 text-3xl leading-tight sm:text-4xl">
            {show?.title ?? "There’s more to come."}
          </h2>
          {show && <p className="mt-4 text-sm font-bold text-primary"><ShowTime show={show} /></p>}
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            {show?.description ?? "Find the latest shows on Whatnot and follow Moonafique for the next announcement."}
          </p>
          {started && <p className="mt-3 text-sm text-muted-foreground">Check Whatnot to see whether the show is still live.</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild><a href={show?.href ?? allShowsUrl} target="_blank" rel="noopener noreferrer">
              {show ? showAction(show, now) : "Find shows on Whatnot"}<ArrowUpRight aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
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
  const shows = upcomingShows(now);
  const featured = featuredShow(now);
  // The featured show is already presented in full immediately above this list.
  const remaining = shows.filter((show) => show.id !== featured?.id);
  return <section aria-labelledby="schedule-heading" className="mt-12 sm:mt-16">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Make a little time for something unexpected</p><h2 id="schedule-heading" className="mt-3 text-3xl sm:text-4xl">{featured ? "Coming up after that." : "More time at the live table."}</h2></div>
      <a href={allShowsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline underline-offset-4">Full Whatnot schedule <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a>
    </div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">All times are Mountain Time. This is a selection of our upcoming shows; Whatnot has the latest schedule and any changes.</p>
    {remaining.length ? <ol className="mt-6 divide-y divide-border border-y border-border">
      {remaining.map((show) => <li key={show.id} className="grid gap-3 py-6 sm:grid-cols-[180px_1fr_auto] sm:items-center sm:gap-6">
        <time dateTime={show.startsAt} className="text-sm"><span className="block font-bold text-primary">{showDate(show.startsAt)}</span><span className="mt-1 block text-muted-foreground">{showTime(show.startsAt)}</span></time>
        <div><h3 className="text-2xl">{show.title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{show.description}</p></div>
        <a href={show.href} target="_blank" rel="noopener noreferrer" aria-label={`View ${show.title}, ${showDate(show.startsAt)}, on Whatnot (opens in a new tab)`} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-bold text-primary hover:bg-secondary">View show <ArrowUpRight aria-hidden="true" className="size-4" /></a>
      </li>)}
    </ol> : <p className="mt-6 rounded-2xl border border-border bg-surface p-6 leading-7">We’ll add more dates here as they’re confirmed. Follow us on Whatnot for new show announcements.</p>}
    <p className="mt-4 text-xs text-muted-foreground">Schedule checked <time dateTime={scheduleCheckedOn}>{showDate(`${scheduleCheckedOn}T12:00:00Z`)}</time>.</p>
  </section>;
}

export function GrimmfestShowLink({ initialNow }: { initialNow: string }) {
  const now = useShowClock(initialNow);
  const shows = liveShows.filter((show) => show.series === "grimmfest");
  const show = featuredShow(now, shows);
  return <div className="mt-6 border-t border-white/20 pt-5">
    <p className="text-sm font-semibold text-[#eee1f4]">{show ? <><span className="mb-2 block text-xs uppercase tracking-[.14em] text-[#d6b9eb]">{showDay(show.startsAt) === showDay(now) ? "Today on Whatnot" : "Next Grimmfest"}</span><ShowTime show={show} /></> : "The next Grimmfest date will be announced here."}</p>
    <a href={show?.href ?? allShowsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 max-w-full items-center gap-2 rounded-full bg-[#f8f0fc] px-6 py-3 text-sm font-bold text-[#4c326d] hover:bg-white">
      {show ? showAction(show, now) : "Follow Moonafique on Whatnot"}<ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span>
    </a>
    {show && Date.parse(show.startsAt) <= now.getTime() && <p className="mt-3 text-xs leading-5 text-[#d3c8d9]">Scheduled start time. Check Whatnot for the current show status.</p>}
  </div>;
}
