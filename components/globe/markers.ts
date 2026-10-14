import type { DispatchPin } from "@/lib/dateline-place";
import { makeProjection, pointVisible, SIZE, TAP_RADIUS, type View } from "./geo";
import type { TourStop } from "./tour";

/** Where a place's dispatch pin sits: on the side away from the stop's label, so it never covers the dot. */
export function pinPoint(key: string, lonlat: [number, number], proj: (p: [number, number]) => [number, number] | null, zoom: number): [number, number] | null {
  const p = proj(lonlat);
  if (!p) return null;
  if (key.startsWith("between-")) return [p[0], p[1] - 18];
  const left = key === "purdue" || key === "howland" || (key === "nikumaroro" && zoom < 2);
  return [p[0] + (left ? -18 : 18), p[1] - 16];
}

/** The nearest stop (dot or pin) within tap range of a screen point, or null. */
export function hitStop(stops: TourStop[], byPlace: Map<string, DispatchPin[]>, v: View, rect: DOMRect, clientX: number, clientY: number): TourStop | null {
  const u = rect.width / SIZE;
  const p = makeProjection(v, false);
  let best: { stop: TourStop; d: number } | null = null;
  const consider = (stop: TourStop, at: [number, number] | null) => {
    if (!at) return;
    const d = Math.hypot(at[0] * u + rect.left - clientX, at[1] * u + rect.top - clientY);
    if (d <= TAP_RADIUS && (!best || d < best.d)) best = { stop, d };
  };
  for (const stop of stops) {
    if (stop.era === "1937" && stop.placeKey === "nikumaroro") continue;
    const lonlat: [number, number] = [stop.lon, stop.lat];
    if (!pointVisible(lonlat, v)) continue;
    consider(stop, p(lonlat));
    if (byPlace.has(stop.placeKey)) consider(stop, pinPoint(stop.placeKey, lonlat, p, v.zoom));
  }
  return (best as { stop: TourStop } | null)?.stop ?? null;
}
