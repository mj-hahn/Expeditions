"use client";

import { isOnIsland, PHASE_INFO } from "@/lib/status";
import { islandDayNumber } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import type { Status } from "@/lib/types";

/**
 * "Day 2 on Nikumaroro · Scanning the lagoon with sonar".
 * The phase comes from status.json; the clock only drives the day number (SPEC §5).
 * The day overline is computed on the client so the cached server HTML never goes stale.
 */
export function StatusLine({ status }: { status: Status }) {
  const now = useNow();
  const day = now === null ? null : islandDayNumber(new Date(now));
  const onIsland = isOnIsland(status.phase);

  let overline: string | null = null;
  if (status.phase === "return") overline = "Sailing home";
  else if (onIsland) overline = day !== null && day >= 1 ? `Day ${day} on Nikumaroro` : "On Nikumaroro";
  else overline = "The 2026 expedition";

  const sentence =
    status.headline ?? (status.phase === "return" ? "The team is sailing back to Tarawa" : PHASE_INFO[status.phase].sentence);

  return (
    <div>
      <p className="font-mono text-[1rem] font-semibold tracking-[0.14em] text-amber uppercase">
        {overline}
      </p>
      <h1 className="mt-2 text-[2.2rem] font-semibold text-foam sm:text-[2.9rem]">{sentence}</h1>
    </div>
  );
}
