import { describe, expect, it } from "vitest";
import { createLabeler, labelBox } from "@/components/globe/labels";

describe("labelBox", () => {
  it("places the box by anchor", () => {
    const start = labelBox(100, 50, "abcd", "start");
    const end = labelBox(100, 50, "abcd", "end");
    const mid = labelBox(100, 50, "abcd", "middle");
    expect(start.x0).toBe(100);
    expect(end.x1).toBe(100);
    expect(mid.x0 + (mid.x1 - mid.x0) / 2).toBe(100);
    expect(start.y1 - start.y0).toBe(20);
  });
});

describe("createLabeler", () => {
  it("rejects a label that overlaps an earlier claim, first come first served", () => {
    const l = createLabeler();
    expect(l.claim(100, 100, "Tarawa", "start")).toBe(true);
    expect(l.claim(110, 104, "Nadi", "start")).toBe(false);
    expect(l.claim(100, 160, "Nadi", "start")).toBe(true);
  });

  it("lets a forced label through and still reserves its space", () => {
    const l = createLabeler();
    l.claim(100, 100, "Lae", "start");
    expect(l.claim(100, 100, "Howland", "start", true)).toBe(true);
    expect(l.claim(105, 100, "Itasca", "start")).toBe(false);
  });

  it("treats reserved boxes as occupied and touching edges as free", () => {
    const l = createLabeler();
    l.reserve({ x0: 0, x1: 24, y0: 0, y1: 24 });
    expect(l.claim(10, 10, "x", "start")).toBe(false);
    expect(l.claim(24, 10, "x", "start")).toBe(true);
  });
});
