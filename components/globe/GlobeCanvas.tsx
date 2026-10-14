"use client";

import { geoCircle, geoGraticule10, geoPath } from "d3-geo";
import { memo, useMemo, type RefObject } from "react";
import type { DispatchPin } from "@/lib/dateline-place";
import { subsolarPoint } from "@/lib/sun";
import type { Phase } from "@/lib/types";
import type { VoyageStep } from "@/lib/voyage";
import { cullLand, DETAIL_ZOOM, FINE_GRATICULE_ZOOM, fineGraticule, makeProjection, SIZE, type LandPiece, type View } from "./geo";
import { createLabeler } from "./labels";
import { LAND_110 } from "./land";
import { LAYERS } from "./layers";
import type { LayerContext, Scene } from "./layers/types";
import { legProgress, teamLocation } from "./progress";
import { markerStops, type TourStop } from "./tour";
import { useMinute } from "./useMinute";
import type { Replay } from "./useReplay";

const GRATICULE = geoGraticule10();

type Props = {
  view: View;
  /** The camera is moving (or only just stopped): draw cheaply. */
  animating: boolean;
  land50: LandPiece[] | null;
  phase: Phase;
  stops: TourStop[];
  byPlace: Map<string, DispatchPin[]>;
  track: VoyageStep[];
  selectedKey: string | null;
  replay: Replay | null;
  svgRef: RefObject<SVGSVGElement | null>;
  handlers: Pick<React.SVGProps<SVGSVGElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;
};

/** The SVG globe. Memoized: it re-renders on camera or replay changes, never because the HTML around it did. */
export const GlobeCanvas = memo(function GlobeCanvas({ view, animating, land50, phase, stops, byPlace, track, selectedKey, replay, svgRef, handlers }: Props) {
  const minute = useMinute();
  const land = !animating && view.zoom >= DETAIL_ZOOM && land50 ? land50 : LAND_110;

  const camera = useMemo(() => {
    const proj = makeProjection(view, false);
    const path = geoPath(makeProjection(view, true));
    // Per-camera cache for layers: work that depends only on the view runs once, not on every replay frame.
    const cache = new Map<string, unknown>();
    const memo = <T,>(key: string, compute: () => T): T => {
      if (!cache.has(key)) cache.set(key, compute());
      return cache.get(key) as T;
    };
    return {
      proj,
      path,
      memo,
      sphere: geoPath(proj)({ type: "Sphere" }) ?? "",
      graticule: path(view.zoom >= FINE_GRATICULE_ZOOM ? fineGraticule(view) : GRATICULE) ?? "",
      land: path({ type: "FeatureCollection", features: cullLand(land, view) }) ?? "",
    };
  }, [view, land]);

  const night = useMemo(() => {
    if (minute === null) return "";
    const [lon, lat] = subsolarPoint(new Date(minute * 60000));
    return geoPath(makeProjection(view, true))(geoCircle().center([lon + 180, -lat]).radius(90)()) ?? "";
  }, [minute, view]);

  const markers = useMemo(() => markerStops(stops), [stops]);
  const scene = useMemo<Scene>(() => {
    const last = track.at(-1);
    const travelled: [number, number][] = track.map((t) => [t.lon, t.lat]);
    if (replay && replay.index < track.length - 1) travelled.splice(replay.index + 1, track.length, replay.pos);
    return {
      stops,
      markerStops: markers,
      byPlace,
      selected: stops.find((s) => s.key === selectedKey) ?? null,
      legs: legProgress(phase),
      team: teamLocation(phase),
      shipAt: replay?.pos ?? (last ? [last.lon, last.lat] : null),
      travelled,
    };
  }, [stops, markers, byPlace, track, selectedKey, replay, phase]);

  const ctx: LayerContext = {
    view,
    proj: camera.proj,
    path: camera.path,
    memo: camera.memo,
    labeler: createLabeler(),
    geom: { sphere: camera.sphere, graticule: camera.graticule, land: camera.land, night },
    scene,
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block h-auto w-full max-w-[600px] cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
      role="img"
      aria-label="Globe showing Earhart's planned 1937 route from Lae toward Howland Island, the Nikumaroro hypothesis, and the 2026 expedition route from West Lafayette through Los Angeles, Nadi and Tarawa to Nikumaroro. Drag to rotate, pinch or use the zoom buttons to zoom, and tap a dot or use the stop buttons below to learn about that stop."
      shapeRendering={animating ? "optimizeSpeed" : undefined}
      {...handlers}
    >
      {LAYERS.map((l) => (view.zoom >= (l.minZoom ?? 0) ? <g key={l.id}>{l.render(ctx)}</g> : null))}
    </svg>
  );
});
