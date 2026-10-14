// Guards for the "Fact Bank only" rule (SPEC §2, §11).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREW, CREW_GROUPS } from "@/content/crew";
import { DID_YOU_KNOW, FACTS, MYSTERY, SKEPTICS, SKEPTICS_CLOSING } from "@/content/facts";
import { PRESS } from "@/content/press";
import { TIMELINE_1937 } from "@/content/timeline-1937";

const spec = readFileSync("SPEC.md", "utf8");
const specUrls = new Set(spec.match(/https:\/\/[^\s)]+/g) ?? []);

describe("facts", () => {
  it("every Fact Bank id in the spec has an entry, and nothing extra", () => {
    const specIds = new Set([...spec.matchAll(/\*\*([FSHPI]\d+)\.\*\*/g)].map((m) => m[1]));
    expect(new Set(Object.keys(FACTS))).toEqual(specIds);
  });

  it("every source URL is one listed in the spec", () => {
    for (const f of Object.values(FACTS)) for (const s of f.sources) expect(specUrls, `${f.id} ${s.url}`).toContain(s.url);
  });

  it("every fact except the neutral closing line has a source", () => {
    for (const f of Object.values(FACTS)) if (f.id !== "S5") expect(f.sources.length, f.id).toBeGreaterThan(0);
  });

  it("sections only reference existing facts", () => {
    const used = [...MYSTERY.flatMap((m) => m.facts), ...SKEPTICS, SKEPTICS_CLOSING, ...DID_YOU_KNOW];
    for (const id of used) expect(FACTS[id]).toBeDefined();
  });
});

describe("crew and press", () => {
  it("has the 17-person roster, each in exactly one group", () => {
    expect(CREW).toHaveLength(17);
    for (const c of CREW) expect(CREW_GROUPS.filter((g) => g.match(c)), c.name).toHaveLength(1);
    for (const c of CREW) expect(spec, c.name).toContain(c.name);
    expect(CREW.filter((c) => c.astronaut).map((c) => c.name)).toEqual(["Sirisha Bandla", "Marc Hagle"]);
  });

  it("press links come from the spec", () => {
    for (const p of PRESS) expect(specUrls, p.url).toContain(p.url);
  });
});

describe("quiz", () => {
  it("draws every question from an existing fact, with a valid answer", async () => {
    const { QUIZ } = await import("@/content/quiz");
    expect(QUIZ.length).toBeGreaterThanOrEqual(6);
    for (const q of QUIZ) {
      expect(FACTS[q.fact], q.q).toBeDefined();
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }
  });
});

describe("1937 timeline", () => {
  it("only uses real facts, and uses each of H1-H11 exactly once", () => {
    const ids: string[] = TIMELINE_1937.flatMap((e) => e.facts);
    for (const id of ids) expect(FACTS[id as keyof typeof FACTS], id).toBeDefined();
    const expected = Array.from({ length: 11 }, (_, i) => `H${i + 1}`);
    expect([...ids].sort()).toEqual([...expected].sort());
  });
});
