// Runs against the real API capture when fixtures/purdue-posts.json exists.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { classify, parseWpDate, selectPosts } from "@/lib/purdue";
import { parseDispatchContent } from "@/lib/parse-dispatch";
import type { WpPost } from "@/lib/types";

const file = join(process.cwd(), "fixtures", "purdue-posts.json");
const exists = existsSync(file);

describe.skipIf(!exists)("purdue-posts.json fixture", () => {
  const posts: WpPost[] = exists ? JSON.parse(readFileSync(file, "utf8")) : [];
  const kept = selectPosts(posts);
  const BAD = [
    "The expedition is being supported by",
    "The Taraia Object expedition team includes",
    "Related coverage",
  ];

  it("keeps the known dispatches", () => {
    for (const id of [23872, 23963, 24057, 24123, 24243]) {
      const p = kept.find((k) => k.id === id);
      expect(p, `post ${id} present`).toBeDefined();
      expect(classify(p!.title.rendered)).toBe("dispatch");
    }
    const p = kept.find((k) => k.id === 24243)!;
    expect(parseWpDate(p.date_gmt).toISOString()).toBe("2026-10-12T14:16:09.000Z");
  });

  for (const post of kept) {
    it(`parses post ${post.id} cleanly`, () => {
      const r = parseDispatchContent(post.content.rendered, post.excerpt.rendered);
      expect(r.fallback).toBe(false);
      expect(r.lead.length).toBeGreaterThan(0);
      expect(r.blocks.some((b) => b.type === "paragraph")).toBe(true);
      for (const b of r.blocks) {
        const text = b.type === "paragraph" || b.type === "heading" ? b.text : "";
        for (const bad of BAD) expect(text).not.toContain(bad);
        if (b.type === "heading") expect(text.startsWith("About ")).toBe(false);
      }
    });
  }
});
