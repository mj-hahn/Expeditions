import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Img } from "@/components/Img";
import { SectionHeading } from "@/components/SectionHeading";
import { TopBar } from "@/components/TopBar";
import { site } from "@/content/site";
import { buildFullDiary, diaryDayLabel, type DiaryDay } from "@/lib/diary";
import { getDispatches } from "@/lib/dispatches";
import { shortTitle } from "@/lib/purdue";
import { PHASE_INFO } from "@/lib/status";

export const metadata: Metadata = { title: "Expedition diary" };

function DayCard({ entry }: { entry: DiaryDay }) {
  const { date, phases, dispatches } = entry;
  return (
    <li className="paper rounded-[var(--radius-card)] p-4 ring-1 ring-rule sm:p-5">
      <h2 className="font-display text-[1.4rem] font-semibold text-navy">
        <time dateTime={date}>{diaryDayLabel(date)}</time>
      </h2>
      {phases.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="What was happening">
          {phases.map((p) => (
            <li key={p} className="rounded-full bg-teal/10 px-3 py-0.5 text-[1rem] text-teal-ink">
              {PHASE_INFO[p].label}
            </li>
          ))}
        </ul>
      )}
      {dispatches.length === 0 ? (
        phases.length === 0 && <p className="mt-2 text-ink-muted">No dispatch this day.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {dispatches.map((d) => {
            const photo = d.hero ?? d.photos[0];
            const isBackground = d.kind === "background";
            return (
              <li key={d.id}>
                <Link
                  href={`/dispatch/${d.slug}`}
                  className={`group flex min-h-11 gap-4 rounded-xl p-3 ring-1 ring-rule ${
                    isBackground ? "bg-transparent hover:bg-paper/60" : "bg-paper hover:ring-teal"
                  }`}
                >
                  {photo && (
                    <span className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand-2">
                      <Img photo={photo} alt="" sizes="80px" className="h-full w-full object-cover" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[1.15rem] font-semibold group-hover:underline ${
                        isBackground ? "text-ink-muted" : "text-navy"
                      }`}
                    >
                      {d.kind === "dispatch" ? shortTitle(d.title) : d.title}
                    </span>
                    <span className={`mt-1 line-clamp-3 ${isBackground ? "text-ink-muted" : ""}`}>{d.lead}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default async function DiaryPage() {
  const dispatches = await getDispatches();
  const days = buildFullDiary(dispatches);
  return (
    <>
      <TopBar label="Diary" />
      <main className="mx-auto max-w-[720px] px-5 pt-8 pb-16 sm:px-8">
        <SectionHeading kicker="Expedition diary" title="Day by day" />
        <p className="mb-6 text-ink-muted">
          Newest day first. Dates are the calendar day on Nikumaroro; Day 1 is October 13, the team’s first day ashore.
        </p>
        {dispatches.length === 0 && (
          <div className="paper mb-6 rounded-[var(--radius-card)] p-6 ring-1 ring-rule">
            <p>
              Dispatches will appear here as soon as they can be loaded. In the meantime, you can read them on{" "}
              <a href={site.purdueNewsUrl} className="font-semibold text-teal-ink underline">
                Purdue University News
              </a>
              .
            </p>
          </div>
        )}
        <ol className="space-y-4">
          {days.map((entry) => (
            <DayCard key={entry.date} entry={entry} />
          ))}
        </ol>
      </main>
      <Footer />
    </>
  );
}
