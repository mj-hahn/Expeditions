// Maps a Purdue dispatch dateline ("TARAWA, Kiribati") to a spot on the globe.
// Only known places match; anything else returns null so we never guess a pin.
import { geoInterpolate } from "d3-geo";
import { PLACES, type PlaceId } from "@/content/route-points";
import type { Dispatch } from "@/lib/types";

export type DatelinePlace = { key: string; label: string; lon: number; lat: number };

const ALIASES: Record<string, PlaceId> = {
  nikumaroro: "nikumaroro",
  tarawa: "tarawa",
  "west lafayette": "purdue",
  "los angeles": "lax",
  nadi: "nadi",
  fiji: "nadi",
  howland: "howland",
  lae: "lae",
};

function known(name: string): PlaceId | null {
  return ALIASES[name.trim().toLowerCase().replace(/\s+island$/, "")] ?? null;
}

export function datelinePlace(dateline?: string): DatelinePlace | null {
  if (!dateline) return null;
  const head = dateline.split(",")[0].trim();

  const between = /^halfway between (.+) and (.+)$/i.exec(head);
  if (between) {
    const a = known(between[1]);
    const b = known(between[2]);
    if (!a || !b) return null;
    const [lon, lat] = geoInterpolate([PLACES[a].lon, PLACES[a].lat], [PLACES[b].lon, PLACES[b].lat])(0.5);
    return { key: `between-${a}-${b}`, label: `Halfway between ${PLACES[a].short} and ${PLACES[b].short}`, lon, lat };
  }

  const id = known(head);
  return id ? { key: id, label: PLACES[id].name, lon: PLACES[id].lon, lat: PLACES[id].lat } : null;
}

/** The slim, serialisable shape the globe needs for each dispatch that has a known place. */
export type DispatchPin = {
  slug: string;
  title: string;
  publishedAt: string;
  kind: "dispatch";
  place: DatelinePlace;
};

export function dispatchPins(dispatches: Dispatch[]): DispatchPin[] {
  const out: DispatchPin[] = [];
  for (const d of dispatches) {
    if (d.kind !== "dispatch") continue;
    const place = datelinePlace(d.dateline);
    if (place) out.push({ slug: d.slug, title: d.title, publishedAt: d.publishedAt.toISOString(), kind: "dispatch", place });
  }
  return out;
}
