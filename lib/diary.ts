// Pure helpers for the Expedition diary page (island calendar days).

import { site } from "@/content/site";
import { PHASE_INFO } from "@/lib/status";
import { islandDate } from "@/lib/time";
import { PHASES, type Dispatch, type Phase } from "@/lib/types";

export type DiaryDay = { date: string; day: number; phases: Phase[]; dispatches: Dispatch[] };

/** First diary day (the day the team left Purdue). */
export const DIARY_START = "2026-10-02";
/** The diary always runs at least this far. */
export const DIARY_MIN_END = "2026-10-13";

const YEAR = 2026;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoToDayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function dayIndexToIso(i: number): string {
  const d = new Date(i * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Parse "Oct 2" or "Oct 6–7" (en dash) into inclusive ISO start/end for 2026. */
function parseWhen(when: string): { start: string; end: string } | null {
  const m = /^([A-Za-z]{3})\s+(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?$/.exec(when.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month === -1) return null;
  const start = `${YEAR}-${pad(month + 1)}-${pad(Number(m[2]))}`;
  const end = `${YEAR}-${pad(month + 1)}-${pad(Number(m[3] ?? m[2]))}`;
  return { start, end };
}

/** Phases whose PHASE_INFO `when` range covers this ISO date (YYYY-MM-DD), in journey order. */
export function phasesOnDate(isoDate: string): Phase[] {
  return PHASES.filter((p) => {
    const when = PHASE_INFO[p].when;
    const range = when ? parseWhen(when) : null;
    return range !== null && isoDate >= range.start && isoDate <= range.end;
  });
}

/** Island day number for an ISO date; Day 1 = site.islandDay1. Can be <= 0. */
export function dayNumberFor(isoDate: string): number {
  return isoToDayIndex(isoDate) - isoToDayIndex(site.islandDay1) + 1;
}

/** Label for a diary day: "Day 2 on Nikumaroro" or "Wednesday, Oct 7". */
export function diaryDayLabel(isoDate: string): string {
  const day = dayNumberFor(isoDate);
  if (day >= 1) return `Day ${day} on Nikumaroro`;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(isoToDayIndex(isoDate) * 86_400_000));
}

/** One entry per island day from `fromIso` to `toIso` inclusive, newest first. */
export function buildDiary(dispatches: Dispatch[], fromIso: string, toIso: string): DiaryDay[] {
  const byDate = new Map<string, Dispatch[]>();
  for (const d of dispatches) {
    const key = islandDate(d.publishedAt);
    byDate.set(key, [...(byDate.get(key) ?? []), d]);
  }
  const days: DiaryDay[] = [];
  for (let i = isoToDayIndex(toIso); i >= isoToDayIndex(fromIso); i--) {
    const date = dayIndexToIso(i);
    const list = (byDate.get(date) ?? []).slice().sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    days.push({ date, day: dayNumberFor(date), phases: phasesOnDate(date), dispatches: list });
  }
  return days;
}

/** The diary for the given dispatches: Oct 2 through the newest dispatch (or Oct 13). */
export function buildFullDiary(dispatches: Dispatch[]): DiaryDay[] {
  let end = DIARY_MIN_END;
  for (const d of dispatches) {
    const iso = islandDate(d.publishedAt);
    if (iso > end) end = iso;
  }
  return buildDiary(dispatches, DIARY_START, end);
}
