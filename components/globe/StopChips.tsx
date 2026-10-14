import { memo, useEffect, useRef } from "react";
import { revealChip } from "./scroll";
import type { TourStop } from "./tour";

export const StopChips = memo(function StopChips({ stops, selected, onSelect }: { stops: TourStop[]; selected: string | null; onSelect: (s: TourStop) => void }) {
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    const chip = row.current?.querySelector<HTMLElement>(`[data-key="${selected}"]`) ?? null;
    revealChip(row.current, chip);
  }, [selected]);

  return (
    <div ref={row} className="snap-track -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
      {stops.map((s) => (
        <button
          key={s.key}
          type="button"
          data-key={s.key}
          aria-pressed={selected === s.key}
          onClick={() => onSelect(s)}
          className={`flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[1.05rem] font-semibold ring-1 ${
            selected === s.key ? "bg-foam text-navy ring-foam" : "bg-foam/10 text-foam ring-foam/20 hover:bg-foam/20"
          }`}
        >
          {s.short}
          <span className={`font-mono text-[1rem] font-medium ${selected === s.key ? "text-navy/70" : s.era === "1937" ? "text-amber" : "text-signal"}`}>{s.era}</span>
        </button>
      ))}
    </div>
  );
});
