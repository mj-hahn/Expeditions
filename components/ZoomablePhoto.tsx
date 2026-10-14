"use client";

import { useState } from "react";
import { EnlargeBadge } from "@/components/EnlargeBadge";
import { Img } from "@/components/Img";
import { Lightbox } from "@/components/dispatch/Lightbox";
import type { Photo } from "@/lib/types";

/**
 * A photo that opens full screen when tapped. `more` adds the rest of the dispatch's
 * photos to the viewer so she can keep swiping from there.
 */
export function ZoomablePhoto({
  photo,
  more = [],
  eager,
  sizes,
  className = "",
}: {
  photo: Photo;
  more?: Photo[];
  eager?: boolean;
  sizes?: string;
  className?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const photos = [photo, ...more.filter((p) => p.src !== photo.src)];
  return (
    <>
      <button
        type="button"
        onClick={() => setIndex(0)}
        className={`relative block w-full cursor-zoom-in overflow-hidden bg-sand-2 ${className}`}
        aria-label={`Enlarge photo${photos.length > 1 ? ` (1 of ${photos.length})` : ""}${photo.alt ? `: ${photo.alt}` : ""}`}
      >
        <Img photo={photo} alt="" eager={eager} sizes={sizes} className="h-full w-full object-cover" />
        <EnlargeBadge />
      </button>
      <Lightbox photos={photos} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}
