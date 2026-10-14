// NOTE: posts below are SYNTHETIC, shaped like the WP REST API (SPEC §4.1).
import { describe, it, expect } from "vitest";
import {
  buildPostsUrl, classify, heroFromPost, parseWpDate, postsToDispatches,
  selectPosts, shortTitle, toDispatch, userAgent,
} from "@/lib/purdue";
import type { WpPost } from "@/lib/types";

function post(id: number, title: string, date: string, content = "<p>Body.</p>"): WpPost {
  return {
    id, slug: `post-${id}`, link: `https://www.purdue.edu/newsroom/post-${id}/`,
    date_gmt: date, modified_gmt: date,
    title: { rendered: title }, excerpt: { rendered: "<p>Excerpt</p>" },
    content: { rendered: content }, featured_media: 0,
  };
}
const none = { include: [], exclude: [] };

describe("parseWpDate", () => {
  it("appends Z when there is no zone", () => {
    expect(parseWpDate("2026-10-12T14:16:09").toISOString()).toBe("2026-10-12T14:16:09.000Z");
  });
  it("leaves Z and offsets alone", () => {
    expect(parseWpDate("2026-10-12T14:16:09Z").toISOString()).toBe("2026-10-12T14:16:09.000Z");
    expect(parseWpDate("2026-10-12T14:16:09+00:00").toISOString()).toBe("2026-10-12T14:16:09.000Z");
    expect(parseWpDate("2026-10-12T10:16:09-04:00").toISOString()).toBe("2026-10-12T14:16:09.000Z");
  });
  it("returns Invalid Date for garbage", () => {
    expect(Number.isNaN(parseWpDate("nope").getTime())).toBe(true);
  });
});

describe("url and headers", () => {
  it("builds the list URL", () => {
    const u = new URL(buildPostsUrl());
    expect(u.searchParams.get("search")).toBe("earhart");
    expect(u.searchParams.get("after")).toBe("2026-09-01T00:00:00");
    expect(u.searchParams.get("per_page")).toBe("30");
    expect(u.searchParams.get("_embed")).toBe("wp:featuredmedia");
  });
  it("has a polite user agent", () => {
    expect(userAgent()).toMatch(/^LuisasLookout\/1\.0 \(\+.+\)$/);
  });
});

describe("selectPosts", () => {
  it("drops body-only matches", () => {
    const p = post(1, "Move-in day at Purdue residence halls", "2026-09-10T00:00:00", "<p>Earhart Hall</p>");
    expect(selectPosts([p], none)).toEqual([]);
  });
  it("drops posts before the cutoff", () => {
    expect(selectPosts([post(2, "Earhart Hall dining reopens", "2026-08-01T00:00:00")], none)).toEqual([]);
  });
  it("keeps title matches incl. entity-encoded and other keywords", () => {
    const ps = [
      post(3, "Earhart expedition update: Crew &amp; boat", "2026-10-02T21:14:00"),
      post(4, "Nikumaroro survey", "2026-10-03T00:00:00"),
      post(5, "Taraia Object news", "2026-10-04T00:00:00"),
    ];
    expect(selectPosts(ps, none).map((p) => p.id)).toEqual([5, 4, 3]);
  });
  it("applies include and exclude, exclude wins", () => {
    const a = post(10, "Unrelated title", "2026-09-05T00:00:00");
    const b = post(11, "Earhart expedition update: x", "2026-10-05T00:00:00");
    expect(selectPosts([a, b], { include: [10], exclude: [] }).map((p) => p.id)).toEqual([11, 10]);
    expect(selectPosts([a, b], { include: [10], exclude: [10, 11] })).toEqual([]);
  });
  it("drops invalid dates, de-dupes by id, sorts newest first", () => {
    const ps = [
      post(20, "Earhart a", "2026-09-05T00:00:00"),
      post(21, "Earhart b", "garbage"),
      post(22, "Earhart c", "2026-10-01T00:00:00"),
      post(20, "Earhart a dup", "2026-09-05T00:00:00"),
    ];
    const out = selectPosts(ps, { include: [21], exclude: [] });
    expect(out.map((p) => p.id)).toEqual([22, 20]);
  });
});

