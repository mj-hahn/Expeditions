import type { FactId } from "@/content/facts";
import { STOPS } from "@/content/globe-stops";
import { PLACES } from "@/content/route-points";
import type { DispatchPin } from "@/lib/dateline-place";
import type { VoyageStep } from "@/lib/voyage";

/** A stop as the globe uses it: a story stop, or a dispatch place that has no stop of its own. */
export type TourStop = {
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

export const STORY_STOPS: TourStop[] = STOPS.map((s) => ({
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

/** Dispatches by place, newest first. */
export function groupPins(pins: DispatchPin[]): Map<string, DispatchPin[]> {
  const m = new Map<string, DispatchPin[]>();
  for (const p of [...pins].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))) {
    m.set(p.place.key, [...(m.get(p.place.key) ?? []), p]);
  }
  return m;
}

/** Story stops in order, with any at-sea dispatch places slotted in just before the 2026 Nikumaroro visit. */
export function buildTourStops(pins: DispatchPin[], track: VoyageStep[]): TourStop[] {
  const byPlace = groupPins(pins);
  const atSea: TourStop[] = [];
  for (const step of track) {
    if (!step.key.startsWith("between-") || atSea.some((s) => s.key === step.key)) continue;
    const place = byPlace.get(step.key)![0].place;
    atSea.push({ key: step.key, placeKey: step.key, era: "2026", title: place.label, short: "Halfway", facts: [], zoom: 4, lon: place.lon, lat: place.lat });
  }
  const i = STORY_STOPS.findIndex((s) => s.key === "niku-2026");
  return [...STORY_STOPS.slice(0, i), ...atSea, ...STORY_STOPS.slice(i)];
}

const ownsNikumaroro = (s: TourStop) => !(s.era === "1937" && s.placeKey === "nikumaroro"); // the 2026 stop owns Nikumaroro taps and dots

/** One map marker per place; the two Nikumaroro stops share the 2026 one. */
export function markerStops(stops: TourStop[]): TourStop[] {
  return stops.filter((st, i) => ownsNikumaroro(st) && stops.findIndex((o) => o.placeKey === st.placeKey && ownsNikumaroro(o)) === i);
}
