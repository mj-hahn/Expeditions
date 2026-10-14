// Manual status model (SPEC §6). content/status.json is the source of truth.

import raw from "@/content/status.json";
import {
  PHASES,
  VERDICTS,
  type Phase,
  type Status,
  type Verdict,
} from "@/lib/types";
import { islandDayNumber } from "@/lib/time";

export const PHASE_INFO: Record<
  Phase,
  { label: string; sentence: string; explainer: string; when?: string }
> = {
  departed: {
    label: "Left Purdue",
    sentence: "The team has left Purdue",
    explainer: "Team leaves Purdue",
    when: "Oct 2",
  },
  tarawa: {
    label: "Tarawa",
    sentence: "Staging in Tarawa, Kiribati",
    explainer: "Staging in Tarawa, Kiribati",
    when: "Oct 6–7",
  },
  at_sea: {
    label: "At sea",
    sentence: "At sea on the six-day voyage",
    explainer: "Six-day voyage",
    when: "Oct 7–12",
  },
  arrived: {
    label: "Arrived",
    sentence: "Arrived at Nikumaroro",
    explainer: "Arrived at Nikumaroro",
    when: "Oct 12",
  },
  base_camp: {
    label: "Base camp",
    sentence: "Landing gear ashore and cutting a trail to the lagoon",
    explainer: "Landing gear ashore, cutting a trail to the lagoon",
    when: "Oct 13",
  },
  surface_survey: {
    label: "Surface survey",
    sentence: "Walking the sand spit for surface artifacts",
    explainer: "Walking the sand spit for surface artifacts",
  },
  magnetometer: {
    label: "Magnetometer",
    sentence: "Sweeping the lagoon with a magnetometer",
    explainer: "A sensitive metal detector. Steel cables in the Electra would show up.",
  },
  sonar: {
    label: "Sonar",
    sentence: "Scanning the lagoon with sonar",
    explainer: "Sound waves map what's under the sediment.",
  },
  hydroprobe: {
    label: "Hydroprobe",
    sentence: "Probing down to touch the object",
    explainer: "A rod pushed down to touch the object and gauge its depth, angle and surface.",
  },
  dredge: {
    label: "Dredging",
    sentence: "Dredging away sediment for a look",
    explainer: "A water-powered pump clears sediment so they can see it.",
  },
  verdict: {
    label: "Verdict",
    sentence: "The verdict is in",
    explainer: "Verdict announced",
  },
  return: {
    label: "Sailing home",
    sentence: "Sailing home",
    explainer: "Sailing home",
  },
};

export const VERDICT_INFO: Record<
  Verdict,
  { label: string; tone: "sand" | "teal" | "gold" | "slate" }
> = {
  investigating: { label: "Still investigating", tone: "sand" },
  promising: { label: "Promising signs", tone: "teal" },
  confirmed_electra: { label: "It's the Electra", tone: "gold" },
  not_electra: { label: "Not the Electra", tone: "slate" },
  inconclusive: { label: "Inconclusive", tone: "slate" },
};

const DEFAULT_PHASE: Phase = "arrived";
const DEFAULT_VERDICT: Verdict = "investigating";

function textOrNull(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? null : t;
  }
  console.warn(`status: invalid ${field}, using null`);
  return null;
}

export function parseStatus(input: unknown): Status {
  const obj: Record<string, unknown> =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (obj !== input) console.warn("status: input is not an object");

  let phase = DEFAULT_PHASE;
  if (PHASES.includes(obj.phase as Phase)) {
    phase = obj.phase as Phase;
  } else {
    console.warn(`status: invalid phase ${JSON.stringify(obj.phase)}, using "${DEFAULT_PHASE}"`);
  }

  let verdict = DEFAULT_VERDICT;
  if (VERDICTS.includes(obj.verdict as Verdict)) {
    verdict = obj.verdict as Verdict;
  } else {
    console.warn(
      `status: invalid verdict ${JSON.stringify(obj.verdict)}, using "${DEFAULT_VERDICT}"`,
    );
  }

  const headline = textOrNull(obj.headline, "headline");
  const note = textOrNull(obj.note, "note");
  const noteUrl = typeof obj.noteUrl === "string" ? obj.noteUrl : null;

  let updatedAt = "";
  if (typeof obj.updatedAt === "string") updatedAt = obj.updatedAt;
  else if (obj.updatedAt !== undefined) console.warn("status: invalid updatedAt");

  if ((verdict === "confirmed_electra" || verdict === "not_electra") && note === null) {
    console.warn(`status: verdict "${verdict}" should carry a note linking the dispatch`);
  }

  return { phase, verdict, headline, note, noteUrl, updatedAt };
}

export function getStatus(): Status {
  return parseStatus(raw);
}

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

/** True for arrived..verdict inclusive. */
export function isOnIsland(phase: Phase): boolean {
  const i = phaseIndex(phase);
  return i >= phaseIndex("arrived") && i <= phaseIndex("verdict");
}

export function statusSentence(status: Status, now: Date): string {
  if (status.headline) return status.headline;
  if (status.phase === "return") return "Sailing home";
  if (isOnIsland(status.phase)) {
    const n = islandDayNumber(now);
    if (n >= 1) return `Day ${n} on Nikumaroro · ${PHASE_INFO[status.phase].sentence}`;
  }
  return PHASE_INFO[status.phase].sentence;
}

/**
 * The hero's two lines: a small overline ("Day 2 on Nikumaroro") and the big sentence.
 * Pass day = null when the current time isn't known yet (server render).
 */
export function statusParts(status: Status, day: number | null): { overline: string; sentence: string } {
  let overline: string;
  if (status.phase === "return") overline = "Sailing home";
  else if (isOnIsland(status.phase)) overline = day !== null && day >= 1 ? `Day ${day} on Nikumaroro` : "On Nikumaroro";
  else overline = "The 2026 expedition";
  const sentence =
    status.headline ??
    (status.phase === "return" ? "The team is sailing back to Tarawa" : PHASE_INFO[status.phase].sentence);
  return { overline, sentence };
}
