import Link from "next/link";
import { Img } from "@/components/Img";
import { SectionHeading } from "@/components/SectionHeading";
import { albumCount, buildAlbum } from "@/lib/album";
import { buildFullDiary } from "@/lib/diary";
import type { Dispatch, Photo } from "@/lib/types";

const CARD =
  "paper flex min-h-[120px] w-full items-center gap-4 rounded-[var(--radius-card)] p-4 ring-1 ring-rule hover:ring-teal";

/** Hero/first photo of the newest dispatches, topped up from later photos, up to 4. */
function mosaicPhotos(dispatches: Dispatch[]): Photo[] {
  const seen = new Set<string>();
  const out: Photo[] = [];
  const add = (p?: Photo) => {
    if (p && out.length < 4 && !seen.has(p.src)) {
      seen.add(p.src);
      out.push(p);
    }
  };
  const newestFirst = dispatches.slice().sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  for (const d of newestFirst) add(d.hero ?? d.photos[0]);
  for (const d of newestFirst) for (const p of d.photos) add(p);
  return out;
}

export function ExploreMore({ dispatches }: { dispatches: Dispatch[] }) {
  const photos = mosaicPhotos(dispatches);
  const count = albumCount(buildAlbum(dispatches));
  const days = buildFullDiary(dispatches).length;
  return (
    <section aria-labelledby="explore-heading" className="mx-auto max-w-[720px] px-5 pt-12 pb-8 sm:px-8">
      <SectionHeading kicker="Explore" title="Keep exploring" id="explore-heading" />
      <div className="space-y-4">
        <Link href="/photos" className={CARD}>
          {photos.length > 0 && (
            <span className="grid size-24 shrink-0 grid-cols-2 gap-1 overflow-hidden rounded-xl" aria-hidden="true">
              {photos.map((p) => (
                <span key={p.src} className="block overflow-hidden bg-sand-2">
                  <Img photo={p} alt="" sizes="48px" className="h-full w-full object-cover" />
                </span>
              ))}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[1.3rem] font-semibold text-navy">Photo album</span>
            <span className="mt-1 block">Every photo from the expedition, in one place.</span>
            {count > 0 && (
              <span className="mt-1 block font-semibold text-teal-ink">{count === 1 ? "1 photo" : `${count} photos`}</span>
            )}
          </span>
        </Link>
        <Link href="/diary" className={CARD}>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[1.3rem] font-semibold text-navy">Expedition diary</span>
            <span className="mt-1 block">Day by day, from Purdue to the lagoon.</span>
            <span className="mt-1 block font-semibold text-teal-ink">{days === 1 ? "1 day" : `${days} days`} so far</span>
          </span>
        </Link>
        <Link href="/1937" className={CARD}>
          <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-navy" aria-hidden="true">
            <svg viewBox="0 0 48 48" className="size-14" fill="none" stroke="#d9a441" strokeWidth="3" strokeLinecap="round">
              <circle cx="14" cy="34" r="3" fill="#d9a441" />
              <path d="M14 22a12 12 0 0 1 12 12M14 12a22 22 0 0 1 22 22M14 2a32 32 0 0 1 32 32" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[1.3rem] font-semibold text-navy">1937, hour by hour</span>
            <span className="mt-1 block">Earhart&rsquo;s last flight, from takeoff to the final radio call.</span>
          </span>
        </Link>
        <Link href="/island" className={CARD}>
          <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-navy" aria-hidden="true">
            <svg viewBox="0 0 48 48" className="size-14" fill="none" stroke="#d9a441" strokeWidth="3" strokeLinecap="round">
              <ellipse cx="24" cy="24" rx="19" ry="11" />
              <ellipse cx="24" cy="24" rx="8" ry="4" fill="#d9a441" fillOpacity="0.35" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[1.3rem] font-semibold text-navy">The island</span>
            <span className="mt-1 block">Nikumaroro from space, and how it got its names.</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
