import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CreationPhotoGallery } from "@/components/creation-photo-gallery";
import { yuleGrimmPhotos } from "@/lib/project-photos";

export function YuleShowcase() {
  return <section id="yule-grimms" aria-labelledby="yule-grimms-title" className="mt-10 scroll-mt-28 overflow-hidden rounded-[2rem] border border-[#d6b9eb]/20 bg-[#1e1826] p-6 text-[#fbf5ec] sm:p-10 lg:p-12">
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#d6b9eb]">A seasonal gathering</p>
        <h2 id="yule-grimms-title" className="mt-4 text-4xl leading-tight sm:text-5xl">A little evergreen mischief.</h2>
        <p className="mt-5 text-lg leading-8 text-[#eee1f4]">Meet the Yule Grimms: tree-shaped coats, bright boots, and a little personality peeking through the branches.</p>
        <p className="mt-4 leading-7 text-[#d3c8d9]">Forest greens, frosty blue, sleepy smiles, and a cheeky skull face. This gathering brings a festive corner of the Moonafique studio to the Grimmunity.</p>
        <p className="mt-5 text-sm leading-6 text-[#d3c8d9]">A look at our seasonal characters. For current availability, visit us on Whatnot. Monthly membership releases are separate.</p>
        <Link href="/live-shows" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#eee1f4] underline underline-offset-4">Catch us at a live show <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </div>
      <div className="mx-auto w-full max-w-md"><CreationPhotoGallery title="Yule Grimms" photos={yuleGrimmPhotos} /></div>
    </div>
  </section>;
}
