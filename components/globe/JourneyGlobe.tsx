"use client";

import { geoCircle, geoDistance, geoGraticule, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import { FactText } from "@/components/FactText";
import { STOPS, type Stop } from "@/content/globe-stops";
import { LEG_1937, LEGS_2026, PLACES, SPUR_1937, type PlaceId } from "@/content/route-points";
import { subsolarPoint } from "@/lib/sun";
import { phaseIndex } from "@/lib/status";
import type { Phase } from "@/lib/types";
import { useNow } from "@/lib/use-now";

// Orthographic globe of both journeys (SPEC §7.4). No tiles, no API keys.
const SIZE = 360;
const R = SIZE / 2 - 8;
const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const BUTTON_ZOOM = 1.8;
const TAP_SLOP = 8; // screen px a finger may wander and still count as a tap
const TAP_RADIUS = 24; // screen px from a marker that still hits it
const DETAIL_ZOOM = 2.5; // switch to the 50m coastline
const FINE_GRATICULE_ZOOM = 4;

type View = { lon: number; lat: number; zoom: number }; // lon/lat are the d3 rotation, not the centre
const HOME: View = { lon: -PLACES.nikumaroro.lon, lat: -PLACES.nikumaroro.lat + 8, zoom: 1 };
const START: View = { lon: -PLACES.purdue.lon, lat: -25, zoom: 1 };

type Land = FeatureCollection<Geometry> | Feature<Geometry>;
const toLand = (t: unknown) => {
  const topo = t as Topology<{ land: GeometryCollection }>;
  return feature(topo, topo.objects.land) as Land;
};
const LAND_110 = toLand(land110);
const GRATICULE = geoGraticule10();
const GRATICULE_FINE = geoGraticule().step([2, 2])();

const PLACE_IDS = Object.keys(PLACES) as PlaceId[];
const NIKU_2026 = STOPS.find((s) => s.key === "niku-2026")!;

// Deterministic stars (seeded LCG, so the sky doesn't reshuffle between renders).
const STARS = (() => {
  let seed = 20260;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const out: { x: number; y: number; r: number; o: number }[] = [];
  while (out.length < 40) {
    const x = rnd() * SIZE;
    const y = rnd() * SIZE;
    if (Math.hypot(x - SIZE / 2, y - SIZE / 2) < R + 12) continue;
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r: 0.6 + rnd() * 0.9, o: 0.2 + rnd() * 0.35 });
  }
  return out;
})();

const line = (a: PlaceId, b: PlaceId): LineString => ({
  type: "LineString",
  coordinates: [
    [PLACES[a].lon, PLACES[a].lat],
    [PLACES[b].lon, PLACES[b].lat],
  ],
});
const coords = (id: PlaceId): [number, number] => [PLACES[id].lon, PLACES[id].lat];

/** How many 2026 legs are complete, and which are under way, from status.json's phase. */
export function legProgress(phase: Phase): { done: number; active: number[] } {
  const i = phaseIndex(phase);
  if (i <= phaseIndex("departed")) return { done: 0, active: [0, 1, 2] };
  if (i === phaseIndex("tarawa")) return { done: 3, active: [] };
  if (i === phaseIndex("at_sea")) return { done: 3, active: [3] };
  return { done: 4, active: [] };
}

