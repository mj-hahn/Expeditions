import { describe, expect, it } from "vitest";
import { legProgress, teamLocation } from "@/components/globe/JourneyGlobe";

describe("legProgress", () => {
  it("follows status.json phases", () => {
    expect(legProgress("departed")).toEqual({ done: 0, active: [0, 1, 2] });
    expect(legProgress("tarawa")).toEqual({ done: 3, active: [] });
    expect(legProgress("at_sea")).toEqual({ done: 3, active: [3] });
    expect(legProgress("base_camp")).toEqual({ done: 4, active: [] });
    expect(legProgress("return")).toEqual({ done: 4, active: [] });
  });
});

describe("teamLocation", () => {
  it("follows status.json phases", () => {
    expect(teamLocation("departed")).toBeNull();
    expect(teamLocation("tarawa")).toEqual([172.93, 1.35]);
    const [, lat] = teamLocation("at_sea")!;
    expect(lat).toBeGreaterThan(-4.67);
    expect(lat).toBeLessThan(1.35);
    expect(teamLocation("arrived")).toEqual([-174.52, -4.67]);
    expect(teamLocation("return")).toEqual([-174.52, -4.67]);
  });
});
