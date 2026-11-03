import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatnotUrl } from "@/lib/site-content";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-screen-xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
          The work of Moonafique
        </p>
        <h1 className="mt-6 max-w-2xl text-[2rem] leading-[1.08] sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]">
          Original art.
          <br />
          Collectible characters.
          <br />
          <span className="text-primary">Unexpected ideas.</span>
        </h1>
        <p className="mt-7 max-w-xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
          We paint, print, and follow an interesting idea to see where it leads.
          Explore miniature artworks, characters with a story, and projects that
          took on a life of their own.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/#collections">
              Explore the collections <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={whatnotUrl} target="_blank" rel="noopener noreferrer">
              Find us on Whatnot <ArrowUpRight aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        </div>
        <p className="mt-7 text-sm text-muted-foreground">
          A family-run creative studio. Always something to look closer at.
        </p>
      </div>
      <div className="grid grid-cols-2 items-start gap-4 sm:gap-5">
        <figure className="overflow-hidden rounded-t-[6rem] rounded-b-2xl bg-[#e8ece5] p-3 pt-7 sm:p-5 sm:pt-9">
          <Image
            src="/showcase/IMG_0906.jpeg"
            alt="An original ACEO painting of a long-necked dinosaur with purple spines and jeweled details."
            width={1152}
            height={1536}
            priority
            sizes="(min-width: 1024px) 260px, 44vw"
            className="aspect-[3/4] w-full rounded-lg object-contain"
          />
          <figcaption className="pb-2 pt-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#334537]">
            Original miniature art
          </figcaption>
        </figure>
        <figure className="mt-12 overflow-hidden rounded-t-2xl rounded-b-[6rem] bg-[#30243e] p-3 pb-7 text-[#f8f0fc] sm:mt-16 sm:p-5 sm:pb-9">
          <Image
            src="/showcase/grim-of-the-month-august-september-october.jpg"
            alt="Three painted Grim of the Month characters, each with its own matching pet."
            width={664}
            height={1182}
            priority
            sizes="(min-width: 1024px) 260px, 44vw"
            className="aspect-[3/4] w-full rounded-lg object-cover object-bottom"
          />
          <figcaption className="pb-2 pt-4 text-center text-xs font-bold uppercase tracking-[0.14em]">
            Collectible characters
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
