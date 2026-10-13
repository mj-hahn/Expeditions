import Link from "next/link";
import { Img } from "@/components/Img";
import { NewBadge } from "@/components/NewBadge";
import { SectionHeading } from "@/components/SectionHeading";
import { site } from "@/content/site";
import { formatDispatchTimes } from "@/lib/time";
import type { Dispatch } from "@/lib/types";

export function DispatchTimeline({ dispatches }: { dispatches: Dispatch[] }) {
  return (
    <section aria-labelledby="all-heading" className="mx-auto max-w-[720px] px-5 pt-12 pb-16 sm:px-8">
      <SectionHeading kicker="The logbook" title="All dispatches" id="all-heading" />
      {dispatches.length === 0 ? (
        <div className="paper rounded-[var(--radius-card)] p-6 ring-1 ring-rule">
          <p>
            Dispatches will appear here as soon as they can be loaded. In the meantime, you can read them on{" "}
            <a href={site.purdueNewsUrl} className="font-semibold text-teal-ink underline">
              Purdue University News
            </a>
            .
          </p>
        </div>
      ) : (
        <ol className="relative space-y-5 border-l-2 border-dashed border-rule pl-6 sm:pl-8">
          {dispatches.map((d) => {
            const t = formatDispatchTimes(d.publishedAt);
            const photo = d.hero ?? d.photos[0];
            const isBackground = d.kind === "background";
            return (
              <li key={d.id} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute top-6 -left-[calc(1.5rem+7px)] size-3 rounded-full ring-4 ring-sand sm:-left-[calc(2rem+7px)] ${
                    isBackground ? "bg-rule" : "bg-signal"
                  }`}
                />
                <Link
                  href={`/dispatch/${d.slug}`}
                  className={`group block rounded-[var(--radius-card)] p-4 transition-colors sm:p-5 ${
                    isBackground ? "bg-transparent ring-1 ring-rule hover:bg-paper/60" : "paper ring-1 ring-rule hover:ring-teal"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <time dateTime={d.publishedAt.toISOString()} className="font-mono text-[1rem] font-semibold text-teal-ink">
                      {t.home}
                    </time>
                    {isBackground && (
                      <span className="rounded-full bg-sand-2 px-2.5 py-0.5 text-[1rem] text-ink-muted">Background</span>
                    )}
                    <NewBadge iso={d.publishedAt.toISOString()} />
                  </div>
                  <div className="mt-2 flex gap-4">
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-[1.3rem] font-semibold group-hover:underline ${
                          isBackground ? "text-ink-muted" : "text-navy"
                        }`}
                      >
                        {d.title}
                      </h3>
                    </div>
                    {photo && (
                      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand-2 sm:size-24">
                        <Img photo={photo} alt="" sizes="96px" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                  <p className={`mt-2 line-clamp-3 ${isBackground ? "text-ink-muted" : ""}`}>{d.lead}</p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
