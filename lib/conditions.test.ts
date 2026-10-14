import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchOpenMeteo,
  isIslandDaytime,
  localToDate,
  marineUrl,
  parseMarine,
  parseWeather,
  tideLevelNow,
  tideWindow,
  weatherInfo,
  weatherUrl,
  type TidePoint,
} from "@/lib/conditions";

afterEach(() => vi.unstubAllGlobals());

// Payloads: shape from Open-Meteo docs; not a live capture.
const weatherPayload = {
  latitude: -4.67,
  longitude: -174.52,
  utc_offset_seconds: 46800,
  timezone: "Pacific/Kanton",
  current_units: { temperature_2m: "°C" },
  current: {
    time: "2026-10-14T15:00",
    interval: 900,
    temperature_2m: 29.4,
    apparent_temperature: 33.1,
    weather_code: 2,
    wind_speed_10m: 18.5,
    wind_gusts_10m: 29,
    is_day: 1,
  },
  daily: {
    time: ["2026-10-13", "2026-10-14", "2026-10-15"],
    sunrise: ["2026-10-13T06:13", "2026-10-14T06:12", "2026-10-15T06:12"],
    sunset: ["2026-10-13T18:17", "2026-10-14T18:17", "2026-10-15T18:18"],
  },
};

const marinePayload = {
  utc_offset_seconds: 46800,
  current: {
    time: "2026-10-14T15:00",
    interval: 900,
    wave_height: 1.4,
    swell_wave_height: 1.1,
    sea_surface_temperature: 28.9,
  },
  hourly: {
    time: ["2026-10-14T02:00", "2026-10-14T00:00", "2026-10-14T01:00", "2026-10-14T03:00"],
    sea_level_height_msl: [0.3, 0.1, null, 0.5],
  },
};

describe("localToDate", () => {
  it("applies utc_offset_seconds", () => {
    expect(localToDate("2026-10-14T06:12", 46800)?.toISOString()).toBe("2026-10-13T17:12:00.000Z");
  });
  it("returns null on garbage", () => {
    expect(localToDate("nope", 0)).toBeNull();
  });
});

describe("parseWeather", () => {
  it("parses the happy path and picks today's sun times", () => {
    const w = parseWeather(weatherPayload)!;
    expect(w.tempC).toBe(29.4);
    expect(w.feelsLikeC).toBe(33.1);
    expect(w.code).toBe(2);
    expect(w.windKmh).toBe(18.5);
    expect(w.gustKmh).toBe(29);
    expect(w.isDay).toBe(true);
    expect(w.sunrise).toBe("2026-10-13T17:12:00.000Z");
    expect(w.sunset).toBe("2026-10-14T05:17:00.000Z");
    expect(w.observedAt).toBe("2026-10-14T02:00:00.000Z");
  });
  it("is null without temperature", () => {
    const p = { ...weatherPayload, current: { ...weatherPayload.current, temperature_2m: null } };
    expect(parseWeather(p)).toBeNull();
    expect(parseWeather(null)).toBeNull();
    expect(parseWeather("x")).toBeNull();
  });
  it("tolerates null values", () => {
    const p = {
      ...weatherPayload,
      current: { time: "2026-10-14T15:00", temperature_2m: 30, weather_code: null, is_day: null },
      daily: { time: ["2026-10-14"], sunrise: [null], sunset: ["bad"] },
    };
    const w = parseWeather(p)!;
    expect(w.code).toBeNull();
    expect(w.isDay).toBeNull();
    expect(w.sunrise).toBeNull();
    expect(w.sunset).toBeNull();
    expect(w.feelsLikeC).toBeNull();
  });
});

describe("parseMarine", () => {
  it("converts and sorts tide points, skipping nulls", () => {
    const m = parseMarine(marinePayload)!;
    expect(m.waveM).toBe(1.4);
    expect(m.swellM).toBe(1.1);
    expect(m.seaTempC).toBe(28.9);
    expect(m.tide).toEqual([
      { t: "2026-10-13T11:00:00.000Z", h: 0.1 },
      { t: "2026-10-13T13:00:00.000Z", h: 0.3 },
      { t: "2026-10-13T14:00:00.000Z", h: 0.5 },
    ]);
  });
  it("is null when everything is missing", () => {
    expect(parseMarine({ current: { wave_height: null }, hourly: { time: [], sea_level_height_msl: [] } })).toBeNull();
    expect(parseMarine(undefined)).toBeNull();
  });
});

