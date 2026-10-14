import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { NewsDisclaimer } from "@/components/news/NewsDisclaimer";
import { NewsList } from "@/components/news/NewsList";
import { VideoList } from "@/components/news/VideoList";
import type { NewsItem, VideoItem } from "@/lib/news";

/** Home-page teaser: the newest headlines and videos, with a link to everything. */
export function NewsSection({ news, videos }: { news: NewsItem[]; videos: VideoItem[] }) {
  if (news.length === 0 && videos.length === 0) return null;
  return (
    <section aria-labelledby="web-heading" className="mx-auto max-w-[720px] px-5 pt-12 sm:px-8">
      <SectionHeading kicker="From around the web" title="What the news is saying" id="web-heading" />
      {news.length > 0 && (
        <>
          <NewsDisclaimer />
          <NewsList items={news.slice(0, 5)} />
        </>
      )}
      {videos.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-[1.4rem] font-semibold text-navy">Purdue&apos;s expedition videos</h3>
          <VideoList items={videos.slice(0, 2)} />
        </div>
      )}
      <Link
        href="/news"
        prefetch
        className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-navy px-6 text-[1.1rem] font-semibold text-foam"
      >
        All {news.length} stories and {videos.length} videos <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
