"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Img } from "@/components/Img";
import { Lightbox } from "@/components/dispatch/Lightbox";
import type { Photo } from "@/lib/types";

export type AlbumSection = {
  slug: string;
  /** "Day 2 on Nikumaroro" or "Oct 7" */
  when: string;
  title: string;
  photos: Photo[];
};

/** Whole-album grid; one shared lightbox so she can keep going across dispatches. */
export function PhotoAlbum({ sections }: { sections: AlbumSection[] }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const all = useMemo(() => sections.flatMap((s) => s.photos), [sections]);
  const starts = sections.map((_, i) => sections.slice(0, i).reduce((n, x) => n + x.photos.length, 0));

  return (
    <div className="space-y-10">
      {sections.map((s, si) => {
        const start = starts[si];
        return (
          <section key={s.slug} aria-label={`${s.when}: ${s.title}`}>
            <p className="font-mono text-[1rem] font-semibold tracking-wider text-teal-ink uppercase">{s.when}</p>
            <h2 className="mt-1 text-[1.3rem] font-semibold text-navy">
              <Link href={`/dispatch/${s.slug}`} className="inline-block min-h-11 py-1 underline">
                {s.title}
              </Link>
            </h2>
            <p className="text-ink-muted">{s.photos.length === 1 ? "1 photo" : `${s.photos.length} photos`}</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {s.photos.map((p, i) => {
                const n = start + i;
                return (
                  <li key={p.src}>
                    <button
                      type="button"
                      onClick={() => setViewer(n)}
                      aria-label={`Open photo ${n + 1} of ${all.length}${p.alt ? `: ${p.alt}` : ""}`}
                      className="block aspect-square w-full overflow-hidden rounded-xl bg-sand-2 ring-1 ring-rule hover:ring-teal"
                    >
                      <Img photo={p} alt="" sizes="(min-width: 760px) 230px, 50vw" className="h-full w-full object-cover" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <Lightbox photos={all} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
    </div>
  );
}