/** Where the team is, from status.json's phase only. Null while in transit by air. */
export function teamLocation(phase: Phase): [number, number] | null {
  const i = phaseIndex(phase);
  if (i <= phaseIndex("departed")) return null;
  if (i === phaseIndex("tarawa")) return coords("tarawa");
  if (i === phaseIndex("at_sea")) return geoInterpolate(coords("tarawa"), coords("nikumaroro"))(0.5);
  return coords("nikumaroro");
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
const clampLat = (l: number) => Math.max(-80, Math.min(80, l));
const viewFor = (id: PlaceId, zoom: number): View => ({ lon: -PLACES[id].lon, lat: -PLACES[id].lat, zoom });

function makeProjection(v: View, clip: boolean) {
  const p = geoOrthographic().scale(R * v.zoom).translate([SIZE / 2, SIZE / 2]).rotate([v.lon, v.lat]).clipAngle(90).precision(0.3);
  // Zoomed in, most of the globe is off-screen; clipping to the frame keeps paths small.
  return clip ? p.clipExtent([[-12, -12], [SIZE + 12, SIZE + 12]]) : p;
}

const isVisible = (id: PlaceId, v: View) => geoDistance(coords(id), [-v.lon, -v.lat]) < Math.PI / 2 - 0.05;
const pointVisible = (pt: [number, number], v: View) => geoDistance(pt, [-v.lon, -v.lat]) < Math.PI / 2 - 0.05;

type Pt = { x: number; y: number };
type Base = { rot: [number, number]; zoom: number; mid: Pt; dist: number };

const midpoint = (pts: Pt[]): Pt => ({ x: (pts[0].x + (pts[1] ?? pts[0]).x) / 2, y: (pts[0].y + (pts[1] ?? pts[0]).y) / 2 });
const distance = (pts: Pt[]) => (pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0);

const HALO = { stroke: "#0B1F33", strokeWidth: 4, paintOrder: "stroke" } as const;

function legLabel(id: PlaceId): string | null {
  const leg = LEGS_2026.find((l) => l.from === id);
  if (!leg) return null;
  return `${leg.by === "air" ? "Flight" : "Sea"} leg: ${PLACES[leg.from].short} → ${PLACES[leg.to].short}`;
}

export default function JourneyGlobe({ phase }: { phase: Phase }) {
  const [view, setView] = useState<View>(() => (prefersReducedMotion() ? HOME : START));
  const [land50, setLand50] = useState<Land | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const now = useNow();
  const minute = now === null ? null : Math.floor(now / 60000);

  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef(view); // latest view for event handlers (state lags a frame)
  const goal = useRef<View>(view); // where button zooms build on, even mid-animation
  const anim = useRef<number | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const base = useRef<Base | null>(null);
  const gesture = useRef({ down: { x: 0, y: 0 }, moved: 0, multi: false });
  const frame = useRef<number | null>(null);
  const requested50 = useRef(false);

  const commit = useCallback((v: View, setGoal = true) => {
    viewRef.current = v;
    if (setGoal) goal.current = v;
    setView(v);
  }, []);

  const stopAnim = () => {
    if (anim.current) cancelAnimationFrame(anim.current);
    anim.current = null;
  };

  // Fly along a great circle, easing rotation and zoom together. State only changes in rAF callbacks;
  // reduced motion runs a single frame, i.e. jumps.
  const flyTo = useCallback(
    (to: View, ms: number) => {
      stopAnim();
      goal.current = to;
      const from = viewRef.current;
      const interp = geoInterpolate([-from.lon, -from.lat], [-to.lon, -to.lat]);
      const duration = prefersReducedMotion() ? 0 : ms;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = duration ? Math.min(1, (t - t0) / duration) : 1;
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        const [lon, lat] = interp(e);
        commit({ lon: -lon, lat: -lat, zoom: from.zoom * (to.zoom / from.zoom) ** e }, false);
        anim.current = k < 1 ? requestAnimationFrame(step) : null;
      };
      anim.current = requestAnimationFrame(step);
    },
    [commit],
  );

  // First view: swing from the US over to Nikumaroro.
  useEffect(() => {
    if (!prefersReducedMotion()) flyTo(HOME, 2200);
    return stopAnim;
  }, [flyTo]);

  // Load the detailed coastline only once someone zooms in.
  const wantDetail = view.zoom >= DETAIL_ZOOM;
  useEffect(() => {
    if (!wantDetail || requested50.current) return;
    requested50.current = true;
    import("world-atlas/land-50m.json")
      .then((m) => setLand50(toLand(m.default)))
      .catch(() => {
        requested50.current = false;
      });
  }, [wantDetail]);

  // Trackpad pinch arrives as ctrl+wheel; a plain wheel must still scroll the page.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      stopAnim();
      const v = viewRef.current;
      commit({ ...v, zoom: clampZoom(v.zoom * Math.exp(-e.deltaY * 0.01)) });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [commit]);

  const geo = useMemo(() => {
    const v: View = { lon: view.lon, lat: view.lat, zoom: view.zoom };
    const proj = makeProjection(v, false);
    const path = geoPath(makeProjection(v, true));
    const land = view.zoom >= DETAIL_ZOOM && land50 ? land50 : LAND_110;
    return {
      proj,
      sphere: geoPath(proj)({ type: "Sphere" }) ?? "",
      graticule: path(view.zoom >= FINE_GRATICULE_ZOOM ? GRATICULE_FINE : GRATICULE) ?? "",
      land: path(land) ?? "",
      leg1937: path(line(LEG_1937.from, LEG_1937.to)) ?? "",
      spur: path(line(SPUR_1937.from, SPUR_1937.to)) ?? "",
      legs2026: LEGS_2026.map((l) => path(line(l.from, l.to)) ?? ""),
    };
  }, [view.lon, view.lat, view.zoom, land50]);
  const { proj } = geo;

  const night = useMemo(() => {
    if (minute === null) return "";
    const [lon, lat] = subsolarPoint(new Date(minute * 60000));
    const circle = geoCircle().center([lon + 180, -lat]).radius(90)();
    return geoPath(makeProjection({ lon: view.lon, lat: view.lat, zoom: view.zoom }, true))(circle) ?? "";
  }, [minute, view.lon, view.lat, view.zoom]);

  const { done, active } = legProgress(phase);
  const team = teamLocation(phase);
  const zoom = view.zoom;
  const selectedStop = STOPS.find((s) => s.key === selected) ?? null;
  const selectedIndex = selectedStop ? STOPS.indexOf(selectedStop) : -1;

  const selectStop = (stop: Stop) => {
    setSelected(stop.key);
    flyTo(viewFor(stop.id, stop.zoom), 1400);
  };

  // --- pointer gestures ---
  const rebaseline = () => {
    const pts = [...pointers.current.values()];
    const v = viewRef.current;
    base.current = pts.length ? { rot: [v.lon, v.lat], zoom: v.zoom, mid: midpoint(pts), dist: distance(pts) } : null;
  };

  const applyGesture = () => {
    frame.current = null;
    const b = base.current;
    const svg = svgRef.current;
    const pts = [...pointers.current.values()];
    if (!b || !svg || !pts.length) return;
    const rect = svg.getBoundingClientRect();
    const z = pts.length > 1 && b.dist > 0 ? clampZoom(b.zoom * (distance(pts) / b.dist)) : b.zoom;
    const k = 180 / rect.width / z; // degrees per pixel: one globe-width drag ≈ half a turn at zoom 1
    const mid = midpoint(pts);
    commit({ lon: b.rot[0] + (mid.x - b.mid.x) * k, lat: clampLat(b.rot[1] - (mid.y - b.mid.y) * k), zoom: z });
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    stopAnim();
    goal.current = viewRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 0) gesture.current = { down: { x: e.clientX, y: e.clientY }, moved: 0, multi: false };
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size > 1) gesture.current.multi = true;
    rebaseline();
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.down.x, e.clientY - g.down.y));
    if (frame.current === null) frame.current = requestAnimationFrame(applyGesture);
  };

  const hitTest = (clientX: number, clientY: number): Stop | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const u = rect.width / SIZE;
    const v = viewRef.current;
    const p = makeProjection(v, false);
    let best: { id: PlaceId; d: number } | null = null;
    for (const id of PLACE_IDS) {
      if (!isVisible(id, v)) continue;
      const pt = p(coords(id));
      if (!pt) continue;
      const d = Math.hypot(pt[0] * u + rect.left - clientX, pt[1] * u + rect.top - clientY);
      if (d <= TAP_RADIUS && (!best || d < best.d)) best = { id, d };
    }
    if (!best) return null;
    return best.id === "nikumaroro" ? NIKU_2026 : (STOPS.find((s) => s.id === best.id) ?? null);
  };

  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    const isTap = e.type === "pointerup" && !g.multi && g.moved < TAP_SLOP && pointers.current.size === 0;
    rebaseline(); // going from two fingers to one must not make the globe jump
    if (isTap) {
      const stop = hitTest(e.clientX, e.clientY);
      if (stop) selectStop(stop);
    }
  };

  const zoomBy = (factor: number) => {
    const g = goal.current;
    flyTo({ ...g, zoom: clampZoom(g.zoom * factor) }, 350);
  };

  // --- drawing ---
  const showAllLabels = zoom >= 2;
  const selectedPlace = selectedStop?.id;

  const text = (x: number, y: number, s: string, o: { anchor?: "start" | "middle" | "end"; mono?: boolean; italic?: boolean; opacity?: number; fill?: string } = {}) => (
    <text
      x={x}
      y={y}
      textAnchor={o.anchor ?? "start"}
      fontSize="17"
      fontWeight={o.mono ? 500 : 600}
      fontStyle={o.italic ? "italic" : undefined}
      fontFamily={o.mono ? "var(--font-mono)" : "var(--font-sans)"}
      fill={o.fill ?? "#EEF4F7"}
      fillOpacity={o.opacity}
      {...HALO}
    >
      {s}
    </text>
  );

  const labelFor = (id: PlaceId): { dx: number; dy: number; anchor: "start" | "end" } | null => {
    if (id === "howland") return { dx: 9, dy: -6, anchor: "start" };
    if (id === "nikumaroro") return showAllLabels ? { dx: -10, dy: 5, anchor: "end" } : { dx: 10, dy: 20, anchor: "start" };
    if (!showAllLabels) return null;
    if (id === "purdue") return { dx: 9, dy: 5, anchor: "start" };
    return { dx: -9, dy: 5, anchor: "end" }; // lae, lax, nadi, tarawa
  };

  const marker = (id: PlaceId, tone: "signal" | "amber") => {
    if (!isVisible(id, view)) return null;
    const p = proj(coords(id));
    if (!p) return null;
    const lab = labelFor(id);
    return (
      <g key={id}>
        {selectedPlace === id && <circle cx={p[0]} cy={p[1]} r="12" fill="none" stroke="#fff" strokeWidth="3" />}
        <circle cx={p[0]} cy={p[1]} r={lab ? 5.5 : 4} fill={tone === "signal" ? "#E8692C" : "#D9A441"} stroke="#0B1F33" strokeWidth="2" />
        {lab && text(p[0] + lab.dx, p[1] + lab.dy, PLACES[id].short, { anchor: lab.anchor })}
      </g>
    );
  };

  const caption = (a: PlaceId, b: PlaceId, s: string, minZoom: number, anchor: "middle" | "end" = "middle") => {
    if (zoom < minZoom) return null;
    const m = geoInterpolate(coords(a), coords(b))(0.5);
    if (!pointVisible(m, view)) return null;
    const p = proj(m);
    if (!p) return null;
    return text(p[0] + (anchor === "end" ? -8 : 0), p[1] - 14, s, { anchor, mono: true, fill: "#E9DBBB" });
  };

  const howland = zoom >= 4 && isVisible("howland", view) ? proj(coords("howland")) : null;
  const phoenix = zoom >= 4 && pointVisible([-172, -3.5], view) ? proj([-172, -3.5]) : null;
  const teamPt = team && pointVisible(team, view) ? proj(team) : null;

  const atmosphere = zoom <= 1.2;
  const btn = "min-h-12 rounded-full bg-foam/10 px-6 text-[1.05rem] font-semibold text-foam ring-1 ring-foam/20 hover:bg-foam/20 disabled:opacity-40 disabled:hover:bg-foam/10";
  const round = "grid size-12 shrink-0 place-items-center rounded-full bg-foam/10 text-[1.6rem] leading-none font-semibold text-foam ring-1 ring-foam/20 hover:bg-foam/20 disabled:opacity-40 disabled:hover:bg-foam/10";
  const legText = selectedStop?.era === "2026" ? legLabel(selectedStop.id) : null;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block h-auto w-full max-w-[600px] cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
        role="img"
        aria-label="Globe showing Earhart's planned 1937 route from Lae toward Howland Island, the Nikumaroro hypothesis, and the 2026 expedition route from West Lafayette through Los Angeles, Nadi and Tarawa to Nikumaroro. Drag to rotate, pinch or use the zoom buttons to zoom, and tap a dot or use the stop buttons below to learn about that stop."
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
          <radialGradient id="g-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0.9" stopColor="#4FB3B3" stopOpacity="0" />
            <stop offset="0.96" stopColor="#4FB3B3" stopOpacity="0.3" />
            <stop offset="1" stopColor="#4FB3B3" stopOpacity="0" />
          </radialGradient>
        </defs>

        {atmosphere && (
          <g aria-hidden="true">
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#EEF4F7" fillOpacity={s.o} />
            ))}
            <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#g-glow)" />
          </g>
        )}
        <path d={geo.sphere} fill="url(#g-ocean)" stroke="#EEF4F7" strokeOpacity="0.25" />
        <path d={geo.graticule} fill="none" stroke="#EEF4F7" strokeOpacity="0.07" />
        <path d={geo.land} fill="#E9DBBB" fillOpacity="0.9" stroke="#0B1F33" strokeWidth="0.5" />
        {night && <path d={night} fill="#06121F" fillOpacity="0.45" />}

        {/* 1937: planned final leg (amber, dashed) and the hypothesis spur (dotted) */}
        <path d={geo.leg1937} fill="none" stroke="#D9A441" strokeWidth="2.5" strokeDasharray="7 5" />
        <path d={geo.spur} fill="none" stroke="#D9A441" strokeWidth="2.5" strokeDasharray="1 5" strokeLinecap="round" />

        {/* 2026: completed legs solid with a draw-in, the current leg dashed, future legs faint */}
        {LEGS_2026.map((_, i) => {
          const state = i < done ? "done" : active.includes(i) ? "active" : "next";
          return (
            <path
              key={i}
              d={geo.legs2026[i]}
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

        {phoenix && text(phoenix[0], phoenix[1], "Phoenix Islands", { italic: true, opacity: 0.6 })}

        {marker("lae", "amber")}
        {marker("purdue", "signal")}
        {marker("lax", "signal")}
        {marker("nadi", "signal")}
        {marker("tarawa", "signal")}
        {marker("howland", "amber")}
        {marker("nikumaroro", "signal")}

        {howland && (
          <g aria-hidden="true">
            <path
              transform={`translate(${howland[0] - 40} ${howland[1] - 9})`}
              d="M-8 0h16l-3.5 6h-9zM-2 0v-6h5v6M3-4l7-1"
              fill="#D9A441"
              stroke="#D9A441"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {text(howland[0] - 54, howland[1] - 3, "Itasca", { anchor: "end" })}
          </g>
        )}

        {caption(LEG_1937.from, LEG_1937.to, "2,556 mi", 2)}
        {caption(SPUR_1937.from, SPUR_1937.to, "≈400 mi", 3, "end")}
        {caption("tarawa", "nikumaroro", "830 nm", 2)}

        {teamPt && (
          <g transform={`translate(${teamPt[0]} ${teamPt[1]})`}>
            <circle className="globe-ping" r="6" fill="none" stroke="#E8692C" strokeWidth="2.5" />
            <circle r="6" fill="#E8692C" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" aria-label="Zoom out" className={round} disabled={view.zoom <= MIN_ZOOM + 0.01} onClick={() => zoomBy(1 / BUTTON_ZOOM)}>
          −
        </button>
        <button type="button" className={btn} onClick={() => flyTo(HOME, 1000)}>
          Reset view
        </button>
        <button type="button" aria-label="Zoom in" className={round} disabled={view.zoom >= MAX_ZOOM - 0.01} onClick={() => zoomBy(BUTTON_ZOOM)}>
          +
        </button>
      </div>

      <div aria-live="polite" className="mt-4">
        {selectedStop ? (
          <div className="rounded-[var(--radius-card)] bg-navy-2/80 px-4 py-4 ring-1 ring-foam/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-mono font-semibold ${selectedStop.era === "1937" ? "text-amber" : "text-signal"}`}>
                  {selectedStop.era === "1937" ? "1937 flight" : "2026 expedition"}
                </p>
                <h3 className="font-display mt-1 text-[1.35rem] leading-snug font-semibold">{selectedStop.title}</h3>
              </div>
              <button type="button" aria-label="Close" className={round} onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            {legText && <p className="mt-2 font-mono text-foam-muted">{legText}</p>}
            <div className="mt-3 space-y-4">
              {selectedStop.facts.map((id) => (
                <FactText key={id} id={id} tone="dark" />
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" className={`${btn} flex-1`} disabled={selectedIndex <= 0} onClick={() => selectStop(STOPS[selectedIndex - 1])}>
                ← Previous
              </button>
              <button type="button" className={`${btn} flex-1`} disabled={selectedIndex >= STOPS.length - 1} onClick={() => selectStop(STOPS[selectedIndex + 1])}>
                Next stop →
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="min-h-12 w-full rounded-full bg-amber px-6 text-[1.05rem] font-semibold text-navy hover:brightness-110" onClick={() => selectStop(STOPS[0])}>
            ▶ Take the tour
          </button>
        )}
      </div>

      <div className="snap-track -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        {STOPS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={selected === s.key}
            onClick={() => selectStop(s)}
            className={`flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[1.05rem] font-semibold ring-1 ${
              selected === s.key ? "bg-foam text-navy ring-foam" : "bg-foam/10 text-foam ring-foam/20 hover:bg-foam/20"
            }`}
          >
            {PLACES[s.id].short}
            <span className={`font-mono text-[1rem] font-medium ${selected === s.key ? "text-navy/70" : s.era === "1937" ? "text-amber" : "text-signal"}`}>{s.era}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
