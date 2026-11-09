"use client";

import Link from "next/link";
import { CreationPhotoGallery } from "@/components/creation-photo-gallery";
import { ProjectCredits } from "@/components/project-credits";
import { useEffect, useRef } from "react";
import { ArrowUpRight, ChevronDown, Sparkles } from "lucide-react";
import { teamMembers, teamProjects } from "@/lib/team";


export function TeamSpotlight() {
  const root = useRef<HTMLElement>(null);
  function reveal(hash: string) {
    const target = root.current?.querySelector<HTMLElement>(`[id="${hash.replace(/^#/, "").replace(/[^a-z0-9-]/g, "")}"]`);
    if (!target) return;
    let parent: HTMLElement | null = target;
    while (parent && parent !== root.current) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
      (target.querySelector<HTMLElement>(":scope > summary") ?? target).focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    const onHash = () => reveal(window.location.hash);
    if (window.location.hash) onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return <section ref={root} id="team" aria-labelledby="team-title" className="scroll-mt-28 py-14 sm:py-20">
    <div className="mb-8 max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">The people behind the pieces</p>
      <h2 id="team-title" tabIndex={-1} className="mt-4 font-display text-4xl sm:text-5xl">Many imaginations. One Moonafique.</h2>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">Pick a name and step into their corner of the studio. Explore their projects, the details they created, and the collaborations that brought a piece together.</p>
    </div>
    <div className="grid items-start gap-7 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Meet the Moonafique team" className="rounded-2xl border bg-white p-5 lg:sticky lg:top-28">
        <p className="mb-3 text-sm font-bold">Meet the team</p>
        <ul className="flex flex-wrap gap-1 lg:grid">
          {teamMembers.map((person) => <li key={person.slug}><a href={`#team-${person.slug}`} onClick={() => reveal(`#team-${person.slug}`)} className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{person.name}<ArrowUpRight className="size-3.5" aria-hidden="true" /></a></li>)}
        </ul>
      </nav>
      <div className="space-y-4">
        <p className="rounded-2xl bg-secondary/60 px-5 py-4 text-sm leading-6 text-muted-foreground">Every maker brings something different. Each portfolio follows their own work, and shared projects credit the people who created them together.</p>
        {/* Native fragment navigation can open details before React hydrates. Only the open attribute may differ. */}
        {teamMembers.map((person, index) => <details suppressHydrationWarning key={person.slug} id={`team-${person.slug}`} open={index === 0} className="group/person scroll-mt-28 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex min-h-24 cursor-pointer list-none items-center gap-4 px-5 py-5 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary sm:px-7 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-2xl text-primary">{person.name.charAt(0)}</span>
            <span className="min-w-0 flex-1"><span className="block font-display text-3xl">{person.name}</span><span className="mt-1 block text-xs text-muted-foreground">A corner of the Moonafique studio</span></span>
            <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform group-open/person:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="border-t border-border/60 px-5 pb-6 pt-5 sm:px-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold">{person.name}’s project gallery</h3><a href={`#team-${person.slug}`} onClick={() => reveal(`#team-${person.slug}`)} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">Link to {person.name}’s gallery <ArrowUpRight className="size-3" aria-hidden="true" /></a></div>
            <div className="space-y-4">
              {teamProjects.filter((project) => project.creators.some((credit) => credit.slug === person.slug)).map((project) => <details suppressHydrationWarning key={project.slug} id={`project-${person.slug}-${project.slug}`} open className="group/project scroll-mt-28 overflow-hidden rounded-2xl border border-primary/20">
                <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 bg-secondary/40 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1"><span className="block font-display text-2xl">{project.title}</span><span className="mt-1 block text-xs text-muted-foreground">{project.creators.find((credit) => credit.slug === person.slug)?.role} · {project.occasion}</span></span>
                  <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-primary group-open/project:rotate-180" />
                </summary>
                <div className="grid items-start gap-6 bg-[#1e1826] p-4 text-[#fbf5ec] sm:p-5 xl:grid-cols-[1.15fr_.85fr]">
                  <CreationPhotoGallery title={project.title} photos={project.photos} />
                  <div><p className="text-sm leading-7 text-[#eee1f4]">{project.description}</p>
                  <div className="mt-4 border-t border-white/15 pt-3"><ProjectCredits project={project} /></div>
                  {project.collectionHref && <Link href={project.collectionHref} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#eee1f4] underline underline-offset-4">{project.collectionLabel ?? "Explore the collection"} <ArrowUpRight aria-hidden="true" className="size-4" /></Link>}</div>
                </div>
              </details>)}
              {!teamProjects.some((project) => project.creators.some((credit) => credit.slug === person.slug)) && <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-gradient-to-br from-secondary/70 to-background p-6 text-center">
                <Sparkles aria-hidden="true" className="mb-3 size-6 text-primary/70" /><p className="font-display text-xl">More from {person.name}, coming soon.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">A space for their creations and the stories behind them.</p>
              </div>}
              <a href="#team-title" onClick={() => reveal("#team-title")} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">Back to all team members</a>
            </div>
          </div>
        </details>)}
      </div>
    </div>
  </section>;
}
