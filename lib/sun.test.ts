import { describe, expect, it } from "vitest";
import { subsolarPoint } from "@/lib/sun";

describe("subsolarPoint", () => {
  it("sits over the Tropic of Cancer near Greenwich at noon UTC on the June solstice", () => {
    const [lon, lat] = subsolarPoint(new Date("2026-06-21T12:00:00Z"));
    expect(Math.abs(lat - 23.4)).toBeLessThan(2);
    expect(Math.abs(lon)).toBeLessThan(2);
  });

  it("sits near the equator at the March equinox", () => {
    const [, lat] = subsolarPoint(new Date("2026-03-20T12:00:00Z"));
    expect(Math.abs(lat)).toBeLessThan(1.5);
  });

  it("moves west by about 15 degrees per hour", () => {
    const [a] = subsolarPoint(new Date("2026-06-21T12:00:00Z"));
    const [b] = subsolarPoint(new Date("2026-06-21T13:00:00Z"));
    expect(a - b).toBeCloseTo(15, 0);
  });
});
