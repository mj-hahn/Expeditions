"use client";

import { WeatherIcon } from "@/components/WeatherIcon";
import { isNightOnIsland, moonInfo, moonPath, southernCross } from "@/lib/sky";
import { formatTime, ISLAND_TZ } from "@/lib/time";
import { useNow } from "@/lib/use-now";

const CARD = "rounded-[var(--radius-card)] bg-navy-2/80 p-4 ring-1 ring-foam/10";

export function NightSky() {
  const nowMs = useNow();
  if (nowMs === null) return <section aria-hidden="true" className={`${CARD} min-h-56`} />;

  const now = new Date(nowMs);
  const night = isNightOnIsland(now);
  const moon = moonInfo(now);
  const cross = southernCross(now);
  const pct = Math.round(moon.illumination * 100);
  const times = [
    moon.rise && `Moonrise ${formatTime(moon.rise, ISLAND_TZ)}`,
    moon.set && `moonset ${formatTime(moon.set, ISLAND_TZ)}`,
  ].filter(Boolean) as string[];
  const timesText = times.length ? `${times.join(" · ")} (island time)` : null;

  return (
    <section aria-label={night ? "Tonight's sky" : "The sky now"} className={CARD}>
      <p className="flex items-center gap-2 text-foam-muted">
        <WeatherIcon icon="moon" className="size-6 shrink-0" />
        {night ? "Tonight's sky" : "The sky now"}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="-34 -34 68 68" width={64} height={64} role="img" aria-label={`${moon.phaseName}, ${pct} percent lit`} className="shrink-0">
          <circle r={30} fill="#1C4266" stroke="#EEF4F7" strokeOpacity={0.25} strokeWidth={1.5} />
          <path d={moonPath(moon.phase, 30)} fill="#EEF4F7" />
        </svg>
        <p className="text-foam">
          {moon.phaseName} · <span className="font-mono tabular-nums">{pct}%</span> lit
        </p>
      </div>
      {timesText && <p className="mt-3 text-foam">{timesText}</p>}
      <p className="mt-3 text-foam">
        {cross.aboveHorizon ? (
          <>
            The Southern Cross is up now, about{" "}
            <span className="font-mono tabular-nums">{Math.round(cross.altitudeDeg)}°</span> above the {cross.direction} horizon.
          </>
        ) : (
          "The Southern Cross is below the horizon right now."
        )}
      </p>
      <p className="mt-3 text-foam-muted">Calculated for Nikumaroro&rsquo;s position.</p>
    </section>
  );
}
