"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const filmSource = "/showcase/grim-of-the-month-film.mp4";

export function GrimShowcaseFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const automaticPause = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;

    const updatePlayback = () => {
      if (!inView || document.hidden || reducedMotion.matches) {
        if (!video.paused) {
          automaticPause.current = true;
          video.pause();
        }
      } else if (!userPaused.current) {
        // Browsers may still require a gesture. Keep the Play control available.
        void video.play().catch(() => {});
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      updatePlayback();
    }, { threshold: [0, 0.25] });

    observer.observe(video);
    reducedMotion.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
      automaticPause.current = true;
      video.pause();
    };
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    userPaused.current = !video.paused;
    if (video.paused) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  return (
    <figure className="mx-auto w-full max-w-xs">
      <video
        ref={videoRef}
        id="grim-showcase-film"
        aria-label="Grimfest: August through October Grim of the Month showcase"
        aria-describedby="grim-film-description"
        controls
        muted
        loop
        playsInline
        preload="metadata"
        poster="/showcase/grim-of-the-month-film-poster.jpg"
        width={720}
        height={1280}
        className="block aspect-[9/16] w-full rounded-2xl border border-white/15 bg-black object-contain"
        onPlay={() => { userPaused.current = false; setPlaying(true); }}
        onPause={() => {
          setPlaying(false);
          if (!automaticPause.current) userPaused.current = true;
          automaticPause.current = false;
        }}
        onError={() => setUnavailable(true)}
      >
        <source src={filmSource} type="video/mp4" />
        <a href={filmSource}>Watch the Grim of the Month film.</a>
      </video>
      <figcaption className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-[#d3c8d9]">Grimfest, in motion.<br />August–October 2026</p>
        <button
          type="button"
          onClick={togglePlayback}
          aria-controls="grim-showcase-film"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/30 px-4 text-sm font-semibold text-[#fbf5ec] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfc8f0]"
        >
          {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
          {playing ? "Pause video" : "Play video"}
        </button>
      </figcaption>
      <p id="grim-film-description" className="sr-only">A close-up tour of our August, September, and October Grims with their matching pets, colorful paintwork, and glowing details. The film invites viewers to Grimfest, live on Whatnot.</p>
      {unavailable && <p className="mt-3 text-sm text-[#fbf5ec]">Having trouble playing the film? <a href={filmSource} className="underline underline-offset-4">Open the video.</a></p>}
    </figure>
  );
}
