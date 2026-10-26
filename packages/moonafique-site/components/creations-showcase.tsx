import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Camera, Sparkles } from 'lucide-react';
import { CreationPhotoGallery } from '@/components/creation-photo-gallery';
import {
  customCarpCreation,
  printWarsCreations,
  type PrintWarsCreation,
} from '@/lib/creations-showcase';

const themeClasses = {
  glow: 'bg-[radial-gradient(ellipse_at_30%_20%,_#28554c_0%,_#142c2b_45%,_#101b20_100%)] text-[#b9ebdc]',
  gold: 'bg-[radial-gradient(ellipse_at_70%_20%,_#75522f_0%,_#3e2d22_45%,_#211c20_100%)] text-[#f4d4a4]',
  violet: 'bg-[radial-gradient(ellipse_at_50%_20%,_#503958_0%,_#2b2033_45%,_#17131d_100%)] text-[#dfc8f0]',
};

function PhotoPlaceholder({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className="absolute inset-5 flex flex-col items-center justify-center rounded-[1rem] border border-white/20 p-5 text-center">
      <span aria-hidden="true" className={compact ? 'mb-4' : 'mb-5 flex size-16 items-center justify-center rounded-full border border-white/25 bg-white/5'}>
        <Camera className="size-6" strokeWidth={1.25} />
      </span>
      <p className="max-w-48 font-display text-2xl leading-snug">
        {label}
      </p>
      <p className="mt-4 text-xs">Photo coming soon</p>
    </div>
  );
}

export function CreationsShowcase({
  creations = printWarsCreations,
}: {
  creations?: PrintWarsCreation[];
}) {
  return (
    <section
      id="showcase"
      aria-labelledby="creations-title"
      className="scroll-mt-24 px-4 pb-6 pt-10 sm:px-6 sm:pt-14 lg:px-8"
    >
      <div className="mx-auto max-w-screen-xl overflow-hidden rounded-[2rem] bg-[#1e1826] text-[#fbf5ec] shadow-lift sm:rounded-[2.5rem]">
        <div className="px-6 pb-8 pt-9 sm:px-9 sm:pb-10 sm:pt-12 lg:px-12 lg:pt-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-[#d6b9eb]">
                <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                The Moonafique showcase
              </p>
              <h2 id="creations-title" className="mt-5 text-4xl leading-[1.15] sm:text-5xl lg:text-6xl">
                Imagination, made real.
              </h2>
            </div>
            <p className="max-w-sm text-base leading-7 text-[#d3c8d9]">
              Glowing battle bots, tiny worlds, and characters with personality.
              Take a closer look at a few of our favorite creations.
            </p>
          </div>

          <div className="mb-6 mt-9 flex items-center justify-between gap-4 border-t border-white/15 pt-5 sm:mt-11">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eee1f4]">From our Print Wars table</p>
            <p className="text-xs text-[#c4b6cd]">2026</p>
          </div>

          <div className="grid gap-x-7 gap-y-10 md:grid-cols-2 lg:gap-x-9 lg:gap-y-12">
            {creations.map((creation) => (
              <article key={creation.id} aria-labelledby={`${creation.id}-showcase-title`} className="min-w-0">
                {creation.photos?.length ? (
                  <CreationPhotoGallery title={creation.title} photos={creation.photos} />
                ) : (
                  <div className={`relative aspect-[4/5] overflow-hidden rounded-[1.5rem] md:aspect-[4/3] ${themeClasses[creation.theme]}`}>
                    <PhotoPlaceholder label={creation.title} />
                  </div>
                )}
                <div className="pb-1 pt-5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#d6b9eb]">
                    {creation.month} <span className="px-1" aria-hidden="true">/</span> Print Wars
                  </p>
                  <h3 id={`${creation.id}-showcase-title`} className="mt-3 text-[1.65rem] leading-tight lg:text-3xl">
                    {creation.title}
                  </h3>
                  {creation.note && <p className="mt-3 w-fit rounded-full border border-[#d6b9eb]/30 bg-[#d6b9eb]/10 px-3 py-1.5 text-xs leading-5 text-[#e4cfee]">{creation.note}</p>}
                  <p className="mt-3 text-sm leading-6 text-[#d3c8d9]">{creation.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <article aria-labelledby="custom-carp-title" className="grid bg-[#eee9e0] text-[#2e2826] md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-72 overflow-hidden bg-[radial-gradient(ellipse_at_30%_30%,_#32564e_0%,_#1d3834_55%,_#192c2a_100%)] text-[#cbe3d6] md:min-h-96">
            {customCarpCreation.photo ? (
              <Image
                src={customCarpCreation.photo.src}
                alt={customCarpCreation.photo.alt}
                width={customCarpCreation.photo.width}
                height={customCarpCreation.photo.height}
                sizes="(min-width: 1280px) 576px, (min-width: 768px) 45vw, 100vw"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <PhotoPlaceholder label="The custom carp replica" compact />
            )}
          </div>
          <div className="flex flex-col justify-center px-6 py-8 sm:p-9 lg:px-12 lg:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#526457]">Custom creations</p>
            <h3 id="custom-carp-title" className="mt-3 text-3xl leading-tight sm:text-4xl">{customCarpCreation.title}</h3>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#534b45]">{customCarpCreation.description}</p>
            <dl className="mt-6 flex gap-8 border-y border-[#2e2826]/15 py-4 sm:gap-12">
              <div>
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#526457]">Length</dt>
                <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl">38 <span className="text-base">inches</span></dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#526457]">Girth</dt>
                <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl">30 <span className="text-base">inches</span></dd>
              </div>
            </dl>
            <Link
              href="/customs"
              className="mt-6 inline-flex min-h-11 w-fit items-center gap-3 rounded-sm text-sm font-bold text-[#4c326d] underline decoration-[#4c326d]/35 underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4c326d]"
            >
              Have an idea? Let’s talk.
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
