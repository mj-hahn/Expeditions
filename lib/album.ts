// Photo album helpers: every photo from every dispatch, oldest dispatch first.

import type { Dispatch, Photo } from "@/lib/types";

export type AlbumGroup = { dispatch: Dispatch; photos: Photo[] };

/** Groups oldest dispatch first; photos de-duplicated by src across the whole album. */
export function buildAlbum(dispatches: Dispatch[]): AlbumGroup[] {
  const seen = new Set<string>();
  const groups: AlbumGroup[] = [];
  const oldestFirst = dispatches.slice().sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  for (const d of oldestFirst) {
    const photos: Photo[] = [];
    for (const p of [...(d.hero ? [d.hero] : []), ...d.photos]) {
      if (seen.has(p.src)) continue;
      seen.add(p.src);
      photos.push(p);
    }
    if (photos.length) groups.push({ dispatch: d, photos });
  }
  return groups;
}

export function albumCount(groups: AlbumGroup[]): number {
  return groups.reduce((n, g) => n + g.photos.length, 0);
}
