// Purdue Newsroom (WordPress REST) fetching, filtering and mapping (SPEC §4.1).
import { siteUrl } from "@/content/site";
import defaultSources from "@/content/sources.json";
import type { Dispatch, DispatchKind, Photo, WpPost } from "@/lib/types";
import { htmlToText, parseDispatchContent } from "@/lib/parse-dispatch";

export const PURDUE_API = "https://www.purdue.edu/newsroom/wp-json/wp/v2/posts";
export const SINCE = "2026-09-01T00:00:00";
export const TITLE_RE = /earhart|taraia|nikumaroro/i;

export function buildPostsUrl(): string {
  const u = new URL(PURDUE_API);
  u.searchParams.set("search", "earhart");
  u.searchParams.set("after", SINCE);
  u.searchParams.set("orderby", "date");
  u.searchParams.set("order", "desc");
  u.searchParams.set("per_page", "30");
  u.searchParams.set("_embed", "wp:featuredmedia");
  return u.toString();
}

export function userAgent(): string {
  return `TaraiaWatch/1.0 (+${siteUrl()})`;
}

export async function fetchPurduePosts(init?: RequestInit): Promise<WpPost[]> {
  const res = await fetch(buildPostsUrl(), {
    ...init,
    headers: {
      "User-Agent": userAgent(),
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
    signal: init?.signal ?? AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Purdue newsroom API responded ${res.status} ${res.statusText}`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Purdue newsroom API returned a non-array response");
  }
  return data as WpPost[];
}

/** WordPress `date_gmt` has no zone suffix; treat it as UTC. */
export function parseWpDate(s: string): Date {
  const str = String(s ?? "").trim();
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(str);
  return new Date(hasZone ? str : `${str}Z`);
}

export function classify(title: string): DispatchKind {
  return /^earhart expedition update/i.test(htmlToText(title)) ? "dispatch" : "background";
}

export function shortTitle(title: string): string {
  const t = htmlToText(title).replace(/^earhart\s+expedition\s+update\s*:\s*/i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function selectPosts(
  posts: WpPost[],
  sources: { include: number[]; exclude: number[] } = defaultSources,
  since: Date = new Date("2026-09-01T00:00:00Z"),
): WpPost[] {
  const seen = new Set<number>();
  const kept: Array<{ post: WpPost; t: number }> = [];
  for (const post of posts) {
    if (seen.has(post.id) || sources.exclude.includes(post.id)) continue;
    const d = parseWpDate(post.date_gmt);
    const t = d.getTime();
    if (Number.isNaN(t)) continue;
    const matches = TITLE_RE.test(htmlToText(post.title?.rendered ?? "")) && t >= since.getTime();
    if (!matches && !sources.include.includes(post.id)) continue;
    seen.add(post.id);
    kept.push({ post, t });
  }
  return kept.sort((a, b) => b.t - a.t).map((k) => k.post);
}

export function heroFromPost(post: WpPost): Photo | undefined {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media?.source_url) return undefined;
  const caption = htmlToText(media.caption?.rendered ?? "");
  const sizes = Object.values(media.media_details?.sizes ?? {}).filter(
    (s) => s && s.source_url && s.width,
  );
  sizes.sort((a, b) => a.width - b.width);
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const s of sizes) {
    if (seen.has(s.source_url)) continue;
    seen.add(s.source_url);
    parts.push(`${s.source_url} ${s.width}w`);
  }
  const photo: Photo = {
    src: media.source_url,
    alt: (media.alt_text ?? "").trim() || caption || htmlToText(post.title?.rendered ?? ""),
  };
  if (parts.length) photo.srcSet = parts.join(", ");
  if (media.media_details?.width) photo.width = media.media_details.width;
  if (media.media_details?.height) photo.height = media.media_details.height;
  if (caption) photo.caption = caption;
  return photo;
}

export function toDispatch(post: WpPost): Dispatch {
  const title = htmlToText(post?.title?.rendered ?? "");
  const publishedAt = parseWpDate(post?.date_gmt);
  const modified = parseWpDate(post?.modified_gmt);
  const updatedAt = Number.isNaN(modified.getTime()) ? publishedAt : modified;
  const base = {
    id: post?.id,
    slug: post?.slug,
    url: post?.link,
    publishedAt,
    updatedAt,
    kind: classify(title),
    title,
  };
  let hero: Photo | undefined;
  try {
    hero = heroFromPost(post);
  } catch {
    hero = undefined;
  }
  try {
    const c = parseDispatchContent(post.content?.rendered ?? "", post.excerpt?.rendered ?? "");
    const d: Dispatch = {
      ...base,
      lead: c.lead,
      blocks: c.blocks,
      photos: c.photos,
      ...(c.dateline ? { dateline: c.dateline } : {}),
      ...(hero ? { hero } : {}),
      ...(c.fallback ? { fallback: true } : {}),
    };
    return d;
  } catch {
    let lead = "";
    try {
      lead = htmlToText(post?.excerpt?.rendered ?? "");
    } catch {
      lead = "";
    }
    return { ...base, lead, blocks: [], photos: [], ...(hero ? { hero } : {}), fallback: true };
  }
}

export function postsToDispatches(posts: WpPost[]): Dispatch[] {
  return selectPosts(posts).map(toDispatch);
}
