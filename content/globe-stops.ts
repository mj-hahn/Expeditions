// Tappable stops on the journey globe, in story order. Copy comes from the Fact Bank by id.
import type { FactId } from "@/content/facts";
import { PLACES, type PlaceId } from "@/content/route-points";

export type Stop = {
  /** Unique; Nikumaroro appears twice (the 1937 hypothesis and the 2026 visit). */
  key: string;
  id: PlaceId;
  era: "1937" | "2026";
  title: string;
  facts: FactId[];
  /** Globe zoom when this stop is selected. */
  zoom: number;
};

const stop = (key: string, id: PlaceId, era: Stop["era"], facts: FactId[], zoom: number): Stop => ({
  key,
  id,
  era,
  title: PLACES[id].name,
  facts,
  zoom,
});

export const STOPS: Stop[] = [
  stop("lae", "lae", "1937", ["H1", "H2"], 3),
  stop("howland", "howland", "1937", ["H4", "H5", "H8"], 5),
  stop("niku-1937", "nikumaroro", "1937", ["F2", "F5"], 5),
  stop("purdue", "purdue", "2026", ["F7", "F8"], 2.5),
  stop("lax", "lax", "2026", [], 2.5),
  stop("nadi", "nadi", "2026", ["I3"], 3),
  stop("tarawa", "tarawa", "2026", ["F14"], 3.5),
  stop("niku-2026", "nikumaroro", "2026", ["F2", "I1", "F3"], 6),
];
