import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { PhotoAlbum, type AlbumSection } from "@/components/PhotoAlbum";
import { SectionHeading } from "@/components/SectionHeading";
import { TopBar } from "@/components/TopBar";
import { site } from "@/content/site";
import { albumCount, buildAlbum } from "@/lib/album";
import { getDispatches } from "@/lib/dispatches";
import { shortTitle } from "@/lib/purdue";
import { formatShortDate, islandDate, islandDayNumber } from "@/lib/time";

export const metadata: Metadata = { title: "Photo album" };

export default async function PhotosPage() {
  const dispatches = await getDispatches();
  const groups = buildAlbum(dispatches);
  const total = albumCount(groups);
  const sections: AlbumSection[] = groups.map(({ dispatch: d, photos }) => ({
    slug: d.slug,
    when:
      islandDate(d.publishedAt) >= site.islandDay1
        ? `Day ${islandDayNumber(d.publishedAt)} on Nikumaroro`
        : formatShortDate(d.publishedAt),
    title: shortTitle(d.title),
    photos,
  }));

  return (
    <>
      <TopBar label="Photo album" />
      <main className="mx-auto max-w-[720px] px-5 pt-8 pb-16 sm:px-8">
        <SectionHeading kicker="Photo album" title="The expedition in pictures" />
        {total === 0 ? (
          <div className="paper rounded-[var(--radius-card)] p-6 ring-1 ring-rule">
            <p>
              Photos will appear here as soon as they can be loaded. In the meantime, you can see them on{" "}
              <a href={site.purdueNewsUrl} className="font-semibold text-teal-ink underline">
                Purdue University News
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="text-[1.15rem]">
              Every photo from Purdue&rsquo;s dispatches, oldest first. Tap any photo to see it full screen, then swipe
              or use the buttons to keep going.
            </p>
            <p className="mt-3 font-semibold text-navy">{total === 1 ? "1 photo" : `${total} photos`} in all</p>
            <p className="mt-1 mb-8 text-ink-muted">Photos: Purdue University News, with their captions as published.</p>
            <PhotoAlbum sections={sections} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
