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

export function StatusHero({ status, latest, recent = [] }: { status: Status; latest?: Dispatch; recent?: Dispatch[] }) {
  return (
    <section aria-labelledby="status-heading" className="chart-grid relative overflow-hidden text-foam">
      <HeroSky />
      <AtollMark className="pointer-events-none absolute -top-10 -right-14 size-56 text-foam opacity-60 sm:size-72" />
      <div className="relative mx-auto max-w-[720px] px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 sm:px-8 sm:pt-10">
        <div className="pr-28">
          <p className="font-display text-[1.35rem] font-semibold tracking-tight">{site.name}</p>
          <p className="text-[1rem] text-foam-muted">{site.dedication}</p>
        </div>

        <p className="mt-8 font-mono text-[1rem] text-foam-muted">
          <span className="sr-only">Location: </span>Nikumaroro, Kiribati · 4°40′S 174°31′W
        </p>

        <div className="mt-4" id="status-heading">
          <StatusLine status={status} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <VerdictPill verdict={status.verdict} size="lg" />
          {latest && (
            <p className="text-[1rem] text-foam-muted">
              Last update:{" "}
              <RelativeTime
                iso={latest.publishedAt.toISOString()}
                fallback={formatShortDate(latest.publishedAt)}
              />
            </p>
          )}
        </div>

        <SinceLastVisit
          items={recent.map((d) => ({ slug: d.slug, title: shortTitle(d.title), publishedAt: d.publishedAt.toISOString() }))}
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
