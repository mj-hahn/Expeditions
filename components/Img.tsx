"use client";
/* eslint-disable @next/next/no-img-element -- plain <img> with WordPress srcset avoids Vercel image quotas (SPEC §3, §14) */

import { useState } from "react";
import type { Photo } from "@/lib/types";

type Props = {
  photo: Photo;
  sizes?: string;
  className?: string;
  eager?: boolean;
  /** Override alt, e.g. "" when the image is decorative next to its title. */
  alt?: string;
};

/** Remote Purdue image. Hides itself quietly if the image fails to load. */
export function Img({ photo, sizes, className, eager, alt }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={photo.srcSet ? sizes : undefined}
      width={photo.width}
      height={photo.height}
      alt={alt ?? photo.alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
