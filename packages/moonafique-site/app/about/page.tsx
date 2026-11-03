import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
export const metadata = {
  title: "About the studio | Moonafique",
  description:
    "Meet the work behind Moonafique: original miniature art, collectible characters, and creative experiments.",
};
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
            About the studio
          </p>
          <h1 className="mt-5 text-5xl leading-tight sm:text-6xl">
            A good idea rarely
            <br />
            stays on paper here.
          </h1>
          <div className="mt-7 space-y-5 text-lg leading-8 text-muted-foreground">
            <p>
              Moonafique is a family-run creative studio working across
              3D-printed collectibles, hand-painted pieces, and original
              miniature art.
            </p>
            <p>
              Some projects begin with a character. Others start with a color, a
              story, or a question about whether something could actually work.
              That curiosity connects the work, even when the finished pieces
              look very different.
            </p>
            <p>
              Our ACEOs measure just 2.5 by 3.5 inches. Our custom projects
              sometimes need considerably more room. Both get the same attention
              to the details that make a piece worth looking at again.
            </p>
          </div>
          <h2 className="mt-10 text-3xl">Made, checked, and shared by us.</h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            We print, paint, check, and pack the work ourselves. On Whatnot, we
            share the creations, talk through their details, and spend time with
            the people who collect them.
          </p>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            You can explore the finished work here, follow a project as it
            develops, or bring us an idea of your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/#collections">Explore the collections</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/customs">Discuss a custom idea</Link>
            </Button>
          </div>
        </div>
        <figure className="rounded-[2rem] bg-surface p-5">
          <Image
            src="/showcase/devils-favorite-lyre-glow.jpg"
            alt="The Devil’s Favorite Lyre with glowing purple and blue details."
            width={664}
            height={1182}
            className="max-h-[650px] w-full rounded-2xl object-contain"
          />
          <figcaption className="mt-4 text-sm leading-6 text-muted-foreground">
            The Devil’s Favorite Lyre, created by Moonafique for October’s Print
            Wars.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
