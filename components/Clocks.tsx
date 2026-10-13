"use client";

import { formatClock, HOME_TZ, hoursAhead, ISLAND_TZ } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { site } from "@/content/site";

function Clock({ label, tz, live, now }: { label: string; tz: string; live?: boolean; now: number | null }) {
  const c = now === null ? null : formatClock(new Date(now), tz);
  return (
    <div className="rounded-[var(--radius-card)] bg-navy-2/80 px-3.5 py-3 ring-1 ring-foam/10">
      <p className="flex items-center gap-2 text-[1rem] text-foam-muted">
        {live && <span className="live-dot" aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1 font-mono text-[1.7rem] leading-none font-semibold text-foam tabular-nums">
        {c ? c.time : "--:--"}
        <span className="ml-1 text-[1rem] font-normal text-foam-muted">{c?.ampm ?? ""}</span>
      </p>
      <p className="mt-1.5 text-[1rem] text-foam-muted">{c ? `${c.weekday}, ${c.date}` : " "}</p>
    </div>
  );
}

export function Clocks() {
  const now = useNow();
  const ahead = now === null ? null : hoursAhead(new Date(now));
  return (
    <div>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Clocks">
        <Clock label={site.homeLabel} tz={HOME_TZ} now={now} />
        <Clock label={site.islandLabel} tz={ISLAND_TZ} now={now} live />
      </div>
      <p className="mt-3 text-[1rem] text-foam-muted">
        {ahead === null ? " " : `Nikumaroro is ${ahead} hours ahead of you.`}
      </p>
    </div>
  );
}
