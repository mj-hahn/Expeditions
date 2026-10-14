// Runs against live Open-Meteo captures in fixtures/open-meteo (Oct 14, 2026, 17:15 island time).
import { describe, expect, it } from "vitest";
import marine from "@/fixtures/open-meteo/marine.json";
import weather from "@/fixtures/open-meteo/weather.json";
import { isIslandDaytime, parseMarine, parseWeather, tideLevelNow, tideWindow, weatherInfo } from "@/lib/conditions";

describe("live Open-Meteo captures", () => {
  const w = parseWeather(weather)!;
  const m = parseMarine(marine)!;

  it("parses current weather", () => {
    expect(w.tempC).toBe(27.9);
    expect(w.feelsLikeC).toBe(32.2);
    expect(w.windKmh).toBe(13.8);
    expect(w.gustKmh).toBe(19.1);
    expect(w.isDay).toBe(true);
    expect(weatherInfo(w.code, w.isDay).icon).toBe("drizzle");
    // 17:15 island time (UTC+13) is 04:15 UTC
    expect(w.observedAt).toBe("2026-10-14T04:15:00.000Z");
  });

  it("picks today's sunrise and sunset and converts them to UTC", () => {
    expect(w.sunrise).toBe("2026-10-13T17:18:00.000Z");
    expect(w.sunset).toBe("2026-10-14T05:30:00.000Z");
    expect(isIslandDaytime(new Date("2026-10-14T04:15:00Z"), w.sunrise, w.sunset)).toBe(true);
    expect(isIslandDaytime(new Date("2026-10-14T06:00:00Z"), w.sunrise, w.sunset)).toBe(false);
  });

  it("parses sea state and the hourly tide series", () => {
    expect(m.waveM).toBe(2.22);
    expect(m.swellM).toBe(1.78);
    expect(m.seaTempC).toBe(30.1);
    expect(m.tide).toHaveLength(48);
    expect(m.tide[0]).toEqual({ t: "2026-10-13T11:00:00.000Z", h: 0.23 });
    const now = new Date("2026-10-14T04:15:00Z");
    expect(tideWindow(m.tide, now, 24).length).toBeGreaterThan(20);
    const level = tideLevelNow(m.tide, now);
    expect(level).not.toBeNull();
    expect(level!.level).toBeGreaterThanOrEqual(0);
    expect(level!.level).toBeLessThanOrEqual(1);
  });
});
