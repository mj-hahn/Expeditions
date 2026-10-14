import { describe, expect, it } from "vitest";
import { legProgress } from "@/components/globe/JourneyGlobe";

describe("legProgress", () => {
  it("follows status.json phases", () => {
    expect(legProgress("departed")).toEqual({ done: 0, active: [0, 1, 2] });
    expect(legProgress("tarawa")).toEqual({ done: 3, active: [] });
    expect(legProgress("at_sea")).toEqual({ done: 3, active: [3] });
    expect(legProgress("base_camp")).toEqual({ done: 4, active: [] });
    expect(legProgress("return")).toEqual({ done: 4, active: [] });
  });
});
