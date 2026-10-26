import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showcaseFeatures, type ShowcaseFeature } from '@/lib/showcase';

type MadeAtMoonafiqueProps = {
  showDraftPlaceholders?: boolean;
  features?: ShowcaseFeature[];
};

export function MadeAtMoonafique({
  showDraftPlaceholders = false,
  features = showcaseFeatures,
}: MadeAtMoonafiqueProps) {
  const visibleFeatures = features.filter(
    (feature) => (feature.images?.length ?? 0) > 0 || showDraftPlaceholders
  );

  if (visibleFeatures.length === 0) return null;

  const missingImages = visibleFeatures.filter((feature) => !feature.images?.length).length;

  return (
    <section
      id="made-at-moonafique"
      aria-labelledby="made-at-moonafique-title"
      className="scroll-mt-24 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="mb-9 flex flex-col gap-6 border-t border-primary/20 pt-10 sm:mb-11 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-primary">
              Made at Moonafique
            </p>
            <h2 id="made-at-moonafique-title" className="mt-4 text-4xl sm:text-5xl">
              Come a little closer.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Collectibles, original art, and the worlds behind them. Here are a
              few of the things that keep our studio curious.
            </p>
          </div>
          <Button asChild variant="outline" className="w-fit shrink-0">
            <Link href="/about">
              Meet the makers
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {showDraftPlaceholders && missingImages > 0 && (
          <p className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
            <strong className="font-semibold text-primary">Local draft.</strong>{' '}
            Selected images are awaiting transfer to this Mac. These placeholders are for review only.
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {visibleFeatures.map((feature) => (
            <article
              key={feature.id}
              aria-labelledby={`${feature.id}-title`}
              className="flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-soft"
            >
              <figure className="border-b border-border/70">
                <div className={`relative aspect-[4/5] ${feature.images?.length ? 'bg-[#171819]' : 'bg-surface'}`}>
                  {feature.images?.length ? (
                    <div className={`absolute inset-0 grid ${feature.images.length > 1 ? 'grid-cols-2 grid-rows-2 gap-3 p-4' : 'grid-cols-1'}`}>
                      {feature.images.map((image) => (
                        <div key={image.src} className="flex min-h-0 min-w-0 flex-col gap-2">
                          <div className="relative min-h-0 flex-1">
                            <Image
                              src={image.src}
                              alt={image.alt}
                              width={image.width}
                              height={image.height}
                              sizes={(feature.images?.length ?? 0) > 1
                                ? '(min-width: 1280px) 185px, (min-width: 1024px) 15vw, 44vw'
                                : undefined}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          {image.label && (
                            <p className="text-center text-xs font-medium leading-5 text-white/90">
                              {image.label}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="absolute inset-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 px-6 text-center">
                      <ImagePlus className="mb-4 size-7 text-primary/70" aria-hidden="true" />
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                        Image transfer pending
                      </p>
                      <p className="mt-2 max-w-[15rem] text-sm leading-6 text-muted-foreground">
                        {feature.missingImage}
                      </p>
                    </div>
                  )}
                </div>
                {feature.imageCaption && (
                  <figcaption className="border-t border-border/60 bg-surface/70 px-6 py-3 text-xs leading-5 text-muted-foreground">
                    {feature.imageCaption}
                  </figcaption>
                )}
              </figure>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <p className="text-xs font-bold uppercase leading-5 tracking-[0.16em] text-primary">
                  {feature.category}
                </p>
                <h3 id={`${feature.id}-title`} className="mt-3 text-[1.75rem] leading-tight">
                  {feature.title}
                </h3>
                <p className="mb-7 mt-4 text-base leading-7 text-muted-foreground">
                  {feature.description}
                </p>
                <p className="mt-auto border-t border-border/70 pt-4 text-sm leading-6 text-muted-foreground">
                  {feature.detail}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
