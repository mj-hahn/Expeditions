"use client";

import { useState } from "react";
import { Img } from "@/components/Img";
import { Lightbox } from "@/components/dispatch/Lightbox";
import type { Photo } from "@/lib/types";

/** A single captioned photo that opens full screen when tapped. */
export function ZoomFigure({ photo, eager }: { photo: Photo; eager?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <figure className="my-8">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-5 block w-[calc(100%+2.5rem)] cursor-zoom-in overflow-hidden bg-sand-2 sm:mx-0 sm:w-full sm:rounded-[var(--radius-card)]"
        aria-label={`Enlarge photo${photo.alt ? `: ${photo.alt}` : ""}`}
      >
        <Img photo={photo} alt="" eager={eager} sizes="(min-width: 760px) 720px, 100vw" className="w-full" />
      </button>
      {photo.caption && <figcaption className="mt-3 text-ink-muted">{photo.caption}</figcaption>}
      <Lightbox photos={[photo]} index={open ? 0 : null} onIndex={() => {}} onClose={() => setOpen(false)} />
    </figure>
  );
}
