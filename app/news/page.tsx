import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { NewsDisclaimer } from "@/components/news/NewsDisclaimer";
import { NewsList } from "@/components/news/NewsList";
import { VideoList } from "@/components/news/VideoList";
import { SectionHeading } from "@/components/SectionHeading";
import { TopBar } from "@/components/TopBar";
import { getNews, getVideos } from "@/lib/news";

export const metadata: Metadata = { title: "News and videos" };

export default async function NewsPage() {
  const [news, videos] = await Promise.all([getNews(), getVideos()]);
  return (
    <>
      <TopBar label="News" />
      <main className="mx-auto max-w-[720px] px-5 pt-8 pb-16 sm:px-8">
        <SectionHeading kicker="From around the web" title="News and videos" />
        <p className="mb-6 text-ink-muted">
          Collected every half hour from Google News and Purdue&apos;s YouTube channel. Newest first.
        </p>
        {videos.length > 0 && (
          <section aria-labelledby="videos-heading" className="mb-10">
            <h2 id="videos-heading" className="mb-4 text-[1.6rem] font-semibold text-navy">
              Purdue&apos;s expedition videos
            </h2>
            <VideoList items={videos} />
          </section>
        )}
        <section aria-labelledby="stories-heading">
          <h2 id="stories-heading" className="mb-4 text-[1.6rem] font-semibold text-navy">
            News stories
          </h2>
          {news.length > 0 ? (
            <>
              <NewsDisclaimer />
              <NewsList items={news} />
            </>
          ) : (
            <p className="paper rounded-[var(--radius-card)] p-5 ring-1 ring-rule">
              The news feed couldn&apos;t be loaded just now. It will try again shortly.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
