import { describe, expect, it } from "vitest";
import { newSince } from "@/lib/last-visit";

const items = [
  { slug: "c", publishedAt: "2026-10-14T20:00:00Z" },
  { slug: "b", publishedAt: "2026-10-13T20:45:00Z" },
  { slug: "a", publishedAt: "2026-10-12T14:16:09Z" },
];

describe("newSince", () => {
  it("returns nothing on a first visit or bad input", () => {
    expect(newSince(items, null)).toEqual([]);
    expect(newSince(items, undefined)).toEqual([]);
    expect(newSince(items, "not a date")).toEqual([]);
  });
  it("returns dispatches published after the previous visit", () => {
    expect(newSince(items, "2026-10-13T00:00:00Z").map((d) => d.slug)).toEqual(["c", "b"]);
    expect(newSince(items, "2026-10-15T00:00:00Z")).toEqual([]);
  });
});
