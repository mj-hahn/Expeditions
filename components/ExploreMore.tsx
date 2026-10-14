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
            <span className="mt-1 block">Day by day, from the hangar at Purdue to the lagoon.</span>
            <span className="mt-1 block font-semibold text-teal-ink">{days === 1 ? "1 day" : `${days} days`} so far</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
