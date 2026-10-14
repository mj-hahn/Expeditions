"use client";

import { geoCircle, geoDistance, geoGraticule, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import Link from "next/link";
import { FactText } from "@/components/FactText";
import type { FactId } from "@/content/facts";
import { STOPS } from "@/content/globe-stops";
import { LEG_1937, LEGS_2026, PLACES, SPUR_1937, type PlaceId } from "@/content/route-points";
import type { DispatchPin } from "@/lib/dateline-place";
import { subsolarPoint } from "@/lib/sun";
import { phaseIndex } from "@/lib/status";
import type { Phase } from "@/lib/types";
import { formatShortDate } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { voyageTrack } from "@/lib/voyage";

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

const SHIP_D = "M-8 0h16l-3.5 6h-9zM-2 0v-6h5v6z";
const LABEL_H = 20;

/** A stop as the globe uses it: a story stop, or a dispatch place that has no stop of its own. */
type TourStop = {
  key: string;
  placeKey: string; // PlaceId, or a "between-…" dateline key
  era: "1937" | "2026";
  title: string;
  short: string;
  facts: FactId[];
  zoom: number;
  lon: number;
  lat: number;
};
const STORY_STOPS: TourStop[] = STOPS.map((s) => ({
  key: s.key,
  placeKey: s.id,
  era: s.era,
  title: s.title,
  short: PLACES[s.id].short,
  facts: s.facts,
  zoom: s.zoom,
  lon: PLACES[s.id].lon,
  lat: PLACES[s.id].lat,
}));

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

/** Where a place's dispatch pin sits: on the side away from the stop's label, so it never covers the dot. */
function pinPoint(key: string, lonlat: [number, number], proj: (p: [number, number]) => [number, number] | null, zoom: number): [number, number] | null {
  const p = proj(lonlat);
  if (!p) return null;
  if (key.startsWith("between-")) return [p[0], p[1] - 18];
  const left = key === "purdue" || key === "howland" || (key === "nikumaroro" && zoom < 2);
  return [p[0] + (left ? -18 : 18), p[1] - 16];
}

function legLabel(id: string): string | null {
  const leg = LEGS_2026.find((l) => l.from === id);
  if (!leg) return null;
  return `${leg.by === "air" ? "Flight" : "Sea"} leg: ${PLACES[leg.from].short} → ${PLACES[leg.to].short}`;
}

export default function JourneyGlobe({ phase, pins }: { phase: Phase; pins: DispatchPin[] }) {
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
  const replayRaf = useRef<number | null>(null);
  const [replay, setReplay] = useState<{ pos: [number, number]; index: number } | null>(null);

  const commit = useCallback((v: View, setGoal = true) => {
    viewRef.current = v;
    if (setGoal) goal.current = v;
    setView(v);
  }, []);

  const cancelReplay = useCallback(() => {
    if (replayRaf.current) cancelAnimationFrame(replayRaf.current);
    replayRaf.current = null;
    setReplay(null);
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
    return () => {
      stopAnim();
      if (replayRaf.current) cancelAnimationFrame(replayRaf.current);
    };
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
      cancelReplay();
      const v = viewRef.current;
      commit({ ...v, zoom: clampZoom(v.zoom * Math.exp(-e.deltaY * 0.01)) });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [commit, cancelReplay]);

  const geo = useMemo(() => {
    const v: View = { lon: view.lon, lat: view.lat, zoom: view.zoom };
    const proj = makeProjection(v, false);
    const path = geoPath(makeProjection(v, true));
    const land = view.zoom >= DETAIL_ZOOM && land50 ? land50 : LAND_110;
    return {
      proj,
      path,
      sphere: geoPath(proj)({ type: "Sphere" }) ?? "",
      graticule: path(view.zoom >= FINE_GRATICULE_ZOOM ? GRATICULE_FINE : GRATICULE) ?? "",
      land: path(land) ?? "",
      leg1937: path(line(LEG_1937.from, LEG_1937.to)) ?? "",
      spur: path(line(SPUR_1937.from, SPUR_1937.to)) ?? "",
      legs2026: LEGS_2026.map((l) => path(line(l.from, l.to)) ?? ""),
    };
  }, [view.lon, view.lat, view.zoom, land50]);
  const { proj, path: pathClip } = geo;

  const night = useMemo(() => {
    if (minute === null) return "";
    const [lon, lat] = subsolarPoint(new Date(minute * 60000));
    const circle = geoCircle().center([lon + 180, -lat]).radius(90)();
    return geoPath(makeProjection({ lon: view.lon, lat: view.lat, zoom: view.zoom }, true))(circle) ?? "";
  }, [minute, view.lon, view.lat, view.zoom]);

  const { done, active } = legProgress(phase);
  const team = teamLocation(phase);
  const zoom = view.zoom;

  // Dispatches by place (newest first), the ship's track, and any at-sea stops that have a dispatch.
  const byPlace = useMemo(() => {
    const m = new Map<string, DispatchPin[]>();
    for (const p of [...pins].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))) {
      m.set(p.place.key, [...(m.get(p.place.key) ?? []), p]);
    }
    return m;
  }, [pins]);
  const track = useMemo(() => voyageTrack(pins), [pins]);
  const stops = useMemo(() => {
    const atSea: TourStop[] = [];
    for (const step of track) {
      if (!step.key.startsWith("between-") || atSea.some((s) => s.key === step.key)) continue;
      const place = byPlace.get(step.key)![0].place;
      atSea.push({ key: step.key, placeKey: step.key, era: "2026", title: place.label, short: "Halfway", facts: [], zoom: 4, lon: place.lon, lat: place.lat });
    }
    const i = STORY_STOPS.findIndex((s) => s.key === "niku-2026");
    return [...STORY_STOPS.slice(0, i), ...atSea, ...STORY_STOPS.slice(i)];
  }, [track, byPlace]);

  const selectedStop = stops.find((s) => s.key === selected) ?? null;
  const selectedIndex = selectedStop ? stops.indexOf(selectedStop) : -1;

  const selectStop = (stop: TourStop) => {
    cancelReplay();
    setSelected(stop.key);
    flyTo({ lon: -stop.lon, lat: -stop.lat, zoom: stop.zoom }, 1400);
  };

  const resetView = () => {
    cancelReplay();
    setSelected(null);
    flyTo(HOME, 1000);
  };

  const shipAt = replay?.pos ?? (track.length ? ([track.at(-1)!.lon, track.at(-1)!.lat] as [number, number]) : null);
  const replayStep = replay ? track[replay.index] : null;
  const canReplay = track.length >= 2;

  // Fly to frame the Tarawa → Nikumaroro leg, then move the ship stop to stop (positions are dispatch datelines only).
  const startReplay = () => {
    if (!canReplay) return;
    cancelReplay();
    const last = track.length - 1;
    const pt = (i: number): [number, number] => [track[i].lon, track[i].lat];
    const mid = geoInterpolate(coords("tarawa"), coords("nikumaroro"))(0.5);
    flyTo({ lon: -mid[0], lat: -mid[1], zoom: 4 }, 1400);
    if (prefersReducedMotion()) {
      setReplay({ pos: pt(last), index: last });
      return;
    }
    setReplay({ pos: pt(0), index: 0 });
    const LEAD = 1400;
    const SEGMENT = 1500;
    const t0 = performance.now();
    const step = (t: number) => {
      const el = t - t0 - LEAD;
      if (el < 0) {
        replayRaf.current = requestAnimationFrame(step);
        return;
      }
      const s = Math.min(last - 1, Math.floor(el / SEGMENT));
      const k = Math.min(1, (el - s * SEGMENT) / SEGMENT);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const finished = el >= last * SEGMENT;
      setReplay({ pos: finished ? pt(last) : geoInterpolate(pt(s), pt(s + 1))(e), index: finished ? last : s + (k >= 1 ? 1 : 0) });
      replayRaf.current = finished ? null : requestAnimationFrame(step);
    };
    replayRaf.current = requestAnimationFrame(step);
  };

  // Ship track drawn so far: every dispatch position, or up to the ship while replaying.
  const travelled: [number, number][] = track.map((t) => [t.lon, t.lat]);
  if (replay && replay.index < track.length - 1) travelled.splice(replay.index + 1, track.length, replay.pos);

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
    cancelReplay();
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

  const hitTest = (clientX: number, clientY: number): TourStop | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const u = rect.width / SIZE;
    const v = viewRef.current;
    const p = makeProjection(v, false);
    let best: { stop: TourStop; d: number } | null = null;
    const consider = (stop: TourStop, at: [number, number] | null) => {
      if (!at) return;
      const d = Math.hypot(at[0] * u + rect.left - clientX, at[1] * u + rect.top - clientY);
      if (d <= TAP_RADIUS && (!best || d < best.d)) best = { stop, d };
    };
    for (const stop of stops) {
      if (stop.era === "1937" && stop.placeKey === "nikumaroro") continue; // the 2026 stop owns Nikumaroro taps
      const lonlat: [number, number] = [stop.lon, stop.lat];
      if (!pointVisible(lonlat, v)) continue;
      consider(stop, p(lonlat));
      if (byPlace.has(stop.placeKey)) consider(stop, pinPoint(stop.placeKey, lonlat, p, v.zoom));
    }
    return (best as { stop: TourStop } | null)?.stop ?? null;
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
    cancelReplay();
    const g = goal.current;
    flyTo({ ...g, zoom: clampZoom(g.zoom * factor) }, 350);
  };

  // --- drawing ---
  const showAllLabels = zoom >= 2;

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

  // Text boxes already on the globe this frame, so captions can step aside instead of overprinting.
  const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const claim = (x: number, y: number, label: string, anchor: "start" | "middle" | "end", force = false) => {
    const w = label.length * 10.5;
    const x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    const box = { x0, x1: x0 + w, y0: y - LABEL_H + 4, y1: y + 4 };
    if (!force && boxes.some((o) => box.x0 < o.x1 && box.x1 > o.x0 && box.y0 < o.y1 && box.y1 > o.y0)) return false;
    boxes.push(box);
    return true;
  };

  const labelFor = (key: string): { dx: number; dy: number; anchor: "start" | "end" } | null => {
    if (key === "howland") return { dx: 9, dy: -6, anchor: "start" };
    if (key === "nikumaroro") return showAllLabels ? { dx: -10, dy: 5, anchor: "end" } : { dx: 10, dy: 20, anchor: "start" };
    if (key.startsWith("between-") || !showAllLabels) return null;
    if (key === "purdue") return { dx: 9, dy: 5, anchor: "start" };
    return { dx: -9, dy: 5, anchor: "end" }; // lae, lax, nadi, tarawa
  };

  const markerStops = stops.filter((st, i) => !(st.era === "1937" && st.placeKey === "nikumaroro") && stops.findIndex((o) => o.placeKey === st.placeKey && !(o.era === "1937" && o.placeKey === "nikumaroro")) === i);
  const marker = (stop: TourStop) => {
    const lonlat: [number, number] = [stop.lon, stop.lat];
    if (!pointVisible(lonlat, view)) return null;
    const p = proj(lonlat);
    if (!p) return null;
    const lab = labelFor(stop.placeKey);
    const amber = stop.placeKey === "lae" || stop.placeKey === "howland";
    if (lab) claim(p[0] + lab.dx, p[1] + lab.dy, stop.short, lab.anchor, true);
    return (
      <g key={stop.placeKey}>
        <circle cx={p[0]} cy={p[1]} r={lab ? 5.5 : 4} fill={amber ? "#D9A441" : "#E8692C"} stroke="#0B1F33" strokeWidth="2" />
        {lab && text(p[0] + lab.dx, p[1] + lab.dy, stop.short, { anchor: lab.anchor })}
      </g>
    );
  };

  const pin = (stop: TourStop) => {
    const list = byPlace.get(stop.placeKey);
    if (!list) return null;
    const lonlat: [number, number] = [stop.lon, stop.lat];
    if (!pointVisible(lonlat, view)) return null;
    const at = pinPoint(stop.placeKey, lonlat, proj, zoom);
    if (!at) return null;
    boxes.push({ x0: at[0] - 12, x1: at[0] + 12, y0: at[1] - 12, y1: at[1] + 12 });
    return (
      <g key={`pin-${stop.placeKey}`}>
        <rect x={at[0] - 12} y={at[1] - 12} width="24" height="24" rx="6" fill="#fff" stroke="#0B1F33" strokeWidth="2" />
        <text x={at[0]} y={at[1] + 6} textAnchor="middle" fontSize="17" fontWeight="700" fontFamily="var(--font-mono)" fill="#0B1F33">
          {list.length}
        </text>
      </g>
    );
  };

  const caption = (a: PlaceId, b: PlaceId, s: string, minZoom: number, where: "above" | "right" | "below") => {
    if (zoom < minZoom) return null;
    const m = geoInterpolate(coords(a), coords(b))(0.5);
    if (!pointVisible(m, view)) return null;
    const p = proj(m);
    if (!p) return null;
    const anchor = where === "right" ? "start" : "middle";
    const x = p[0] + (where === "right" ? 10 : 0);
    const y = p[1] + (where === "above" ? -14 : where === "below" ? 22 : 5);
    if (!claim(x, y, s, anchor)) return null;
    return text(x, y, s, { anchor, mono: true, fill: "#E9DBBB" });
  };

  const howland = zoom >= 4 && isVisible("howland", view) ? proj(coords("howland")) : null;
  const phoenix = zoom >= 4 && pointVisible([-172, -3.5], view) ? proj([-172, -3.5]) : null;
  const teamPt = team && pointVisible(team, view) ? proj(team) : null;
  const shipPt = shipAt && pointVisible(shipAt, view) ? proj(shipAt) : null;
  const travelPath = travelled.length > 1 ? (pathClip({ type: "LineString", coordinates: travelled }) ?? "") : "";
  // Itasca sits just above Howland, its label left of the glyph (Howland's own label is to the right).
  if (howland) claim(howland[0] - 12, howland[1] - 15, "Itasca", "end", true);
  // The ship label is centred under the glyph, nudged to stay inside the frame; it outranks "Phoenix Islands".
  const SHIP_LABEL = "Marin Mainiku";
  const shipHalf = (SHIP_LABEL.length * 10.5) / 2 + 2;
  const shipLabel =
    zoom >= 3 && shipPt ? { x: Math.max(shipHalf, Math.min(SIZE - shipHalf, shipPt[0])), y: shipPt[1] + 38 } : null;
  if (shipLabel) claim(shipLabel.x, shipLabel.y, SHIP_LABEL, "middle", true);
  const showPhoenix = phoenix ? claim(phoenix[0], phoenix[1], "Phoenix Islands", "start") : false;

  const atmosphere = zoom <= 1.2;
  const btn = "min-h-12 whitespace-nowrap rounded-full bg-foam/10 px-6 text-[1.05rem] font-semibold text-foam ring-1 ring-foam/20 hover:bg-foam/20 disabled:opacity-40 disabled:hover:bg-foam/10";
  const round = "grid size-12 shrink-0 place-items-center rounded-full bg-foam/10 text-[1.6rem] leading-none font-semibold text-foam ring-1 ring-foam/20 hover:bg-foam/20 disabled:opacity-40 disabled:hover:bg-foam/10";
  const voyageStop = selectedStop?.era === "2026" && (selectedStop.placeKey === "tarawa" || selectedStop.placeKey === "nikumaroro" || selectedStop.placeKey.startsWith("between-"));
  const replayButton =
    canReplay && (!selectedStop || voyageStop) ? (
      <button type="button" className={`${btn} w-full`} onClick={startReplay}>
        ⛴ Replay the voyage
      </button>
    ) : null;
  const legText = selectedStop?.era === "2026" ? legLabel(selectedStop.placeKey) : null;

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

        {phoenix && showPhoenix && text(phoenix[0], phoenix[1], "Phoenix Islands", { italic: true, opacity: 0.6 })}

        {travelPath && <path d={travelPath} fill="none" stroke="#E8692C" strokeWidth="3.5" strokeLinecap="round" />}

        {selectedStop && pointVisible([selectedStop.lon, selectedStop.lat], view) && (
          <circle
            cx={proj([selectedStop.lon, selectedStop.lat])?.[0]}
            cy={proj([selectedStop.lon, selectedStop.lat])?.[1]}
            r="12"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
          />
        )}
        {markerStops.map(marker)}

        {howland && (
          <g aria-hidden="true">
            <path
              transform={`translate(${howland[0]} ${howland[1] - 20})`}
              d="M-8 0h16l-3.5 6h-9zM-2 0v-6h5v6M3-4l7-1"
              fill="#D9A441"
              stroke="#D9A441"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {text(howland[0] - 12, howland[1] - 15, "Itasca", { anchor: "end" })}
          </g>
        )}

        {shipPt && (
          <g>
            <path transform={`translate(${shipPt[0]} ${shipPt[1] + 14})`} d={SHIP_D} fill="#E8692C" stroke="#0B1F33" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" />
            {shipLabel && text(shipLabel.x, shipLabel.y, SHIP_LABEL, { anchor: "middle" })}
          </g>
        )}
        {markerStops.map(pin)}

        {caption(LEG_1937.from, LEG_1937.to, "2,556 mi", 2, "above")}
        {caption(SPUR_1937.from, SPUR_1937.to, "≈400 mi", 3, "right")}
        {caption("tarawa", "nikumaroro", "830 nm", 2, "below")}

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
        <button type="button" className={btn} onClick={resetView}>
          Reset view
        </button>
        <button type="button" aria-label="Zoom in" className={round} disabled={view.zoom >= MAX_ZOOM - 0.01} onClick={() => zoomBy(BUTTON_ZOOM)}>
          +
        </button>
      </div>

      <div aria-live="polite">
        {replayStep && (
          <p className="mt-4 rounded-[var(--radius-card)] bg-navy-2/80 px-4 py-3 ring-1 ring-foam/10">
            <span className="font-mono font-semibold text-signal">{formatShortDate(new Date(replayStep.publishedAt), "America/Toronto")}</span>
            {" · "}
            <Link href={`/dispatch/${replayStep.slug}`} className="text-amber underline">
              {replayStep.title}
            </Link>
          </p>
        )}
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
            {selectedStop.era === "2026" && byPlace.has(selectedStop.placeKey) && (
              <div className="mt-4">
                <p className="font-mono font-semibold text-foam-muted">Dispatches written here</p>
                <ul className="mt-2 space-y-2">
                  {byPlace.get(selectedStop.placeKey)!.map((d) => (
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
            <div className="mt-4 flex gap-3">
              <button type="button" className={`${btn} flex-1`} disabled={selectedIndex <= 0} onClick={() => selectStop(stops[selectedIndex - 1])}>
                ← Back
              </button>
              <button type="button" className={`${btn} flex-1`} disabled={selectedIndex >= stops.length - 1} onClick={() => selectStop(stops[selectedIndex + 1])}>
                Next →
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="min-h-12 w-full rounded-full bg-amber px-6 text-[1.05rem] font-semibold text-navy hover:brightness-110" onClick={() => selectStop(stops[0])}>
            ▶ Take the tour
          </button>
        )}
        {!selectedStop && replayButton && <div className="mt-3">{replayButton}</div>}
      </div>

      <div className="snap-track -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        {stops.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={selected === s.key}
            onClick={() => selectStop(s)}
            className={`flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[1.05rem] font-semibold ring-1 ${
              selected === s.key ? "bg-foam text-navy ring-foam" : "bg-foam/10 text-foam ring-foam/20 hover:bg-foam/20"
            }`}
          >
            {s.short}
            <span className={`font-mono text-[1rem] font-medium ${selected === s.key ? "text-navy/70" : s.era === "1937" ? "text-amber" : "text-signal"}`}>{s.era}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
