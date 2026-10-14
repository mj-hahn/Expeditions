import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchText, parseGoogleNews, parseYouTube } from "@/lib/news";

const fx = (name: string) => readFileSync(join(process.cwd(), "fixtures", "news", name), "utf8");
const NOW = new Date("2026-10-14T20:00:00Z");

function item(o: { title: string; outlet: string; host: string; date: string; guid?: string }): string {
  const guid = o.guid ?? `${o.outlet}-${o.title}`;
  return `<item><title>${o.title} - ${o.outlet}</title><link>https://news.google.com/rss/articles/${encodeURIComponent(guid)}</link><guid isPermaLink="false">${guid}</guid><pubDate>${o.date}</pubDate><source url="https://${o.host}">${o.outlet}</source></item>`;
}
const feed = (...items: string[]) => `<?xml version="1.0"?><rss version="2.0"><channel>${items.join("")}</channel></rss>`;

describe("parseGoogleNews (real fixture)", () => {
  const items = parseGoogleNews(fx("google-news.xml"), NOW);

  it("returns a healthy list without Purdue newsroom items", () => {
    expect(items.length).toBeGreaterThan(15);
    expect(items.some((i) => i.outletHost === "purdue.edu")).toBe(false);
  });
  it("has clean, on-topic titles", () => {
    for (const i of items) {
      expect(i.title).toMatch(/earhart|nikumaroro|taraia/i);
      expect(i.title.endsWith(` - ${i.outlet}`)).toBe(false);
    }
  });
  it("is sorted newest first with unique ids", () => {
    const times = items.map((i) => Date.parse(i.publishedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("collapses syndicated copies", () => {
    expect(items.some((i) => i.alsoIn.length >= 1)).toBe(true);
  });
  it("includes major outlets as primaries", () => {
    const outlets = items.map((i) => i.outlet);
    expect(outlets).toContain("Reuters");
    expect(outlets).toContain("The Guardian");
    expect(outlets).toContain("NBC News");
  });
});

describe("parseGoogleNews (synthetic)", () => {
  it("strips the trailing outlet suffix only when it is exactly the outlet", () => {
    const xml = feed(item({ title: "Earhart search heats up", outlet: "WTHR", host: "www.wthr.com", date: "Tue, 13 Oct 2026 10:00:00 GMT" }));
    expect(parseGoogleNews(xml, NOW)[0].title).toBe("Earhart search heats up");
    const odd = xml.replace("</title>", "</title>").replace("Earhart search heats up - WTHR", "Earhart search heats up - Other");
    expect(parseGoogleNews(odd, NOW)[0].title).toBe("Earhart search heats up - Other");
  });

  it("excludes purdue.edu but keeps stories.purdue.edu and the Exponent", () => {
    const xml = feed(
      item({ title: "Earhart update one", outlet: "Purdue University", host: "www.purdue.edu", date: "Tue, 13 Oct 2026 10:00:00 GMT" }),
      item({ title: "Taraia object survey begins", outlet: "Purdue Stories", host: "stories.purdue.edu", date: "Tue, 13 Oct 2026 11:00:00 GMT" }),
      item({ title: "Nikumaroro crew lands, students react", outlet: "Purdue Exponent", host: "www.purdueexponent.org", date: "Tue, 13 Oct 2026 12:00:00 GMT" }),
    );
    expect(parseGoogleNews(xml, NOW).map((i) => i.outletHost).sort()).toEqual(["purdueexponent.org", "stories.purdue.edu"]);
  });

  it("dedupes identical titles but not different stories", () => {
    const xml = feed(
      item({ title: "Earhart search team reaches Nikumaroro", outlet: "Fox 59", host: "fox59.com", date: "Tue, 13 Oct 2026 10:00:00 GMT" }),
      item({ title: "Earhart search team reaches Nikumaroro", outlet: "WXIN", host: "wxin.com", date: "Tue, 13 Oct 2026 11:00:00 GMT" }),
      item({ title: "Earhart search team reaches Nikumaroro", outlet: "Fox 59", host: "fox59.com", date: "Tue, 13 Oct 2026 12:00:00 GMT", guid: "dup" }),
      item({ title: "Scientists debate Taraia object sonar images", outlet: "Newsweek", host: "newsweek.com", date: "Tue, 13 Oct 2026 13:00:00 GMT" }),
    );
    const out = parseGoogleNews(xml, NOW);
    expect(out).toHaveLength(2);
    const group = out.find((i) => i.title.includes("reaches"))!;
    expect(group.outlet).toBe("Fox 59");
    expect(group.alsoIn.map((a) => a.outlet)).toEqual(["WXIN"]);
  });

  it("dedupes near-identical titles at Jaccard >= 0.6", () => {
    const xml = feed(
      item({ title: "Amelia Earhart search team lands on Nikumaroro island", outlet: "A", host: "a.com", date: "Tue, 13 Oct 2026 10:00:00 GMT" }),
      item({ title: "Amelia Earhart search team lands on Nikumaroro", outlet: "B", host: "b.com", date: "Tue, 13 Oct 2026 11:00:00 GMT" }),
    );
    expect(parseGoogleNews(xml, NOW)).toHaveLength(1);
  });

  it("prefers a preferred outlet as primary, else the earliest", () => {
    const xml = feed(
      item({ title: "Earhart expedition finds possible debris", outlet: "Local", host: "local.com", date: "Tue, 13 Oct 2026 08:00:00 GMT" }),
      item({ title: "Earhart expedition finds possible debris", outlet: "CNN", host: "www.cnn.com", date: "Tue, 13 Oct 2026 12:00:00 GMT" }),
      item({ title: "Earhart expedition finds possible debris", outlet: "Reuters", host: "www.reuters.com", date: "Tue, 13 Oct 2026 14:00:00 GMT" }),
    );
    const [only] = parseGoogleNews(xml, NOW);
    expect(only.outlet).toBe("CNN");
    expect(only.alsoIn.map((a) => a.outlet)).toEqual(["Local", "Reuters"]);
  });

  it("drops items dated more than an hour in the future or invalid", () => {
    const xml = feed(
      item({ title: "Earhart future story", outlet: "A", host: "a.com", date: "Wed, 14 Oct 2026 22:00:00 GMT" }),
      item({ title: "Earhart soon story", outlet: "B", host: "b.com", date: "Wed, 14 Oct 2026 20:30:00 GMT" }),
      item({ title: "Earhart broken date story", outlet: "C", host: "c.com", date: "not a date" }),
    );
    expect(parseGoogleNews(xml, NOW).map((i) => i.outlet)).toEqual(["B"]);
  });
});

describe("parseYouTube (real fixture)", () => {
  const videos = parseYouTube(fx("youtube-purdue.xml"));
  it("keeps only expedition videos with watch urls", () => {
    expect(videos.length).toBeGreaterThanOrEqual(5);
    for (const v of videos) {
      expect(v.url.startsWith("https://www.youtube.com/")).toBe(true); // the feed also has /shorts/ urls
      expect(v.thumbnail).toMatch(/^https:\/\//);
    }
    expect(videos.map((v) => v.title)).toContain("Earhart Expedition: The Team Arrives at Nikumaroro");
  });
  it("is newest first", () => {
    const t = videos.map((v) => Date.parse(v.publishedAt));
    expect(t).toEqual([...t].sort((a, b) => b - a));
  });
});

describe("fetchText retry", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("succeeds on the third attempt after two 503s (injected sleep)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response('<?xml version="1.0"?><rss></rss>', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const waits: number[] = [];
    const body = await fetchText("https://news.google.com/rss/search?q=x", { sleep: async (ms) => void waits.push(ms) });
    expect(body).toContain("<rss");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([1500, 4000]);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ "User-Agent": expect.stringContaining("Feedly") });
  });

  it("throws after three failed attempts, including non-feed 200s", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response("<html>Sorry</html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchText("https://www.youtube.com/feeds/videos.xml?channel_id=x", { sleep: async () => {} })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("shortOutlet", () => {
  it("trims taglines after a separator and keeps plain names", async () => {
    const { shortOutlet } = await import("@/lib/news");
    expect(shortOutlet("ABC News - Breaking News, Latest News and Videos")).toBe("ABC News");
    expect(shortOutlet("Fox News | Politics")).toBe("Fox News");
    expect(shortOutlet("The Guardian")).toBe("The Guardian");
    expect(shortOutlet("starcitytv.com")).toBe("starcitytv.com");
  });
});
