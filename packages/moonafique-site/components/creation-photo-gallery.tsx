'use client';

import { useState } from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { Expand, X } from 'lucide-react';
import type { CreationPhoto } from '@/lib/creations-showcase';

const focusStyle = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfc8f0]';

export function CreationPhotoGallery({ title, photos }: { title: string; photos: CreationPhoto[] }) {
  const [selected, setSelected] = useState(0);
  const photo = photos[selected] ?? photos[0];

  if (!photo) return null;

  const choices = photos.length > 1 ? (
    <div role="group" aria-label={`${title} photos`} className="flex flex-wrap gap-3">
      {photos.map((option, index) => (
        <button
          key={option.src}
          type="button"
          onClick={() => setSelected(index)}
          aria-label={`Show ${title}: ${option.label ?? `photo ${index + 1}`}`}
          aria-pressed={photo.src === option.src}
          className={`flex min-h-12 items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-xs text-[#fbf5ec] transition-colors ${focusStyle} ${photo.src === option.src ? 'border-[#d6b9eb] bg-[#d6b9eb]/15' : 'border-white/20 hover:border-white/50 hover:bg-white/5'}`}
        >
          <Image src={option.src} alt="" width={36} height={36} sizes="36px" className="size-9 rounded-md bg-black object-contain" />
          <span>{option.label ?? `Photo ${index + 1}`}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <Dialog.Root>
      <figure>
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label={`Enlarge ${title} photo`}
            className={`group relative block aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-[#050505] ${focusStyle}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 1280px) 546px, (min-width: 768px) 45vw, 90vw"
              className="h-full w-full object-contain"
            />
            <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-white/25 bg-black/80 px-3 py-2 text-xs font-semibold text-white group-hover:bg-black">
              <Expand className="size-3.5" aria-hidden="true" />
              View photo
            </span>
          </button>
        </Dialog.Trigger>
        <figcaption className="mb-3 mt-3 flex items-center justify-between gap-3 text-xs text-[#d3c8d9]" aria-live="polite" aria-atomic="true">
          <span>{photo.label ?? title}</span>
          {photos.length > 1 && <span>{photos.indexOf(photo) + 1} / {photos.length}</span>}
        </figcaption>
        {choices}
      </figure>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/85" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/20 bg-[#1e1826] p-4 text-[#fbf5ec] shadow-2xl sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl leading-tight sm:text-3xl">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[#d3c8d9]" aria-live="polite">{photo.label ?? 'A closer look'}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close photo" className={`flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 hover:bg-white/10 ${focusStyle}`}>
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes="(min-width: 960px) 848px, 90vw"
            className="h-[min(60dvh,600px)] w-full rounded-lg bg-black object-contain"
          />
          {choices && <div className="mt-4">{choices}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
