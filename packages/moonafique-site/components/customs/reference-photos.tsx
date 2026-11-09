"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { prepareClientPhoto } from "@/lib/customs/prepare-client-photo";
import { MAX_REFERENCE_PHOTOS } from "@/lib/customs/photo-limits";

function PhotoPreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    if (image.current) image.current.src = next;
    return () => URL.revokeObjectURL(next);
  }, [file]);
  // Local object URL; never sent to an image proxy or public storage.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} alt={`Reference photo: ${file.name}`} className="aspect-[4/3] w-full rounded-lg bg-secondary/40 object-contain" />;
}

export function ReferencePhotos({ files, onChange, busy, onBusyChange, disabled }: {
  files: File[]; onChange: (files: File[]) => void; busy: boolean; onBusyChange: (busy: boolean) => void; disabled: boolean;
}) {
  const [error, setError] = useState("");
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setError("");
    if (selected.length + files.length > MAX_REFERENCE_PHOTOS) { setError("You can add up to three photos. Remove one before adding another."); return; }
    onBusyChange(true);
    try {
      const prepared: File[] = [];
      // Process one at a time to keep memory use modest on phones.
      for (const file of selected) prepared.push(await prepareClientPhoto(file));
      onChange([...files, ...prepared]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t prepare these photos. Please try again."); }
    finally { onBusyChange(false); }
  }
  return <fieldset disabled={disabled || busy} className="space-y-4 border-t border-[#4c326d]/10 pt-7">
    <legend className="float-left mb-4 w-full font-display text-2xl">Show us your inspiration</legend>
    <p id="photo-help" className="clear-both text-sm leading-6 text-[#665b70]">Add up to three reference photos (optional). JPG, PNG, or WebP, up to 10 MB each. We’ll resize them for you. For iPhone HEIC photos, export a JPG first.</p>
    <label className="block rounded-2xl border border-dashed border-primary/30 bg-secondary/30 p-5 text-sm font-semibold">
      <span className="mb-3 flex items-center gap-2"><ImagePlus aria-hidden="true" className="size-5 text-primary" />Choose reference photos</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={select} disabled={disabled || busy || files.length >= MAX_REFERENCE_PHOTOS} aria-describedby="photo-help photo-privacy" className="block w-full min-w-0 text-sm font-normal file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-3 file:font-semibold file:text-primary hover:file:bg-secondary disabled:opacity-60" />
    </label>
    <p role="status" className="text-xs text-[#665b70]">{busy ? "Preparing your photos…" : `${files.length} of ${MAX_REFERENCE_PHOTOS} photos selected`}</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {!!files.length && <ul className="grid gap-3 sm:grid-cols-3">
      {files.map((file, index) => <li key={`${index}-${file.name}-${file.lastModified}`} className="min-w-0 rounded-xl border bg-white p-2">
        <PhotoPreview file={file} /><p className="mt-2 truncate px-1 text-xs" title={file.name}>{file.name}</p>
        <button type="button" onClick={() => { onChange(files.filter((_, i) => i !== index)); setError(""); }} aria-label={`Remove reference photo ${index + 1}: ${file.name}`} className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><X className="size-4" aria-hidden="true" />Remove</button>
      </li>)}
    </ul>}
    <p id="photo-privacy" className="text-xs leading-5 text-[#665b70]">Your photos stay private with your request for Moonafique staff to review. They won’t appear in our public galleries. Please share only images you have permission to use.</p>
  </fieldset>;
}
