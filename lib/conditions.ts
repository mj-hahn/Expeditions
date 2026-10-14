// Island conditions from Open-Meteo (SPEC §4.3). Server-side; parsing is
// defensive: anything missing or malformed becomes null, nothing throws.
import { cacheLife, cacheTag } from "next/cache";
import { siteUrl } from "@/content/site";
import type { Conditions, Marine, TidePoint, Weather } from "@/lib/conditions-shared";

export * from "@/lib/conditions-shared";

export const LAT = -4.67;
export const LON = -174.52;

const PREFERRED_TZ = "Pacific/Kanton";

function buildUrl(base: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString().replace(/%2C/g, ",");
  return `${base}?${qs}`;
}

export function weatherUrl(tz: string): string {
  return buildUrl("https://api.open-meteo.com/v1/forecast", {
    latitude: String(LAT),
    longitude: String(LON),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,is_day",
    daily: "sunrise,sunset",
    timezone: tz,
  });
}

export function marineUrl(tz: string): string {
  return buildUrl("https://marine-api.open-meteo.com/v1/marine", {
    latitude: String(LAT),
    longitude: String(LON),
    current: "wave_height,swell_wave_height,sea_surface_temperature",
    hourly: "sea_level_height_msl",
    forecast_days: "2",
    timezone: tz,
  });
}

export async function fetchJson(url: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": `TaraiaWatch/1.0 (+${siteUrl()})`, Accept: "application/json" },
  });
  if (!res.ok) return { status: res.status, json: null };
  return { status: res.status, json: await res.json() };
}

/**
 * Fetch with Pacific/Kanton; if Open-Meteo rejects the timezone (HTTP 400),
 * retry once with timezone=auto. Throws on any other failure.
 */
export async function fetchOpenMeteo(build: (tz: string) => string): Promise<unknown> {
  let r = await fetchJson(build(PREFERRED_TZ));
  if (r.status === 400) r = await fetchJson(build("auto"));
  if (r.status < 200 || r.status >= 300) throw new Error(`Open-Meteo HTTP ${r.status}`);
  return r.json;
}

// ---------- parsing helpers ----------

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Open-Meteo local time (no offset suffix) + utc_offset_seconds -> UTC instant. */
export function localToDate(local: string, utcOffsetSeconds: number): Date | null {
  if (typeof local !== "string" || typeof utcOffsetSeconds !== "number") return null;
  if (!Number.isFinite(utcOffsetSeconds)) return null;
  const m = LOCAL_RE.exec(local);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms - utcOffsetSeconds * 1000);
  return Number.isNaN(d.getTime()) ? null : d;
}

function localIso(local: unknown, offset: number): string | null {
  if (typeof local !== "string") return null;
  return localToDate(local, offset)?.toISOString() ?? null;
}

function offsetOf(root: Record<string, unknown>): number {
  return num(root.utc_offset_seconds) ?? 0;
}

export function parseWeather(json: unknown): Weather | null {
  const root = asRecord(json);
  const cur = asRecord(root?.current);
  if (!root || !cur) return null;
  const tempC = num(cur.temperature_2m);
  if (tempC === null) return null;
  const offset = offsetOf(root);

  let sunrise: string | null = null;
  let sunset: string | null = null;
  const daily = asRecord(root.daily);
  if (daily) {
    const times = arr(daily.time);
    const today = typeof cur.time === "string" ? cur.time.slice(0, 10) : null;
    let i = today ? times.findIndex((t) => typeof t === "string" && t.slice(0, 10) === today) : -1;
    if (i < 0) i = 0;
    sunrise = localIso(arr(daily.sunrise)[i], offset);
    sunset = localIso(arr(daily.sunset)[i], offset);
  }

  const isDayRaw = num(cur.is_day);
  return {
    tempC,
    feelsLikeC: num(cur.apparent_temperature),
    code: num(cur.weather_code),
    windKmh: num(cur.wind_speed_10m),
    gustKmh: num(cur.wind_gusts_10m),
    isDay: isDayRaw === null ? null : isDayRaw === 1,
    sunrise,
    sunset,
    observedAt: localIso(cur.time, offset),
  };
}

export function parseMarine(json: unknown): Marine | null {
  const root = asRecord(json);
  if (!root) return null;
  const offset = offsetOf(root);
  const cur = asRecord(root.current);
  const waveM = num(cur?.wave_height);
  const swellM = num(cur?.swell_wave_height);
  const seaTempC = num(cur?.sea_surface_temperature);

  const tide: TidePoint[] = [];
  const hourly = asRecord(root.hourly);
  if (hourly) {
    const times = arr(hourly.time);
    const heights = arr(hourly.sea_level_height_msl);
    for (let i = 0; i < times.length; i++) {
      const h = num(heights[i]);
      const t = localIso(times[i], offset);
      if (h !== null && t) tide.push({ t, h });
    }
    tide.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  }

  if (waveM === null && swellM === null && seaTempC === null && tide.length === 0) return null;
  return { waveM, swellM, seaTempC, tide, observedAt: localIso(cur?.time, offset) };
}

// ---------- cached fetch ----------

// Local-dev escape hatch for working offline: read saved responses from
// OPEN_METEO_FIXTURE_DIR/{weather,marine}.json. Ignored in production.
async function load(kind: "weather" | "marine", build: (tz: string) => string): Promise<unknown> {
  const dir = process.env.OPEN_METEO_FIXTURE_DIR;
  if (dir && process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(`${dir}/${kind}.json`, "utf8"));
  }
  return fetchOpenMeteo(build);
}

export async function getConditions(): Promise<Conditions> {
  "use cache";
  cacheTag("conditions");
  const [w, m] = await Promise.allSettled([load("weather", weatherUrl), load("marine", marineUrl)]);
  const log = (what: string, reason: unknown) =>
    console.error(`Open-Meteo ${what} failed:`, reason instanceof Error ? reason.message : String(reason));

  let weather: Weather | null = null;
  let marine: Marine | null = null;
  if (w.status === "fulfilled") {
    try {
      weather = parseWeather(w.value);
    } catch (err) {
      log("weather parse", err);
    }
  } else log("weather", w.reason);
  if (m.status === "fulfilled") {
    try {
      marine = parseMarine(m.value);
    } catch (err) {
      log("marine parse", err);
    }
  } else log("marine", m.reason);

  if (w.status === "fulfilled" || m.status === "fulfilled") {
    cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  } else {
    // stale >= 5 min keeps this in the instant shell; revalidate still retries soon.
    cacheLife({ stale: 300, revalidate: 120, expire: 600 });
  }
  return { weather, marine };
}

// ---------- presentation helpers ----------
