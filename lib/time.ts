// Time helpers (SPEC §5). Pure and isomorphic: only Intl, no Node-only APIs.
// Never hard-code offsets for formatting; always use IANA zones.

import { site } from "@/content/site";

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Offset in minutes of `tz` from UTC at the given instant, derived from Intl. */
function offsetMinutes(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
  const base = Math.floor(date.getTime() / MINUTE_MS) * MINUTE_MS;
  return Math.round((asUtc - base) / MINUTE_MS);
}

export function resolveIslandTimeZone(): string {
  const candidates = ["Pacific/Kanton", "Pacific/Enderbury", "Etc/GMT-13"];
  const probe = new Date(Date.UTC(2026, 9, 13, 12, 0, 0));
  for (const tz of candidates) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      if (offsetMinutes(probe, tz) === 13 * 60) return tz;
    } catch {
      // try the next candidate
    }
  }
  // Etc/GMT-13 is UTC+13 on every runtime that supports IANA zones.
  return "Etc/GMT-13";
}

export const ISLAND_TZ = resolveIslandTimeZone();
export const HOME_TZ: string = site.homeTimeZone;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

export function zonedParts(date: Date, tz: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

function monthShort(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short" }).format(date);
}

function clockParts(date: Date, tz: string): { time: string; ampm: "a.m." | "p.m." } {
  const p = zonedParts(date, tz);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return {
    time: `${h12}:${String(p.minute).padStart(2, "0")}`,
    ampm: p.hour < 12 ? "a.m." : "p.m.",
  };
}

/** "10:16 a.m." / "3:05 p.m." */
export function formatTime(date: Date, tz: string): string {
  const c = clockParts(date, tz);
  return `${c.time} ${c.ampm}`;
}

export function formatDispatchTimes(date: Date): { home: string; island: string } {
  const h = zonedParts(date, HOME_TZ);
  return {
    home: `${h.weekday}, ${monthShort(date, HOME_TZ)} ${h.day} · ${formatTime(date, HOME_TZ)}`,
    island: `${zonedParts(date, ISLAND_TZ).weekday} ${formatTime(date, ISLAND_TZ)}`,
  };
}

export function formatShortDate(date: Date, tz: string = HOME_TZ): string {
  return `${monthShort(date, tz)} ${zonedParts(date, tz).day}`;
}

export function formatLongDate(date: Date, tz: string = HOME_TZ): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatClock(
  date: Date,
  tz: string,
): { time: string; ampm: "a.m." | "p.m."; weekday: string; date: string } {
  const c = clockParts(date, tz);
  return {
    time: c.time,
    ampm: c.ampm,
    weekday: zonedParts(date, tz).weekday,
    date: formatShortDate(date, tz),
  };
}

/** "YYYY-MM-DD" calendar date on the island. */
export function islandDate(date: Date): string {
  const p = zonedParts(date, ISLAND_TZ);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function ymdToUtcDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / (24 * HOUR_MS);
}

/** Day 1 = site.islandDay1 in island calendar terms. Can be <= 0 before arrival. */
export function islandDayNumber(now: Date): number {
  return Math.round(ymdToUtcDay(islandDate(now)) - ymdToUtcDay(site.islandDay1)) + 1;
}

/** Island UTC offset minus home UTC offset, in hours. */
export function hoursAhead(now: Date): number {
  return (offsetMinutes(now, ISLAND_TZ) - offsetMinutes(now, HOME_TZ)) / 60;
}

export function relativeTime(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE_MS) return "just now";
  const minutes = Math.floor(diff / MINUTE_MS);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(diff / HOUR_MS);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(diff / (24 * HOUR_MS));
  if (days < 2) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return formatShortDate(date);
}

export function isWithinHours(date: Date, now: Date, hours: number): boolean {
  return Math.abs(now.getTime() - date.getTime()) <= hours * HOUR_MS;
}

/**
 * The instant at which the island wall clock reads `ymd` ("YYYY-MM-DD") at
 * `hour` (may be fractional). Offset comes from ISLAND_TZ, not a constant.
 */
export function islandInstant(ymd: string, hour = 12): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + hour * HOUR_MS);
  return new Date(guess.getTime() - offsetMinutes(guess, ISLAND_TZ) * MINUTE_MS);
}
