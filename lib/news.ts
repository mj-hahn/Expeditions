// Outside coverage: Google News RSS + Purdue's YouTube feed. Server-side; parsers are
// pure and defensive, fetching is cached like lib/dispatches.ts (errors never escape).
import { cacheLife, cacheTag } from "next/cache";
import * as cheerio from "cheerio";
import { siteUrl } from "@/content/site";

export type NewsItem = {
  id: string;
  title: string;
  outlet: string;
  outletHost: string;
  url: string;
  publishedAt: string;
  alsoIn: { outlet: string; url: string }[];
};
export type VideoItem = { id: string; title: string; url: string; thumbnail: string; publishedAt: string };

export const GOOGLE_NEWS_URL =
  "https://news.google.com/rss/search?q=Earhart+(Nikumaroro+OR+Taraia+OR+expedition)+when:21d&hl=en-US&gl=US&ceid=US:en";
export const YOUTUBE_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=UCOSY-LKMuJZn4HGsJZHfQDw";

const FEEDLY_UA = "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)";
const RETRY_WAITS_MS = [1500, 4000];
const MAX_ATTEMPTS = 3;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function looksLikeFeed(body: string): boolean {
  const t = body.trimStart();
  return t.startsWith("<?xml") || t.startsWith("<rss") || t.startsWith("<feed");
}

