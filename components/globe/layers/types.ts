import type { GeoPath, GeoPermissibleObjects, GeoProjection } from "d3-geo";
import type { ReactNode } from "react";
import type { DispatchPin } from "@/lib/dateline-place";
import type { View } from "../geo";
import type { Labeler } from "../labels";
import type { TourStop } from "../tour";

/** Everything that depends on the status and dispatches, not on where the camera is. */
export type Scene = {
  stops: TourStop[];
  markerStops: TourStop[];
  byPlace: Map<string, DispatchPin[]>;
  selected: TourStop | null;
  legs: { done: number; active: number[] };
  team: [number, number] | null;
  shipAt: [number, number] | null;
  travelled: [number, number][]; // ship track so far
};

/** Paths that only change with the camera (or the land in use); built once per view, not per layer. */
export type Geometry = { sphere: string; graticule: string; land: string; night: string };

export type LayerContext = {
  view: View;
  proj: GeoProjection; // unclipped, for placing points
  path: GeoPath<unknown, GeoPermissibleObjects>; // clipped to the frame, for drawing lines
  /** Cache for work that depends only on the camera (cleared whenever the view changes). Keys are per layer. */
  memo: <T>(key: string, compute: () => T) => T;
  labeler: Labeler;
  geom: Geometry;
  scene: Scene;
};

/**
 * One decoration on the globe. A layer is a pure function of the context (no hooks), called in array order,
 * so label claims happen in the order of `LAYERS`: put a layer before the ones whose labels it outranks.
 */
export type Layer = { id: string; minZoom?: number; render: (ctx: LayerContext) => ReactNode };
