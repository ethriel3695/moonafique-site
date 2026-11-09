import Link from "next/link";
import { CreationPhotoGallery } from "@/components/creation-photo-gallery";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { grimShowcaseEditions, type GrimShowcaseEdition } from "@/lib/grimmunity/showcase";
import { EditionAvailability, InventoryRefreshNote } from "./showcase-inventory";

function EditionPhoto({ image }: { image: NonNullable<GrimShowcaseEdition["image"]> }) {
  const { crop } = image;

  if (!crop) {
    return <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1280px) 384px, (min-width: 768px) 31vw, 100vw" className="object-contain p-4" />;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="relative h-full max-w-full overflow-hidden" style={{ aspectRatio: `${crop.width} / ${crop.height}` }}>
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(min-width: 768px) 480px, 100vw"
          className="absolute max-w-none"
          style={{
            width: `${image.width / crop.width * 100}%`,
            height: "auto",
            left: `${-crop.x / crop.width * 100}%`,
            top: `${-crop.y / crop.height * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

export function GrimDesignShowcase() {
  return (
    <section id="grim-showcase" aria-labelledby="grim-showcase-title" className="mt-16 scroll-mt-24 border-t border-border pt-10 sm:mt-20 sm:pt-12">
      <div className="mb-8 overflow-hidden rounded-[2rem] bg-[#1e1826] p-6 text-[#fbf5ec] sm:p-8 lg:p-10">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#d6b9eb]">The Grim of the Month showcase</p>
          <h2 id="grim-showcase-title" className="mt-4 text-3xl leading-tight sm:text-4xl lg:text-5xl">A little look into our Grim world.</h2>
          <p className="mt-5 text-lg leading-8 text-[#eee1f4]">Meet our Grimm of the Month editions, from November’s autumn colors to the favorites tucked away in our vault.</p>
          <p className="mt-5 text-sm leading-7 text-[#d3c8d9]">Grim of the Month releases are sold exclusively on Whatnot. Grimm subscriptions are separate monthly releases: start with The Grimm Path or collect a subscription-exclusive Grimmoire Collection character.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {grimShowcaseEditions.map((edition) => {
          const vaulted = edition.status === "vaulted";
          return (
            <article id={`grimm-of-the-month-${edition.year}-${edition.monthNumber}`} key={`${edition.year}-${edition.monthNumber}`} aria-labelledby={`grim-${edition.monthNumber}-title`}
              className={`scroll-mt-28 flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border bg-card ${vaulted ? "border-border" : "border-primary/35 shadow-soft"}`}>
              {edition.photos ? <div className="border-b border-border/60 bg-[#1e1826] p-3"><CreationPhotoGallery title={`${edition.month} Grimm of the Month`} photos={edition.photos} /></div> : <div className={`relative aspect-[4/5] border-b border-border/60 ${edition.image ? "bg-[#080808]" : vaulted ? "bg-gradient-to-br from-surface to-accent/15" : "bg-gradient-to-br from-accent/45 via-surface to-primary/10"}`}>
                {edition.image ? (
                  <EditionPhoto image={edition.image} />
                ) : (
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 p-5 text-center">
                    <ImageIcon aria-hidden="true" className="mb-3 size-8 text-primary/60" strokeWidth={1.25} />
                    <p className="text-sm font-semibold text-primary">{edition.month} edition photo</p>
                    <p className="mt-1 text-xs text-muted-foreground">Coming soon</p>
                  </div>
                )}
              </div>}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Grim of the Month</p>
                  <span className="text-xs text-muted-foreground">{edition.year}</span>
                </div>
                <h3 id={`grim-${edition.monthNumber}-title`} className="mt-2 text-3xl">{edition.month}</h3>
                {edition.designer && <p className="mt-2 text-sm text-muted-foreground">Designed by <Link href={edition.designer.href} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{edition.designer.name}</Link></p>}
                <EditionAvailability edition={`${edition.year}-${edition.monthNumber}`} vaulted={vaulted} />
              </div>
            </article>
          );
        })}
      </div>
      {grimShowcaseEditions.some(edition => edition.status === "current") && <InventoryRefreshNote editions={grimShowcaseEditions.filter(edition => edition.status === "current").map(edition => `${edition.year}-${edition.monthNumber}`)} />}
    </section>
  );
}
