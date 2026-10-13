"use client";

import { useRef, useState } from "react";
import { Img } from "@/components/Img";
import { Lightbox } from "@/components/dispatch/Lightbox";
import type { Photo } from "@/lib/types";

/** Swipeable carousel with visible previous/next buttons and tap-to-enlarge (SPEC §7.2). */
export function Gallery({ photos }: { photos: Photo[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

  const scrollTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
    setActive(next);
  };

  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  const current = photos[active];

  return (
    <figure className="my-8" aria-roledescription="carousel" aria-label={`Photo gallery, ${photos.length} photos`}>
      <div className="relative -mx-5 sm:mx-0">
        <div
          ref={track}
          onScroll={onScroll}
          className="snap-track flex overflow-x-auto bg-navy sm:rounded-[var(--radius-card)]"
        >
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setViewer(i)}
              className="relative aspect-[4/3] w-full shrink-0 cursor-zoom-in"
              aria-label={`Enlarge photo ${i + 1} of ${photos.length}${p.alt ? `: ${p.alt}` : ""}`}
            >
              <Img photo={p} alt="" sizes="(min-width: 760px) 720px, 100vw" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-navy/80 px-3 py-1 font-mono text-[1rem] text-foam">
          {active + 1} / {photos.length}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => scrollTo(active - 1)}
          disabled={active === 0}
          aria-label="Previous photo"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy text-[1.3rem] text-foam disabled:opacity-35"
        >
          ←
        </button>
        <div className="flex flex-1 justify-center gap-1.5" aria-hidden="true">
          {photos.map((p, i) => (
            <span key={p.src} className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-signal" : "w-2 bg-rule"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollTo(active + 1)}
          disabled={active === photos.length - 1}
          aria-label="Next photo"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy text-[1.3rem] text-foam disabled:opacity-35"
        >
          →
        </button>
      </div>

      {current?.caption && (
        <figcaption className="mt-3 text-ink-muted" aria-live="polite">
          {current.caption}
        </figcaption>
      )}
      <p className="mt-1 text-[1rem] text-ink-muted">Swipe, or tap a photo to enlarge it.</p>

      <Lightbox photos={photos} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
    </figure>
  );
}
