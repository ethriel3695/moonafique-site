import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { TeamSpotlight } from "@/components/about/team-spotlight";

export const metadata = {
  title: "Meet the Moonafique team",
  description: "Meet Jess, Reuben, Megan, Keyara, Eliza, Ethan, Sophia, Alex, and Ruby—the people behind Moonafique. Explore our growing project galleries.",
};
export default function AboutPage() {
  return <div className="mx-auto max-w-screen-xl px-5 py-12 sm:px-8 sm:py-16">
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Meet the Moonafique team</p>
        <h1 className="mt-5 text-4xl leading-tight sm:text-6xl">A little imagination.<br />A whole lot of us.</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">Moonafique is a family-run creative studio working across 3D-printed collectibles, hand-painted pieces, and original miniature art.</p>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">Some projects begin with a character. Others start with a color, a story, or a “what if?” Meet the people who help bring those ideas to life.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild><a href="#team">Meet the team</a></Button>
          <Button asChild variant="outline"><Link href="/customs">Discuss a custom idea</Link></Button>
        </div>
      </div>
      <figure className="rounded-[2rem] bg-surface p-5">
        <Image src="/showcase/devils-favorite-lyre-glow.jpg" alt="The Devil’s Favorite Lyre with glowing purple and blue details." width={664} height={1182} loading="eager" sizes="(min-width: 1024px) 500px, 90vw" className="max-h-72 w-full rounded-2xl object-contain sm:max-h-[420px]" />
        <figcaption className="mt-4 text-sm leading-6 text-muted-foreground">The Devil’s Favorite Lyre, created by Moonafique for October’s Print Wars.</figcaption>
      </figure>
    </div>
    <TeamSpotlight />
    <section className="rounded-3xl bg-secondary/50 p-7 sm:p-10" aria-labelledby="studio-work-title">
      <h2 id="studio-work-title" className="font-display text-3xl">Made, checked, and shared by us.</h2>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">We print, paint, check, and pack the work ourselves. From 2.5-by-3.5-inch ACEOs to custom creations that need considerably more room, we love the details that make a piece worth looking at again.</p>
      <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/creations">Explore our creations</Link></Button><Button asChild variant="outline"><Link href="/live-shows">Join a live show</Link></Button></div>
    </section>
  </div>;
}
