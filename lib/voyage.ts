// The Marin Mainiku's track, from Purdue's dispatch datelines only (never interpolated by time).
import type { DispatchPin } from "@/lib/dateline-place";

export type VoyageStep = { key: string; lon: number; lat: number; slug: string; title: string; publishedAt: string };

const onVoyage = (key: string) => key === "tarawa" || key === "nikumaroro" || key.startsWith("between-");

/**
 * Positions along the voyage in the order dispatches were published. Several dispatches from
 * the same place in a row collapse to the first (the arrival). The last step is where the ship is now.
 */
export function voyageTrack(pins: DispatchPin[]): VoyageStep[] {
  const steps: VoyageStep[] = [];
  const sorted = pins.filter((p) => onVoyage(p.place.key)).sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  for (const p of sorted) {
    if (steps.at(-1)?.key === p.place.key) continue;
    steps.push({ key: p.place.key, lon: p.place.lon, lat: p.place.lat, slug: p.slug, title: p.title, publishedAt: p.publishedAt });
  }
  return steps;
}
