"use client";
/* eslint-disable @next/next/no-img-element -- remote Purdue images, no optimisation (SPEC §14) */

import { useEffect, useRef } from "react";
import type { Photo } from "@/lib/types";

type Props = {
  photos: Photo[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
};

/** Full-screen photo viewer on a native <dialog>: Esc, focus trap and back-swipe for free. */
export function Lightbox({ photos, index, onIndex, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const open = index !== null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const go = (delta: number) => {
    if (index === null) return;
    onIndex((index + delta + photos.length) % photos.length);
  };

  const photo = index !== null ? photos[index] : undefined;
  const many = photos.length > 1;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start == null || end == null || Math.abs(end - start) < 50) return;
        go(end < start ? 1 : -1);
      }}
      aria-label="Photo viewer"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-navy p-0 text-foam backdrop:bg-navy"
    >
      {photo && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <p className="font-mono text-[1rem] text-foam-muted" aria-live="polite">
              {many ? `Photo ${index! + 1} of ${photos.length}` : "Photo"}
            </p>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="flex min-h-12 items-center gap-2 rounded-full bg-foam/10 px-5 text-[1.05rem] font-semibold text-foam hover:bg-foam/20"
            >
              Close <span aria-hidden="true">✕</span>
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-2">
            <img
              key={photo.src}
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="100vw"
              alt={photo.alt}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {photo.caption && <p className="mx-auto max-w-[720px] text-foam">{photo.caption}</p>}
            {many && (
              <div className="mx-auto mt-3 flex max-w-[720px] gap-3">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="min-h-14 flex-1 rounded-full bg-foam/10 text-[1.05rem] font-semibold hover:bg-foam/20"
                >
                  <span aria-hidden="true">←</span> Previous
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="min-h-14 flex-1 rounded-full bg-foam/10 text-[1.05rem] font-semibold hover:bg-foam/20"
                >
                  Next <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
