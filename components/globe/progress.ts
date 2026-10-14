import { geoInterpolate } from "d3-geo";
import { phaseIndex } from "@/lib/status";
import type { Phase } from "@/lib/types";
import { coords } from "./geo";

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
