import { AtollMark } from "@/components/AtollMark";
import { HeroSky } from "@/components/HeroSky";
import { RelativeTime } from "@/components/RelativeTime";
import { SinceLastVisit } from "@/components/SinceLastVisit";
import { StatusLine } from "@/components/StatusLine";
import { VerdictPill } from "@/components/VerdictPill";
import { site } from "@/content/site";
import { shortTitle } from "@/lib/purdue";
import { formatShortDate } from "@/lib/time";
import type { Dispatch, Status } from "@/lib/types";

export function StatusHero({
  status,
  latest,
  recent = [],
  news = [],
}: {
  status: Status;
  latest?: Dispatch;
  recent?: Dispatch[];
  news?: { publishedAt: string }[];
}) {
  // "Luisa’s Lookout" → "Luisa’s" + gold "Lookout".
  const cut = site.name.lastIndexOf(" ");
  const first = cut > 0 ? site.name.slice(0, cut) : site.name;
  const last = cut > 0 ? site.name.slice(cut + 1) : "";
  return (
    <section aria-labelledby="status-heading" className="chart-grid relative overflow-hidden text-foam">
      <HeroSky />
      <AtollMark className="pointer-events-none absolute top-40 -right-16 size-48 text-foam opacity-30 sm:top-12 sm:-right-10 sm:size-64" />
      <div className="relative mx-auto max-w-[720px] px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 sm:px-8 sm:pt-10">
        <div>
          <p className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-foam sm:text-[3.2rem]">
            {first} <span className="text-amber">{last}</span>
          </p>
          <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-amber" />
          <p className="mt-3 pr-16 text-[1rem] text-foam-muted">{site.dedication}</p>
        </div>

        <p className="mt-8 font-mono text-[1rem] text-foam-muted">
          <span className="sr-only">Location: </span>Nikumaroro, Kiribati · 4°40′S 174°31′W
        </p>

        <div className="mt-4" id="status-heading">
          <StatusLine status={status} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <VerdictPill verdict={status.verdict} size="lg" />
        </div>

        {latest && (
          <div className="mt-5">
            <p className="text-foam">
              Latest dispatch from Purdue:{" "}
              <strong className="font-semibold">
                <RelativeTime iso={latest.publishedAt.toISOString()} fallback={formatShortDate(latest.publishedAt)} />
              </strong>
            </p>
            <p className="text-foam-muted">This page checks for new dispatches every 10 minutes.</p>
          </div>
        )}

        <SinceLastVisit
          items={recent.map((d) => ({ slug: d.slug, title: shortTitle(d.title), publishedAt: d.publishedAt.toISOString() }))}
          news={news.map((n) => ({ publishedAt: n.publishedAt }))}
        />

        {status.note && (
          <p className="mt-4 rounded-[var(--radius-card)] bg-navy-3/60 px-4 py-3 text-foam">
            {status.note}{" "}
            {status.noteUrl && (
              <a href={status.noteUrl} className="font-semibold text-amber underline" target="_blank" rel="noopener noreferrer">
                Read the dispatch
              </a>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
