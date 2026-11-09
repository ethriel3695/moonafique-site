"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowUpRight, ChevronDown, Sparkles, Palette, Package, Frame } from "lucide-react";
import { teamMembers, projectCategories, teamProjects } from "@/lib/team";

const categoryIcons = [Palette, Package, Frame];

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
      <h2 id="team-title" className="mt-4 font-display text-4xl sm:text-5xl">Many imaginations. One Moonafique.</h2>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">Pick a name and step into their corner of the studio. This is where we’ll share the projects, details, and stories behind their work.</p>
    </div>
    <div className="grid items-start gap-7 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Meet the Moonafique team" className="rounded-2xl border bg-white p-5 lg:sticky lg:top-28">
        <p className="mb-3 text-sm font-bold">Meet the team</p>
        <ul className="flex flex-wrap gap-1 lg:grid">
          {teamMembers.map((person) => <li key={person.slug}><a href={`#team-${person.slug}`} onClick={() => reveal(`#team-${person.slug}`)} className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{person.name}<ArrowUpRight className="size-3.5" aria-hidden="true" /></a></li>)}
        </ul>
      </nav>
      <div className="space-y-4">
        <p className="rounded-2xl bg-secondary/60 px-5 py-4 text-sm leading-6 text-muted-foreground">Our team galleries are taking shape. Project photos and creator stories are coming soon—each space below is a preview of what’s to come.</p>
        {/* Native fragment navigation can open details before React hydrates. Only the open attribute may differ. */}
        {teamMembers.map((person, index) => <details suppressHydrationWarning key={person.slug} id={`team-${person.slug}`} open={index === 0} className="group/person scroll-mt-28 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex min-h-24 cursor-pointer list-none items-center gap-4 px-5 py-5 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary sm:px-7 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-2xl text-primary">{person.name.charAt(0)}</span>
            <span className="min-w-0 flex-1"><span className="block font-display text-3xl">{person.name}</span><span className="mt-1 block text-xs text-muted-foreground">A corner of the Moonafique studio</span></span>
            <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform group-open/person:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="border-t border-border/60 px-5 pb-6 pt-5 sm:px-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold">{person.name}’s project gallery</h3><a href={`#team-${person.slug}`} onClick={() => reveal(`#team-${person.slug}`)} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">Link to {person.name}’s gallery <ArrowUpRight className="size-3" aria-hidden="true" /></a></div>
            <div className="space-y-3">
              {projectCategories.map((category, categoryIndex) => {
                const Icon = categoryIcons[categoryIndex];
                const projects = teamProjects.filter((project) => project.creator === person.slug && project.category === category.slug);
                return <details suppressHydrationWarning id={`team-${person.slug}-${category.slug}`} key={category.slug} className="group/category scroll-mt-28 rounded-xl border border-border/70">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" /><span className="flex-1 text-sm font-semibold">{category.name}</span><span className="text-xs text-muted-foreground">{projects.length ? `${projects.length} project${projects.length === 1 ? "" : "s"}` : "Coming soon"}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open/category:rotate-180" />
                  </summary>
                  <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                    {projects.length ? projects.map((project) => <figure key={project.slug} id={`project-${project.slug}`} className="scroll-mt-28 overflow-hidden rounded-xl border bg-background">
                      <Image {...project.image} alt={project.image.alt} sizes="(min-width: 1024px) 360px, (min-width: 640px) 42vw, 90vw" className="aspect-[4/3] w-full object-contain" />
                      <figcaption className="p-4"><h4 className="font-bold">{project.title}</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p></figcaption>
                    </figure>) : <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-gradient-to-br from-secondary/70 to-background p-6 text-center sm:col-span-2">
                      <Sparkles aria-hidden="true" className="mb-3 size-6 text-primary/70" /><p className="font-display text-xl">A little space for something wonderful.</p><p className="mt-2 text-sm text-muted-foreground">{category.detail}</p><p className="mt-3 text-xs text-muted-foreground">Project photos coming soon</p>
                    </div>}
                  </div>
                </details>;
              })}
            </div>
          </div>
        </details>)}
      </div>
    </div>
  </section>;
}
