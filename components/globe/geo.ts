import { geoCentroid, geoDistance, geoGraticule, geoOrthographic } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, Polygon, Position } from "geojson";
import { PLACES, type PlaceId } from "@/content/route-points";

// Orthographic globe geometry shared by the canvas, the gestures and the hit test.
export const SIZE = 360;
export const R = SIZE / 2 - 8;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 10;
export const BUTTON_ZOOM = 1.8;
export const TAP_SLOP = 8; // screen px a finger may wander and still count as a tap
export const TAP_RADIUS = 24; // screen px from a marker that still hits it
export const DETAIL_ZOOM = 2.5; // switch to the 50m coastline
export const FINE_GRATICULE_ZOOM = 4;
export const SETTLE_MS = 150; // idle time before the globe counts as settled and may draw fine detail

export type View = { lon: number; lat: number; zoom: number }; // lon/lat are the d3 rotation, not the centre
export const HOME: View = { lon: -PLACES.nikumaroro.lon, lat: -PLACES.nikumaroro.lat + 8, zoom: 1 };
export const START: View = { lon: -PLACES.purdue.lon, lat: -25, zoom: 1 };

export const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
export const clampLat = (l: number) => Math.max(-80, Math.min(80, l));

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function makeProjection(v: View, clip: boolean) {
  const p = geoOrthographic().scale(R * v.zoom).translate([SIZE / 2, SIZE / 2]).rotate([v.lon, v.lat]).clipAngle(90).precision(0.3);
  // Zoomed in, most of the globe is off-screen; clipping to the frame keeps paths small.
  return clip ? p.clipExtent([[-12, -12], [SIZE + 12, SIZE + 12]]) : p;
}

export const coords = (id: PlaceId): [number, number] => [PLACES[id].lon, PLACES[id].lat];
export const viewCentre = (v: View): [number, number] => [-v.lon, -v.lat];
export const pointVisible = (pt: [number, number], v: View) => geoDistance(pt, viewCentre(v)) < Math.PI / 2 - 0.05;
export const isVisible = (id: PlaceId, v: View) => pointVisible(coords(id), v);

/** One land polygon with a bounding cap, so whole polygons can be skipped without projecting them. */
export type LandPiece = { feature: Feature<Polygon>; centre: [number, number]; radius: number };

const polygonsOf = (g: Geometry): Position[][][] =>
  g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : g.type === "GeometryCollection" ? g.geometries.flatMap(polygonsOf) : [];

const geometriesOf = (land: FeatureCollection<Geometry> | Feature<Geometry>) => (land.type === "FeatureCollection" ? land.features.map((f) => f.geometry) : [land.geometry]);

/** Polygon rings of a land dataset, ready for `landPiece`. */
export const landPolygons = (land: FeatureCollection<Geometry> | Feature<Geometry>) => geometriesOf(land).flatMap(polygonsOf);

export function landPiece(coordinates: Position[][]): LandPiece {
  const feature: Feature<Polygon> = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates } };
  const centre = geoCentroid(feature);
  let radius = 0;
  for (const pt of coordinates[0]) radius = Math.max(radius, geoDistance(centre, pt as [number, number]));
  return { feature, centre, radius };
}

/** Split a land dataset into per-polygon pieces. Do this once per dataset, never per frame. */
export const prepareLand = (land: FeatureCollection<Geometry> | Feature<Geometry>): LandPiece[] => landPolygons(land).map(landPiece);

/** Angular distance from the view centre that can still reach the square frame. */
export function visibleAngle(zoom: number) {
  if (zoom <= 1.4) return Math.PI / 2;
  return Math.min(Math.PI / 2, Math.asin(Math.min(1, (SIZE * 0.75) / (R * zoom)))) + 0.05;
}

/** Pieces that could touch the frame; the rest are not worth projecting. */
export function cullLand(pieces: LandPiece[], v: View): Feature<Polygon>[] {
  const c = viewCentre(v);
  const limit = visibleAngle(v.zoom);
  const out: Feature<Polygon>[] = [];
  for (const p of pieces) if (geoDistance(p.centre, c) - p.radius < limit) out.push(p.feature);
  return out;
}

/** The 2° graticule limited to what the frame can show; the full one is 10x the work and mostly off-screen. */
export function fineGraticule(v: View) {
  const [lon, lat] = viewCentre(v);
  const deg = (visibleAngle(v.zoom) * 180) / Math.PI;
  const span = Math.min(180, deg / Math.max(0.17, Math.cos((lat * Math.PI) / 180))); // meridians converge toward the poles
  // Longitudes may run past ±180; the projection wraps them.
  return geoGraticule().step([2, 2]).extent([[lon - span, Math.max(-90, lat - deg)], [lon + span, Math.min(90, lat + deg)]])();
}