/** GET a feed as text. Retries 429/503/network errors/non-feed 200s; throws after 3 attempts. */
export async function fetchText(
  url: string,
  opts: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<string> {
  const sleep = opts.sleep ?? defaultSleep;
  const isGoogle = new URL(url).hostname.endsWith("news.google.com");
  const ua = isGoogle ? FEEDLY_UA : `LuisasLookout/1.0 (+${siteUrl()})`;
  let lastErr = "unknown error";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let retryable = true;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": ua, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      });
      if (res.ok) {
        const body = await res.text();
        if (looksLikeFeed(body)) return body;
        lastErr = "response was not a feed";
      } else {
        lastErr = `HTTP ${res.status}`;
        retryable = res.status === 429 || res.status === 503;
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    if (!retryable || attempt === MAX_ATTEMPTS - 1) break;
    await sleep(RETRY_WAITS_MS[attempt] ?? 4000);
  }
  throw new Error(`Feed fetch failed (${new URL(url).hostname}): ${lastErr}`);
}

// ---------- helpers ----------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const cp = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return m;
      return String.fromCodePoint(cp);
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

function clean(s: string): string {
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

/** FNV-1a 32-bit as 8 hex chars. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const TOPIC_RE = /earhart|nikumaroro|taraia/i;
const STOP_WORDS = new Set(["a", "an", "the", "of", "to", "in", "on", "for", "and", "is", "as", "with", "at", "her", "s"]);
const PREFERRED_HOSTS = new Set([
  "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "nbcnews.com", "cbsnews.com", "cnn.com",
  "theguardian.com", "nationalgeographic.com", "usatoday.com", "nytimes.com", "washingtonpost.com", "npr.org",
]);

function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[‘’'`"“”]/g, "") // quotes/apostrophes vanish (don't -> dont)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

// ---------- Google News ----------

/** "ABC News - Breaking News, Latest News and Videos" → "ABC News"; "Fox News | Politics" → "Fox News". */
export function shortOutlet(name: string): string {
  const short = name.split(/\s+[-–—|:]\s+/)[0].trim();
  return short.length >= 2 ? short : name;
}

export function parseGoogleNews(xml: string, now: Date): NewsItem[] {
  const $ = cheerio.load(xml, { xml: true });
  const maxMs = now.getTime() + 60 * 60 * 1000;
  type Cand = NewsItem & { words: Set<string>; norm: string; ms: number };
  const cands: Cand[] = [];

  $("item").each((_, el) => {
    const item = $(el);
    const rawTitle = clean(item.children("title").first().text());
    if (!TOPIC_RE.test(rawTitle)) return;
    const source = item.children("source").first();
    const fullOutlet = clean(source.text());
    const outletHost = hostOf(source.attr("url") ?? "");
    if (!fullOutlet || !outletHost || outletHost === "purdue.edu") return;
    const outlet = shortOutlet(fullOutlet);

    const suffix = ` - ${fullOutlet}`;
    const title = rawTitle.endsWith(suffix) ? rawTitle.slice(0, -suffix.length).trim() : rawTitle;
    if (!title || !TOPIC_RE.test(title)) return;

    const ms = Date.parse(item.children("pubDate").first().text().trim());
    if (!Number.isFinite(ms) || ms > maxMs) return;

    const link = item.children("link").first().text().trim();
    const guid = item.children("guid").first().text().trim();
    const url = link || guid;
    if (!/^https?:\/\//i.test(url)) return;

    const words = titleWords(title);
    cands.push({
      id: fnv1a(guid || link),
      title,
      outlet,
      outletHost,
      url,
      publishedAt: new Date(ms).toISOString(),
      alsoIn: [],
      words: new Set(words),
      norm: words.join(" "),
      ms,
    });
  });

  // Union-find over pairwise "same story" checks.
  const parent = cands.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) {
      const same = (cands[i].norm !== "" && cands[i].norm === cands[j].norm) || jaccard(cands[i].words, cands[j].words) >= 0.6;
      if (same) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, Cand[]>();
  cands.forEach((c, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(c);
    else groups.set(r, [c]);
  });

  const out: NewsItem[] = [];
  for (const members of groups.values()) {
    const byTime = [...members].sort((a, b) => a.ms - b.ms);
    const primary = byTime.find((m) => PREFERRED_HOSTS.has(m.outletHost)) ?? byTime[0];
    const seen = new Set<string>([primary.outlet]);
    const alsoIn: { outlet: string; url: string }[] = [];
    for (const m of byTime) {
      if (m === primary || seen.has(m.outlet)) continue;
      seen.add(m.outlet);
      alsoIn.push({ outlet: m.outlet, url: m.url });
    }
    out.push({
      id: primary.id,
      title: primary.title,
      outlet: primary.outlet,
      outletHost: primary.outletHost,
      url: primary.url,
      publishedAt: primary.publishedAt,
      alsoIn,
    });
  }
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

// ---------- YouTube ----------

const VIDEO_RE = /earhart|taraia|nikumaroro|amelia/i;

export function parseYouTube(xml: string): VideoItem[] {
  const $ = cheerio.load(xml, { xml: true });
  const out: VideoItem[] = [];
  $("entry").each((_, el) => {
    const e = $(el);
    const id = e.children("yt\\:videoId").first().text().trim();
    const title = clean(e.children("title").first().text());
    const description = e.find("media\\:description").first().text();
    if (!id || !title || !(VIDEO_RE.test(title) || VIDEO_RE.test(description))) return;
    const url = e.children('link[rel="alternate"]').first().attr("href")?.trim() ?? "";
    if (!url.startsWith("https://www.youtube.com/")) return;
    const ms = Date.parse(e.children("published").first().text().trim());
    if (!Number.isFinite(ms)) return;
    const thumb = e.find("media\\:thumbnail").first().attr("url")?.trim();
    out.push({
      id,
      title,
      url,
      thumbnail: thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: new Date(ms).toISOString(),
    });
  });
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

// ---------- cached loaders ----------

async function loadFeed(url: string, fixtureName: string): Promise<string> {
  // Local-dev escape hatch for working offline. Ignored in production.
  const dir = process.env.NEWS_FIXTURE_DIR;
  if (dir && process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    return readFile(`${dir}/${fixtureName}`, "utf8");
  }
  return fetchText(url);
}

export async function getNews(): Promise<NewsItem[]> {
  "use cache";
  cacheTag("news");
  try {
    const items = parseGoogleNews(await loadFeed(GOOGLE_NEWS_URL, "google-news.xml"), new Date());
    cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
    return items;
  } catch (err) {
    console.error("News fetch failed:", err instanceof Error ? err.message : err);
    // stale >= 5 min keeps this in the instant shell; revalidate still retries soon.
    cacheLife({ stale: 300, revalidate: 120, expire: 600 });
    return [];
  }
}

export async function getVideos(): Promise<VideoItem[]> {
  "use cache";
  cacheTag("videos");
  try {
    const items = parseYouTube(await loadFeed(YOUTUBE_URL, "youtube-purdue.xml"));
    cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
    return items;
  } catch (err) {
    console.error("Video fetch failed:", err instanceof Error ? err.message : err);
    cacheLife({ stale: 300, revalidate: 120, expire: 600 });
    return [];
  }
}
