import { GrimmWorldsCollection } from "./grimm-worlds";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { showcaseFeatures } from "@/lib/showcase";
import { GrimmfestShowLink } from "@/components/live-shows";
import { GrimShowcaseFilm } from "./showcase-film";

export function Grimmfest({ initialNow }: { initialNow: string }) {
  const houses = showcaseFeatures.find((feature) => feature.id === "moonafique-houses")?.images ?? [];
  return <><section id="grimmfest" aria-labelledby="grimmfest-title" className="mt-12 scroll-mt-28 overflow-hidden rounded-[2rem] bg-[#1e1826] text-[#fbf5ec]">
    <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:p-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#d6b9eb]">A gathering in our Grimm world</p>
        <h2 id="grimmfest-title" className="mt-5 text-4xl leading-tight sm:text-6xl">Welcome to<br /><span className="text-[#d6b9eb]">Grimmfest.</span></h2>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[#eee1f4]">Painted characters. Matching companions. Come spend an evening with the Grimms and the people behind them.</p>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[#d3c8d9]">Grimmfest is our live Whatnot gathering. Everyone is welcome; a paid membership isn’t required. Our Whatnot editions and monthly Grimm memberships are separate collections.</p>
        <GrimmfestShowLink initialNow={initialNow} />
        <nav aria-label="Explore Grimmfest" className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
          <a href="#grim-showcase" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">Past Grimm editions <ArrowRight className="size-4" aria-hidden="true" /></a>
          <a href="#grimm-worlds" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">The Grimm Worlds collection <ArrowRight className="size-4" aria-hidden="true" /></a>
          <Link href="/live-shows" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">All live shows <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </nav>
      </div>
      <GrimShowcaseFilm />
    </div>
  </section>
  <GrimmWorldsCollection />
  <section id="moonafique-houses" aria-labelledby="moonafique-houses-title" className="mt-8 scroll-mt-28 rounded-[2rem] bg-[#2b2035] px-6 py-8 text-[#fbf5ec] sm:px-10 lg:px-12">
      <h2 id="moonafique-houses-title" className="text-3xl">The houses of Moonafique.</h2>
      <p className="mt-3 text-sm leading-6 text-[#d3c8d9]">Meet Marrowick, Hollowsmere, Veradell, and Glimmerfell—the four houses of Moonafique.</p>
      <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
        {houses.map((house) => <figure key={house.src} className="text-center">
          <Image src={house.src} alt={house.alt} width={house.width} height={house.height} sizes="(min-width: 768px) 220px, 40vw" className="mx-auto aspect-square w-full max-w-44 rounded-2xl object-contain" />
          <figcaption className="mt-3 font-display text-lg text-[#eee1f4] sm:text-xl">{house.label}</figcaption>
        </figure>)}
      </div>
  </section></>;
}
