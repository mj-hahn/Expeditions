import Link from "next/link";
import { memo } from "react";
import { FactText } from "@/components/FactText";
import { LEGS_2026, PLACES } from "@/content/route-points";
import type { DispatchPin } from "@/lib/dateline-place";
import { formatShortDate } from "@/lib/time";
import type { TourStop } from "./tour";
import { BTN, ROUND } from "./ui";

function legLabel(id: string): string | null {
  const leg = LEGS_2026.find((l) => l.from === id);
  if (!leg) return null;
  return `${leg.by === "air" ? "Flight" : "Sea"} leg: ${PLACES[leg.from].short} → ${PLACES[leg.to].short}`;
}

/** The selected stop's story and dispatches, plus the voyage replay button where it applies. Holds no navigation. */
export const StopCard = memo(function StopCard({ stop, dispatches, canReplay, onReplay, onClose }: { stop: TourStop | null; dispatches: DispatchPin[] | undefined; canReplay: boolean; onReplay: () => void; onClose: () => void }) {
  const voyageStop = stop?.era === "2026" && (stop.placeKey === "tarawa" || stop.placeKey === "nikumaroro" || stop.placeKey.startsWith("between-"));
  const replayButton =
    canReplay && (!stop || voyageStop) ? (
      <button type="button" className={`${BTN} w-full`} onClick={onReplay}>
        ⛴ Replay the voyage
      </button>
    ) : null;
  const legText = stop?.era === "2026" ? legLabel(stop.placeKey) : null;

  return (
    <div aria-live="polite">
      {stop ? (
        <div className="mt-4 rounded-[var(--radius-card)] bg-navy-2/80 px-4 py-4 ring-1 ring-foam/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`font-mono font-semibold ${stop.era === "1937" ? "text-amber" : "text-signal"}`}>{stop.era === "1937" ? "1937 flight" : "2026 expedition"}</p>
              <h3 className="font-display mt-1 text-[1.35rem] leading-snug font-semibold">{stop.title}</h3>
            </div>
            <button type="button" aria-label="Close" className={ROUND} onClick={onClose}>
              ×
            </button>
          </div>
          {legText && <p className="mt-2 font-mono text-foam-muted">{legText}</p>}
          <div className="mt-3 space-y-4">
            {stop.facts.map((id) => (
              <FactText key={id} id={id} tone="dark" />
            ))}
          </div>
          {stop.era === "2026" && dispatches && (
            <div className="mt-4">
              <p className="font-mono font-semibold text-foam-muted">Dispatches written here</p>
              <ul className="mt-2 space-y-2">
                {dispatches.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/dispatch/${d.slug}`} className="text-amber underline">
                      {d.title}
                    </Link>{" "}
                    <span className="font-mono text-foam-muted">{formatShortDate(new Date(d.publishedAt), "America/Toronto")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {replayButton && <div className="mt-4">{replayButton}</div>}
        </div>
      ) : (
        replayButton && <div className="mt-3">{replayButton}</div>
      )}
    </div>
  );
});
