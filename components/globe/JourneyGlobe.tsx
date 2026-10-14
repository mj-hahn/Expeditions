"use client";

import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import { LEG_1937, LEGS_2026, PLACES, SPUR_1937, type PlaceId } from "@/content/route-points";
import { phaseIndex } from "@/lib/status";
import type { Phase } from "@/lib/types";

// Orthographic globe of both journeys (SPEC §7.4). No tiles, no API keys.
const SIZE = 360;
const R = SIZE / 2 - 8;
const HOME: [number, number] = [-PLACES.nikumaroro.lon, -PLACES.nikumaroro.lat + 8];
const START: [number, number] = [-PLACES.purdue.lon, -25];

const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topo, topo.objects.land) as FeatureCollection<Geometry> | Feature<Geometry>;
const GRATICULE = geoGraticule10();

const line = (a: PlaceId, b: PlaceId): LineString => ({
  type: "LineString",
  coordinates: [
    [PLACES[a].lon, PLACES[a].lat],
    [PLACES[b].lon, PLACES[b].lat],
  ],
});

/** How many 2026 legs are complete, and which are under way, from status.json's phase. */
export function legProgress(phase: Phase): { done: number; active: number[] } {
  const i = phaseIndex(phase);
  if (i <= phaseIndex("departed")) return { done: 0, active: [0, 1, 2] };
  if (i === phaseIndex("tarawa")) return { done: 3, active: [] };
  if (i === phaseIndex("at_sea")) return { done: 3, active: [3] };
  return { done: 4, active: [] };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function JourneyGlobe({ phase }: { phase: Phase }) {
  const [rotation, setRotation] = useState<[number, number]>(() => (prefersReducedMotion() ? HOME : START));
  const anim = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; r: [number, number] } | null>(null);

  // Animate the globe's centre along a great circle; state only changes in rAF callbacks.
  const animate = (target: [number, number], from: [number, number]) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const interp = geoInterpolate([-from[0], -from[1]], [-target[0], -target[1]]);
    const duration = prefersReducedMotion() ? 0 : 2200;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = duration ? Math.min(1, (t - t0) / duration) : 1;
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const [lon, lat] = interp(e);
      setRotation([-lon, -lat]);
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  // First view: swing from the US over to Nikumaroro.
  useEffect(() => {
    if (!prefersReducedMotion()) animate(HOME, START);
    return () => {
      if (anim.current) cancelAnimationFrame(anim.current);
    };
  }, []);

  const projection = useMemo(
    () => geoOrthographic().scale(R).translate([SIZE / 2, SIZE / 2]).rotate(rotation).clipAngle(90).precision(0.3),
    [rotation],
  );
  const path = geoPath(projection);
  const center: [number, number] = [-rotation[0], -rotation[1]];
  const visible = (id: PlaceId) => geoDistance([PLACES[id].lon, PLACES[id].lat], center) < Math.PI / 2 - 0.05;

  const { done, active } = legProgress(phase);

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, r: rotation };
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = 180 / rect.width; // degrees per pixel: one globe-width drag ≈ half a turn
    setRotation([d.r[0] + (e.clientX - d.x) * k, Math.max(-80, Math.min(80, d.r[1] - (e.clientY - d.y) * k))]);
  };
  const onUp = () => {
    drag.current = null;
  };

  const marker = (id: PlaceId, opts: { label?: string; dx?: number; dy?: number; anchor?: "start" | "end"; tone: "signal" | "amber" | "foam" }) => {
    if (!visible(id)) return null;
    const p = projection([PLACES[id].lon, PLACES[id].lat]);
    if (!p) return null;
    const fill = opts.tone === "signal" ? "#E8692C" : opts.tone === "amber" ? "#D9A441" : "#EEF4F7";
    return (
      <g key={id}>
        <circle cx={p[0]} cy={p[1]} r={opts.label ? 5.5 : 4} fill={fill} stroke="#0B1F33" strokeWidth="2" />
        {opts.label && (
          <text
            x={p[0] + (opts.dx ?? 9)}
            y={p[1] + (opts.dy ?? 5)}
            textAnchor={opts.anchor ?? "start"}
            fontSize="17"
            fontWeight="600"
            fontFamily="var(--font-sans)"
            fill="#EEF4F7"
            stroke="#0B1F33"
            strokeWidth="4"
            paintOrder="stroke"
          >
            {opts.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block h-auto w-full max-w-[480px] cursor-grab touch-none select-none active:cursor-grabbing"
        role="img"
        aria-label="Globe showing Earhart's planned 1937 route from Lae toward Howland Island, the Nikumaroro hypothesis, and the 2026 expedition route from West Lafayette through Los Angeles, Nadi and Tarawa to Nikumaroro. Drag to rotate."
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <defs>
          <radialGradient id="g-ocean" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#1C4266" />
            <stop offset="1" stopColor="#0E2740" />
          </radialGradient>
        </defs>
        <path d={path({ type: "Sphere" }) ?? ""} fill="url(#g-ocean)" stroke="#EEF4F7" strokeOpacity="0.25" />
        <path d={path(GRATICULE) ?? ""} fill="none" stroke="#EEF4F7" strokeOpacity="0.07" />
        <path d={path(LAND) ?? ""} fill="#E9DBBB" fillOpacity="0.9" stroke="#0B1F33" strokeWidth="0.5" />

        {/* 1937: planned final leg (amber, dashed) and the hypothesis spur (dotted) */}
        <path d={path(line(LEG_1937.from, LEG_1937.to)) ?? ""} fill="none" stroke="#D9A441" strokeWidth="2.5" strokeDasharray="7 5" />
        <path d={path(line(SPUR_1937.from, SPUR_1937.to)) ?? ""} fill="none" stroke="#D9A441" strokeWidth="2.5" strokeDasharray="1 5" strokeLinecap="round" />

        {/* 2026: completed legs solid with a draw-in, the current leg dashed, future legs faint */}
        {LEGS_2026.map((leg, i) => {
          const d = path(line(leg.from, leg.to)) ?? "";
          const state = i < done ? "done" : active.includes(i) ? "active" : "next";
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#E8692C"
              strokeWidth={state === "next" ? 2 : 3}
              strokeOpacity={state === "next" ? 0.35 : 1}
              strokeDasharray={state === "done" ? undefined : "6 6"}
              strokeLinecap="round"
              className={state === "done" ? "globe-draw" : state === "active" ? "ls-dash" : undefined}
              pathLength={state === "done" ? 1 : undefined}
              style={state === "done" ? { animationDelay: `${0.4 + i * 0.5}s` } : undefined}
            />
          );
        })}

        {marker("lae", { tone: "amber" })}
        {marker("purdue", { tone: "signal" })}
        {marker("lax", { tone: "signal" })}
        {marker("nadi", { tone: "signal" })}
        {marker("tarawa", { tone: "signal" })}
        {marker("howland", { label: "Howland", tone: "amber", dx: 9, dy: -6 })}
        {marker("nikumaroro", { label: "Nikumaroro", tone: "signal", dx: 10, dy: 20 })}
      </svg>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => animate(HOME, rotation)}
          className="min-h-12 rounded-full bg-foam/10 px-6 text-[1.05rem] font-semibold text-foam ring-1 ring-foam/20 hover:bg-foam/20"
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
