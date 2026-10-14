// Night-sky maths for Nikumaroro (SPEC §4.3 position). Pure and isomorphic.
import * as SunCalc from "suncalc";
import { islandDate, islandInstant } from "@/lib/time";

export const LAT = -4.67;
export const LON = -174.52;

const DAY_MS = 86_400_000;
const RAD = Math.PI / 180;

/** Island UTC offset in minutes (positive east) on island date `ymd`, derived from ISLAND_TZ. */
function islandOffsetMinutes(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d, 12) - islandInstant(ymd, 12).getTime()) / 60_000);
}

/** Sunrise and sunset for the island calendar day containing `date`. */
export function sunTimes(date: Date): { sunrise: Date; sunset: Date } {
  const ymd = islandDate(date);
  // suncalc v2 takes the zone offset, so the "day" is the island civil day.
  const t = SunCalc.getTimes(islandInstant(ymd, 12), LAT, LON, 0, islandOffsetMinutes(ymd));
  // Sun always rises and sets at this latitude; fall back to noon only to satisfy the types.
  return { sunrise: t.sunrise ?? t.solarNoon, sunset: t.sunset ?? t.solarNoon };
}

/** True when the sun's centre is below the horizon (-0.833° accounts for refraction and the disc). */
export function isNightOnIsland(now: Date): boolean {
  return SunCalc.getPosition(now, LAT, LON).altitude < -0.833;
}

export type MoonInfo = {
  phaseName: string;
  illumination: number;
  phase: number;
  waxing: boolean;
  rise: Date | null;
  set: Date | null;
  aboveHorizon: boolean;
  altitudeDeg: number;
};

function phaseName(p: number): string {
  if (p < 0.03 || p > 0.97) return "New moon";
  if (p >= 0.22 && p <= 0.28) return "First quarter";
  if (p >= 0.47 && p <= 0.53) return "Full moon";
  if (p >= 0.72 && p <= 0.78) return "Last quarter";
  if (p < 0.22) return "Waxing crescent";
  if (p < 0.47) return "Waxing gibbous";
  if (p < 0.72) return "Waning gibbous";
  return "Waning crescent";
}

export function moonInfo(now: Date): MoonInfo {
  const ill = SunCalc.getMoonIllumination(now);
  const pos = SunCalc.getMoonPosition(now, LAT, LON);
  const altitudeDeg = pos.altitude;

  const ymd = islandDate(now);
  const t = SunCalc.getMoonTimes(islandInstant(ymd, 12), LAT, LON, islandOffsetMinutes(ymd));
  const rise = t.rise ?? null;
  const set = t.set ?? null;

  return {
    phaseName: phaseName(ill.phase),
    illumination: ill.fraction,
    phase: ill.phase,
    waxing: ill.waxing,
    rise,
    set,
    aboveHorizon: altitudeDeg > 0,
    altitudeDeg,
  };
}

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

/**
 * Centre of the Crux asterism. RA 12h 26m (186.5°), Dec −60.4° are approximate
 * J2000 values for the asterism's centre, not for any single star.
 */
const CRUX_RA = 186.5;
const CRUX_DEC = -60.4;

export function southernCross(now: Date): { aboveHorizon: boolean; altitudeDeg: number; direction: string } {
  const jd = now.getTime() / DAY_MS + 2440587.5;
  const gmst = (((280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360) + 360) % 360;
  const lst = gmst + LON; // east longitude positive
  const h = (lst - CRUX_RA) * RAD; // hour angle
  const dec = CRUX_DEC * RAD;
  const lat = LAT * RAD;
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h);
  const altitudeDeg = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / RAD;
  // Azimuth measured from north, clockwise.
  const azSouth = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
  const az = (((azSouth / RAD + 180) % 360) + 360) % 360;
  return {
    aboveHorizon: altitudeDeg > 0,
    altitudeDeg,
    direction: COMPASS[Math.round(az / 45) % 8],
  };
}

/**
 * SVG path `d` for the lit part of a moon disc of radius r centred at (0,0).
 * Illustrative only: uses the northern-hemisphere convention (waxing = lit on
 * the right). From Nikumaroro (southern hemisphere, near the equator) the real
 * orientation differs and varies through the night.
 */
export function moonPath(phase: number, r: number): string {
  const p = ((phase % 1) + 1) % 1;
  const c = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(c) * r;
  const waxing = p < 0.5;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = waxing ? (c > 0 ? 0 : 1) : c > 0 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return `M0 ${f(-r)} A${f(r)} ${f(r)} 0 0 ${outerSweep} 0 ${f(r)} A${f(rx)} ${f(r)} 0 0 ${innerSweep} 0 ${f(-r)} Z`;
}
