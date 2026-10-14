// Map coordinates (SPEC §7.4). Approximate; fine for a globe at this scale.
// Note GeoJSON order is [longitude, latitude].

export type Place = { id: string; name: string; short: string; lat: number; lon: number };

export const PLACES = {
  purdue: { id: "purdue", name: "Purdue University Airport, West Lafayette", short: "West Lafayette", lat: 40.41, lon: -86.94 },
  lax: { id: "lax", name: "Los Angeles (LAX)", short: "Los Angeles", lat: 33.94, lon: -118.41 },
  nadi: { id: "nadi", name: "Nadi, Fiji", short: "Nadi", lat: -17.76, lon: 177.44 },
  tarawa: { id: "tarawa", name: "Tarawa, Kiribati", short: "Tarawa", lat: 1.35, lon: 172.93 },
  nikumaroro: { id: "nikumaroro", name: "Nikumaroro", short: "Nikumaroro", lat: -4.67, lon: -174.52 },
  howland: { id: "howland", name: "Howland Island", short: "Howland", lat: 0.81, lon: -176.62 },
  lae: { id: "lae", name: "Lae, Papua New Guinea", short: "Lae", lat: -6.73, lon: 147.0 },
} satisfies Record<string, Place>;

export type PlaceId = keyof typeof PLACES;

/** 2026 expedition legs, in order. `by` is how the team traveled. */
export const LEGS_2026: { from: PlaceId; to: PlaceId; by: "air" | "sea" }[] = [
  { from: "purdue", to: "lax", by: "air" },
  { from: "lax", to: "nadi", by: "air" },
  { from: "nadi", to: "tarawa", by: "air" },
  { from: "tarawa", to: "nikumaroro", by: "sea" },
];

export const LEG_1937 = { from: "lae", to: "howland" } as const;
/** Dotted spur for the Nikumaroro hypothesis: from near Howland to the atoll. */
export const SPUR_1937 = { from: "howland", to: "nikumaroro" } as const;