describe("classify and shortTitle", () => {
  const t = "Earhart expedition update: Crew arrives at Nikumaroro, launches critical phase of Amelia Earhart&#8217;s plane search";
  it("classifies", () => {
    expect(classify(t)).toBe("dispatch");
    expect(classify("EARHART EXPEDITION UPDATE: x")).toBe("dispatch");
    expect(classify("1 week out: Countdown to the search for Amelia Earhart&#8217;s plane begins")).toBe("background");
  });
  it("shortens titles", () => {
    expect(shortTitle(t)).toBe("Crew arrives at Nikumaroro, launches critical phase of Amelia Earhart’s plane search");
    expect(shortTitle("earhart  expedition   update :  crew at sea")).toBe("Crew at sea");
    expect(shortTitle("1 week out")).toBe("1 week out");
  });
});

describe("toDispatch", () => {
  it("maps a normal post", () => {
    const d = toDispatch(
      post(24243, "Earhart expedition update: Crew &amp; co", "2026-10-12T14:16:09",
        '<p class="wp-block-paragraph">NIKUMARORO, Kiribati &#8212; Landed.</p><p class="wp-block-paragraph">More.</p>'),
    );
    expect(d).toMatchObject({
      id: 24243, kind: "dispatch", title: "Earhart expedition update: Crew & co",
      dateline: "NIKUMARORO, Kiribati", lead: "Landed.",
    });
    expect(d.publishedAt.toISOString()).toBe("2026-10-12T14:16:09.000Z");
    expect(d.fallback).toBeUndefined();
  });
  it("never throws on garbage content", () => {
    const bad = { id: 1, slug: "s", link: "l", date_gmt: "x", title: {}, content: null, excerpt: null } as unknown as WpPost;
    expect(() => toDispatch(bad)).not.toThrow();
    expect(toDispatch(bad).fallback).toBe(true);
    expect(() => toDispatch(post(2, "Earhart", "2026-10-01T00:00:00", "<<<>>><p"))).not.toThrow();
  });
  it("falls back to excerpt when no paragraphs", () => {
    const d = toDispatch(post(3, "Earhart x", "2026-10-01T00:00:00", ""));
    expect(d.fallback).toBe(true);
    expect(d.lead).toBe("Excerpt");
  });
  it("postsToDispatches filters and maps", () => {
    const ds = postsToDispatches([
      post(1, "Unrelated", "2026-10-01T00:00:00"),
      post(2, "Earhart expedition update: a", "2026-10-02T00:00:00"),
    ]);
    expect(ds.map((d) => d.id)).toEqual([2]);
  });
});

describe("heroFromPost", () => {
  const withMedia = (m: object): WpPost => ({
    ...post(1, "Earhart &amp; title", "2026-10-01T00:00:00"),
    _embedded: { "wp:featuredmedia": [m as never] },
  });
  it("builds a sorted, de-duplicated srcSet", () => {
    const h = heroFromPost(withMedia({
      source_url: "https://x.test/full.jpg",
      alt_text: "",
      caption: { rendered: "<p>Cap &amp; text</p>" },
      media_details: {
        width: 2000, height: 1000,
        sizes: {
          large: { source_url: "https://x.test/l.jpg", width: 1024, height: 512 },
          thumb: { source_url: "https://x.test/t.jpg", width: 150, height: 75 },
          full: { source_url: "https://x.test/full.jpg", width: 2000, height: 1000 },
          dup: { source_url: "https://x.test/l.jpg", width: 1024, height: 512 },
        },
      },
    }));
    expect(h).toEqual({
      src: "https://x.test/full.jpg",
      srcSet: "https://x.test/t.jpg 150w, https://x.test/l.jpg 1024w, https://x.test/full.jpg 2000w",
      alt: "Cap & text", caption: "Cap & text", width: 2000, height: 1000,
    });
  });
  it("alt falls back to title; undefined without source_url", () => {
    expect(heroFromPost(withMedia({ source_url: "https://x.test/a.jpg" }))?.alt).toBe("Earhart & title");
    expect(heroFromPost(withMedia({}))).toBeUndefined();
    expect(heroFromPost(post(1, "t", "2026-10-01T00:00:00"))).toBeUndefined();
  });
});
