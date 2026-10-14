// Pure conditions types and helpers, safe to import from client components.

const HOUR_MS = 3_600_000;

export type Weather = {
  tempC: number;
  feelsLikeC: number | null;
  code: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  isDay: boolean | null;
  /** ISO UTC */
  sunrise: string | null;
  sunset: string | null;
  observedAt: string | null;
};

export type TidePoint = { t: string; h: number };

export type Marine = {
  waveM: number | null;
  swellM: number | null;
  seaTempC: number | null;
  tide: TidePoint[];
  observedAt: string | null;
};

export type Conditions = { weather: Weather | null; marine: Marine | null };

export type WeatherIcon =
  | "sun" | "moon" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "showers" | "storm" | "unknown";

export function weatherInfo(
  code: number | null,
  isDay: boolean | null,
): { label: string; icon: WeatherIcon } {
  switch (code) {
    case 0:
      return { label: "Clear sky", icon: isDay === false ? "moon" : "sun" };
    case 1:
      return { label: "Mainly clear", icon: isDay === false ? "moon" : "sun" };
    case 2:
      return { label: "Partly cloudy", icon: "partly" };
    case 3:
      return { label: "Overcast", icon: "cloud" };
    case 45:
    case 48:
      return { label: "Fog", icon: "fog" };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: "Drizzle", icon: "drizzle" };
    case 61:
    case 66:
      return { label: "Light rain", icon: "rain" };
    case 63:
    case 67:
      return { label: "Moderate rain", icon: "rain" };
    case 65:
      return { label: "Heavy rain", icon: "rain" };
    case 80:
    case 81:
    case 82:
      return { label: "Rain showers", icon: "showers" };
    case 95:
    case 96:
    case 99:
      return { label: "Thunderstorm", icon: "storm" };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { label: "Snow", icon: "cloud" };
    default:
      return { label: "—", icon: "unknown" };
  }
}

/** Points from 1 hour before `now` to `now + hours`. */
export function tideWindow(tide: TidePoint[], now: Date, hours: number): TidePoint[] {
  const from = now.getTime() - HOUR_MS;
  const to = now.getTime() + hours * HOUR_MS;
  return tide.filter((p) => {
    const t = Date.parse(p.t);
    return t >= from && t <= to;
  });
}

/** Interpolated height now, plus 0..1 position within the next 48 h range. */
export function tideLevelNow(tide: TidePoint[], now: Date): { level: number; h: number } | null {
  const pts = tide
    .map((p) => ({ t: Date.parse(p.t), h: p.h }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.h))
    .sort((a, b) => a.t - b.t);
  const n = now.getTime();
  if (pts.length === 0 || n < pts[0].t || n > pts[pts.length - 1].t) return null;

  let h = pts[0].h;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].t === n) {
      h = pts[i].h;
      break;
    }
    if (pts[i].t > n) {
      const a = pts[i - 1];
      const b = pts[i];
      h = a.h + ((b.h - a.h) * (n - a.t)) / (b.t - a.t);
      break;
    }
  }

  const end = n + 48 * HOUR_MS;
  const hs = pts.filter((p) => p.t >= n && p.t <= end).map((p) => p.h);
  hs.push(h);
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  if (max - min < 0.01) return { level: 0.5, h };
  return { level: Math.min(1, Math.max(0, (h - min) / (max - min))), h };
}

/** True between sunrise (inclusive) and sunset (exclusive); null if unknown. */
export function isIslandDaytime(
  now: Date,
  sunrise: string | null,
  sunset: string | null,
): boolean | null {
  if (!sunrise || !sunset) return null;
  const rise = Date.parse(sunrise);
  const set = Date.parse(sunset);
  if (Number.isNaN(rise) || Number.isNaN(set)) return null;
  const n = now.getTime();
  return n >= rise && n < set;
}
