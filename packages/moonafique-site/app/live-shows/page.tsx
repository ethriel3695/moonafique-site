import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { NextShowCard, ShowSchedule } from "@/components/live-shows";
import { GrimGroupPhoto } from "@/components/grimmunity/group-photo";
import { getLiveSchedule } from "@/lib/live-shows-server";
import { LiveShowsProvider } from "@/components/live-shows-provider";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Live Shows | Moonafique",
  description: "Find Moonafique’s next Whatnot show, explore Grimmfest, and revisit our Print Wars creations. Collectible characters, original art, and conversation.",
  alternates: { canonical: "/live-shows" },
};

export default async function LiveShowsPage() {
  const schedule = await getLiveSchedule();
  const initialNow = new Date().toISOString();
  return <LiveShowsProvider initialSchedule={schedule}><div className="mx-auto max-w-screen-xl px-5 py-10 sm:px-8 sm:py-16">
    <header className="mb-9 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Moonafique, live on Whatnot</p>
      <h1 className="mt-5 text-4xl leading-[1.08] sm:text-6xl">Pull up a chair.<br /><span className="text-primary">See what’s on the table.</span></h1>
      <p className="mt-5 max-w-2xl leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">Meet the characters, look closer at the artwork, and spend some time with the people who make it. Join us for the pieces and the conversation.</p>
    </header>
    <NextShowCard initialNow={initialNow} />
    <ShowSchedule initialNow={initialNow} />
    <section className="mt-16 grid overflow-hidden rounded-[2rem] bg-[#2b2035] text-[#f8f0fc] md:grid-cols-2" aria-labelledby="grimmfest-preview-title">
      <div className="flex items-center bg-[#17131d] p-6"><GrimGroupPhoto /></div>
      <div className="p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d6b9eb]">Step into Grimmunity</p><h2 id="grimmfest-preview-title" className="mt-4 text-4xl">This is Grimmfest.</h2><p className="mt-5 leading-7 text-[#e3d6ec]">Our Grimm world comes to the live table. Meet the painted characters and take a look at the editions that started it all.</p><p className="mt-4 text-sm leading-6 text-[#e3d6ec]">Everyone is welcome to watch. You don’t need a Grimm membership.</p><Link href="/grimmunity#grimmfest" className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4">Explore Grimmfest <ArrowRight aria-hidden="true" className="size-4" /></Link></div>
    </section>
    <section aria-labelledby="print-wars-title" className="mt-16 grid gap-8 border-y border-border py-10 md:grid-cols-[1.1fr_1fr] md:items-center">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Our table at 3DA’s Print Wars</p><h2 id="print-wars-title" className="mt-4 text-4xl">A theme. An idea.<br />Something worth a closer look.</h2><p className="mt-5 leading-7 text-muted-foreground">Print Wars gives us a creative challenge and a reason to try something unexpected. Explore our finished pieces and the details behind each one.</p><p className="mt-5 rounded-2xl border border-primary/20 bg-accent/15 p-5 text-sm leading-6"><strong className="block text-primary">September 2026 · Most Creative Interpretation</strong>Our Lion King diorama received this Printy Award in 3DA’s Battle at the Box Office.</p><div className="mt-5 flex flex-wrap gap-x-6 gap-y-2"><Link href="/creations#showcase" className="inline-flex min-h-11 items-center gap-2 font-bold text-primary underline underline-offset-4">Our Print Wars creations <ArrowRight aria-hidden="true" className="size-4" /></Link><a href="https://3d-addicts.com/print-wars/hall-of-fame/#september-2026" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline underline-offset-4">See September’s Hall of Fame <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a></div></div>
      <figure><Image src="/showcase/lion-king-diorama.jpg" alt="Moonafique’s Lion King diorama: lions and cubs among colorful trees, rocks, and scenery." width={1024} height={768} sizes="(min-width: 768px) 50vw, 100vw" className="w-full rounded-2xl" /><figcaption className="mt-3 text-sm text-muted-foreground">The Lion King Diorama · September 2026 Print Wars</figcaption></figure>
    </section>
    <section aria-labelledby="first-show-title" className="mt-12 max-w-3xl"><h2 id="first-show-title" className="text-3xl">First time joining us?</h2><p className="mt-4 leading-7 text-muted-foreground">Open a show on Whatnot to see its details and bookmark it. When it’s time, return to the same show link. You’re welcome to ask about the pieces, join the conversation, or simply look around.</p><Link href="/#newsletter" className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-primary underline underline-offset-4">Get show and studio updates <ArrowRight aria-hidden="true" className="size-4" /></Link></section>
  </div></LiveShowsProvider>;
}
