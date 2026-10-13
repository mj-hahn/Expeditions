import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PHASE_INFO,
  getStatus,
  isOnIsland,
  parseStatus,
  phaseIndex,
  statusSentence,
} from "@/lib/status";
import { PHASES, type Status } from "@/lib/types";

afterEach(() => vi.restoreAllMocks());

const base: Status = {
  phase: "magnetometer",
  verdict: "investigating",
  headline: null,
  note: null,
  noteUrl: null,
  updatedAt: "",
};

describe("parseStatus", () => {
  it("falls back on invalid phase and verdict with warnings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = parseStatus({ phase: "nope", verdict: "maybe" });
    expect(s.phase).toBe("arrived");
    expect(s.verdict).toBe("investigating");
    expect(s.updatedAt).toBe("");
    expect(warn).toHaveBeenCalled();
  });
  it("keeps confirmed_electra without a note", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = parseStatus({ phase: "verdict", verdict: "confirmed_electra" });
    expect(s.verdict).toBe("confirmed_electra");
    expect(s.note).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
  it("trims text and nulls blanks", () => {
    const s = parseStatus({ phase: "sonar", headline: "  Hi  ", note: "   " });
    expect(s.headline).toBe("Hi");
    expect(s.note).toBeNull();
  });
  it("reads the real status file", () => {
    expect(PHASES).toContain(getStatus().phase);
  });
});

describe("phases", () => {
  it("has info for every phase", () => {
    for (const p of PHASES) expect(PHASE_INFO[p].label).toBeTruthy();
  });
  it("isOnIsland covers arrived..verdict", () => {
    expect(isOnIsland("at_sea")).toBe(false);
    expect(isOnIsland("arrived")).toBe(true);
    expect(isOnIsland("verdict")).toBe(true);
    expect(isOnIsland("return")).toBe(false);
    expect(phaseIndex("departed")).toBe(0);
  });
});

describe("statusSentence", () => {
  const onIsland = new Date("2026-10-14T00:00:00Z"); // island day 2
  it("headline overrides", () => {
    expect(statusSentence({ ...base, headline: "Big news" }, onIsland)).toBe("Big news");
  });
  it("prefixes the day when on island", () => {
    expect(statusSentence(base, onIsland)).toBe(
      "Day 2 on Nikumaroro · Sweeping the lagoon with a magnetometer",
    );
  });
  it("no prefix before arrival day", () => {
    expect(statusSentence({ ...base, phase: "arrived" }, new Date("2026-10-12T00:00:00Z"))).toBe(
      "Arrived at Nikumaroro",
    );
  });
  it("return", () => {
    expect(statusSentence({ ...base, phase: "return" }, onIsland)).toBe("Sailing home");
  });
});
