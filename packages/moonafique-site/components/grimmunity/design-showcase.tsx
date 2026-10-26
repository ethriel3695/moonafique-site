import Image from "next/image";
import { Archive, ArrowUpRight, ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrimShowcaseFilm } from "@/components/grimmunity/showcase-film";
import { grimShowcaseEditions, grimShowcaseUpdated, grimWhatnotUrl, type GrimShowcaseEdition } from "@/lib/grimmunity/showcase";

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
      <div className="mb-8 grid items-center gap-8 overflow-hidden rounded-[2rem] bg-[#1e1826] p-6 text-[#fbf5ec] sm:p-8 lg:grid-cols-[1fr_.8fr] lg:gap-12 lg:p-12">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#d6b9eb]">The Grim of the Month showcase</p>
          <h2 id="grim-showcase-title" className="mt-4 text-3xl leading-tight sm:text-4xl lg:text-5xl">A little look into our Grim world.</h2>
          <p className="mt-5 text-lg leading-8 text-[#eee1f4]">Meet our August, September, and October Grim of the Month editions—a look at the custom-painted creations behind Moonafique.</p>
          <p className="mt-5 text-sm leading-7 text-[#d3c8d9]">Grim of the Month releases are sold exclusively on Whatnot. Grimm subscriptions are separate monthly releases: choose a mystery Starter or a subscription-exclusive Keeper.</p>
        </div>
        <GrimShowcaseFilm />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {grimShowcaseEditions.map((edition) => {
          const vaulted = edition.status === "vaulted";
          return (
            <article key={`${edition.year}-${edition.monthNumber}`} aria-labelledby={`grim-${edition.monthNumber}-title`}
              className={`flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border bg-card ${vaulted ? "border-border" : "border-primary/35 shadow-soft"}`}>
              <div className={`relative aspect-[4/5] border-b border-border/60 ${edition.image ? "bg-[#080808]" : vaulted ? "bg-gradient-to-br from-surface to-accent/15" : "bg-gradient-to-br from-accent/45 via-surface to-primary/10"}`}>
                {edition.image ? (
                  <EditionPhoto image={edition.image} />
                ) : (
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 p-5 text-center">
                    <ImageIcon aria-hidden="true" className="mb-3 size-8 text-primary/60" strokeWidth={1.25} />
                    <p className="text-sm font-semibold text-primary">{edition.month} edition photo</p>
                    <p className="mt-1 text-xs text-muted-foreground">Coming soon</p>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Grim of the Month</p>
                  <span className="text-xs text-muted-foreground">{edition.year}</span>
                </div>
                <h3 id={`grim-${edition.monthNumber}-title`} className="mt-2 text-3xl">{edition.month}</h3>
                <div className="mt-4">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${vaulted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                    {vaulted ? <Archive aria-hidden="true" className="size-3.5" /> : <Sparkles aria-hidden="true" className="size-3.5" />}
                    {vaulted ? "Vaulted · sold out" : `${edition.remaining} left on Whatnot`}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {vaulted ? "This Whatnot-exclusive edition sold out and is now vaulted." : "This edition is available exclusively on Whatnot while the remaining copies last."}
                </p>
                {!vaulted && (
                  <Button asChild variant="outline" className="mt-5 w-full rounded-full">
                    <a href={grimWhatnotUrl} target="_blank" rel="noopener noreferrer">Shop on Whatnot <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a>
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">October availability last updated <time dateTime={grimShowcaseUpdated.date}>{grimShowcaseUpdated.label}</time>. Check Whatnot for the latest availability.</p>
    </section>
  );
}
