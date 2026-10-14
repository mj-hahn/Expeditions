import { describe, expect, it } from "vitest";
import { isNightOnIsland, moonInfo, moonPath, southernCross, sunTimes } from "@/lib/sky";

const min = 60_000;

describe("moonInfo", () => {
  // Known 2026 phases (full 2026-10-26 ~04:12 UTC, new 2026-10-10 ~15:50 UTC).
  // Checked against SunCalc: phase 0.50001 and 0.000002, so they agree.
  it("names the full moon", () => {
    const m = moonInfo(new Date("2026-10-26T04:12:00Z"));
    expect(m.phaseName).toBe("Full moon");
    expect(m.illumination).toBeGreaterThan(0.99);
  });
  it("names the new moon", () => {
    const m = moonInfo(new Date("2026-10-10T15:50:00Z"));
    expect(m.phaseName).toBe("New moon");
    expect(m.illumination).toBeLessThan(0.01);
  });
  it("reports waxing and a sane altitude", () => {
    const m = moonInfo(new Date("2026-10-14T09:00:00Z"));
    expect(m.waxing).toBe(true);
    expect(m.altitudeDeg).toBeGreaterThanOrEqual(-90);
    expect(m.altitudeDeg).toBeLessThanOrEqual(90);
  });
});

describe("day and night", () => {
  it("is day at 13:00 island time", () => {
    expect(isNightOnIsland(new Date("2026-10-14T00:00:00Z"))).toBe(false);
  });
  it("is night at 22:00 island time", () => {
    expect(isNightOnIsland(new Date("2026-10-14T09:00:00Z"))).toBe(true);
  });
  it("matches the Open-Meteo sunrise and sunset (fixtures/open-meteo/weather.json)", () => {
    const { sunrise, sunset } = sunTimes(new Date("2026-10-14T00:00:00Z"));
    expect(Math.abs(sunrise.getTime() - Date.parse("2026-10-13T17:18:00Z"))).toBeLessThan(15 * min);
    expect(Math.abs(sunset.getTime() - Date.parse("2026-10-14T05:30:00Z"))).toBeLessThan(15 * min);
  });
});

describe("southernCross", () => {
  it("peaks near 34 degrees, toward the south", () => {
    const start = Date.parse("2026-10-14T00:00:00Z");
    let best = { altitudeDeg: -91, direction: "" };
    let sawUp = false;
    for (let i = 0; i < 24 * 60; i += 5) {
      const s = southernCross(new Date(start + i * min));
      expect(s.altitudeDeg).toBeGreaterThanOrEqual(-90);
      expect(s.altitudeDeg).toBeLessThanOrEqual(90);
      if (s.aboveHorizon) sawUp = true;
      if (s.altitudeDeg > best.altitudeDeg) best = s;
    }
    expect(sawUp).toBe(true);
    expect(Math.abs(best.altitudeDeg - 34)).toBeLessThan(3);
    expect(best.direction).toBe("south");
  });
});

describe("moonPath", () => {
  it.each([0.1, 0.5, 0.9])("returns a path for phase %s", (p) => {
    expect(moonPath(p, 30).length).toBeGreaterThan(0);
  });
});