describe("weatherInfo", () => {
  it("maps codes", () => {
    expect(weatherInfo(0, true)).toEqual({ label: "Clear sky", icon: "sun" });
    expect(weatherInfo(0, false)).toEqual({ label: "Clear sky", icon: "moon" });
    expect(weatherInfo(2, true)).toEqual({ label: "Partly cloudy", icon: "partly" });
    expect(weatherInfo(3, null)).toEqual({ label: "Overcast", icon: "cloud" });
    expect(weatherInfo(61, true)).toEqual({ label: "Light rain", icon: "rain" });
    expect(weatherInfo(80, true)).toEqual({ label: "Rain showers", icon: "showers" });
    expect(weatherInfo(95, true)).toEqual({ label: "Thunderstorm", icon: "storm" });
    expect(weatherInfo(1234, true)).toEqual({ label: "—", icon: "unknown" });
    expect(weatherInfo(null, null).icon).toBe("unknown");
  });
});

const H = 3_600_000;
const base = Date.parse("2026-10-14T00:00:00Z");
const series: TidePoint[] = Array.from({ length: 6 }, (_, i) => ({
  t: new Date(base + i * H).toISOString(),
  h: [0, 1, 2, 1, 0, 1][i],
}));

describe("tideWindow", () => {
  it("includes 1h before now through now+hours", () => {
    const now = new Date(base + 2 * H);
    const w = tideWindow(series, now, 2);
    expect(w.map((p) => p.t)).toEqual(
      [1, 2, 3, 4].map((i) => new Date(base + i * H).toISOString()),
    );
  });
});

describe("tideLevelNow", () => {
  it("interpolates and normalises", () => {
    const r = tideLevelNow(series, new Date(base + 0.5 * H))!;
    expect(r.h).toBeCloseTo(0.5);
    expect(r.level).toBeCloseTo(0.25); // range over [now..] is 0..2
  });
  it("returns 0.5 for a flat range", () => {
    const flat = series.map((p) => ({ ...p, h: 0.4 }));
    expect(tideLevelNow(flat, new Date(base + H))!.level).toBe(0.5);
  });
  it("returns null out of range", () => {
    expect(tideLevelNow(series, new Date(base - H))).toBeNull();
    expect(tideLevelNow(series, new Date(base + 10 * H))).toBeNull();
    expect(tideLevelNow([], new Date(base))).toBeNull();
  });
});

describe("isIslandDaytime", () => {
  const rise = "2026-10-13T17:12:00.000Z";
  const set = "2026-10-14T05:17:00.000Z";
  it("handles night, day, and missing", () => {
    expect(isIslandDaytime(new Date("2026-10-13T16:00:00Z"), rise, set)).toBe(false);
    expect(isIslandDaytime(new Date("2026-10-13T23:00:00Z"), rise, set)).toBe(true);
    expect(isIslandDaytime(new Date("2026-10-14T05:17:00Z"), rise, set)).toBe(false);
    expect(isIslandDaytime(new Date(), null, set)).toBeNull();
    expect(isIslandDaytime(new Date(), rise, null)).toBeNull();
  });
});

describe("urls", () => {
  it("weatherUrl carries params and tz", () => {
    const u = new URL(weatherUrl("Pacific/Kanton"));
    expect(u.searchParams.get("latitude")).toBe("-4.67");
    expect(u.searchParams.get("longitude")).toBe("-174.52");
    expect(u.searchParams.get("current")).toBe(
      "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,is_day",
    );
    expect(u.searchParams.get("daily")).toBe("sunrise,sunset");
    expect(u.searchParams.get("timezone")).toBe("Pacific/Kanton");
    expect(weatherUrl("auto")).toContain("timezone=auto");
  });
  it("marineUrl carries params and tz", () => {
    const u = new URL(marineUrl("auto"));
    expect(u.host).toBe("marine-api.open-meteo.com");
    expect(u.searchParams.get("current")).toBe("wave_height,swell_wave_height,sea_surface_temperature");
    expect(u.searchParams.get("hourly")).toBe("sea_level_height_msl");
    expect(u.searchParams.get("forecast_days")).toBe("2");
    expect(u.searchParams.get("timezone")).toBe("auto");
  });
});

describe("fetchOpenMeteo", () => {
  it("retries with timezone=auto after HTTP 400", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad tz", { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(weatherPayload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const json = await fetchOpenMeteo(weatherUrl);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("timezone=Pacific%2FKanton");
    expect(String(fetchMock.mock.calls[1][0])).toContain("timezone=auto");
    expect(parseWeather(json)?.tempC).toBe(29.4);
  });
  it("throws on other non-OK statuses without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("x", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchOpenMeteo(weatherUrl)).rejects.toThrow(/500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
