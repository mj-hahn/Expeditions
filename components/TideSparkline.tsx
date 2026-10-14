"use client";

import { useState } from "react";
import { tideWindow, type TidePoint } from "@/lib/conditions-shared";
import { formatTime, ISLAND_TZ } from "@/lib/time";

const W = 320;
const H = 80;
const PAD = { l: 6, r: 6, t: 12, b: 12 };

/** Next 24 hours of modelled sea level (SPEC §4.3: label it as approximate). */
export function TideSparkline({ tide, now }: { tide: TidePoint[]; now: Date }) {
  const pts = tideWindow(tide, now, 24);
  const [hover, setHover] = useState<number | null>(null);
  if (pts.length < 4) return null;

  const t0 = Date.parse(pts[0].t);
  const t1 = Date.parse(pts[pts.length - 1].t);
  const hs = pts.map((p) => p.h);
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  const span = Math.max(max - min, 0.05);
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (h: number) => PAD.t + (1 - (h - min) / span) * (H - PAD.t - PAD.b);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(Date.parse(p.t)).toFixed(1)} ${y(p.h).toFixed(1)}`).join("");

  // Label the next high and low after now: the first turning points, not the window's extremes.
  const nowMs = now.getTime();
  const turning = (dir: 1 | -1) =>
    pts.find(
      (p, i) =>
        i > 0 &&
        i < pts.length - 1 &&
        Date.parse(p.t) >= nowMs &&
        dir * (p.h - pts[i - 1].h) > 0 &&
        dir * (p.h - pts[i + 1].h) >= 0,
    ) ?? null;
  const high = turning(1);
  const low = turning(-1);
  const nowX = x(Math.min(Math.max(now.getTime(), t0), t1));
  const active = hover !== null ? pts[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(x(Date.parse(p.t)) - px) < Math.abs(x(Date.parse(pts[best].t)) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none"
        role="img"
        aria-label={`Approximate tide for the next 24 hours.${high ? ` Next high around ${formatTime(new Date(high.t), ISLAND_TZ)}` : ""}${low ? `, next low around ${formatTime(new Date(low.t), ISLAND_TZ)}` : ""} island time.`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <path d={`M${PAD.l} ${H - PAD.b}H${W - PAD.r}`} stroke="#EEF4F7" strokeOpacity="0.15" />
        <path d={`${d}L${x(t1)} ${H - PAD.b}L${x(t0)} ${H - PAD.b}Z`} fill="#8FD0C8" fillOpacity="0.12" />
        <path d={d} fill="none" stroke="#8FD0C8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={`M${nowX} ${PAD.t - 6}V${H - PAD.b}`} stroke="#E8692C" strokeWidth="1.5" strokeDasharray="3 3" />
        {[high, low].map((p) =>
          p ? <circle key={p.t} cx={x(Date.parse(p.t))} cy={y(p.h)} r="4" fill="#0B1F33" stroke="#8FD0C8" strokeWidth="2" /> : null,
        )}
        {active && (
          <g>
            <path d={`M${x(Date.parse(active.t))} ${PAD.t - 6}V${H - PAD.b}`} stroke="#EEF4F7" strokeOpacity="0.6" />
            <circle cx={x(Date.parse(active.t))} cy={y(active.h)} r="4.5" fill="#8FD0C8" stroke="#0B1F33" strokeWidth="2" />
          </g>
        )}
      </svg>
      {(high || low) && (
        <p className="mt-1 text-foam">
          {high && <>Next high ≈ {formatTime(new Date(high.t), ISLAND_TZ)}</>}
          {high && low && " · "}
          {low && <>next low ≈ {formatTime(new Date(low.t), ISLAND_TZ)}</>}
          <span className="text-foam-muted"> (island time)</span>
        </p>
      )}
      <figcaption className="mt-1 flex flex-wrap justify-between gap-x-4 text-[1rem] text-foam-muted">
        <span>Approximate tide (model), next 24 hours</span>
        <span aria-live="polite">
          {active ? `${formatTime(new Date(active.t), ISLAND_TZ)} · ${active.h.toFixed(2)} m` : <><span className="text-signal">┆</span> now</>}
        </span>
      </figcaption>
    </figure>
  );
}
