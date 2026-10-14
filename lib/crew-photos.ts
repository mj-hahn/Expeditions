// Official crew portraits from the expedition site (SPEC §4.4 "optional"). Server only.
// The site's media API is closed, so we read each crew page's og:image. Any failure
// just means no portrait: the crew card keeps its initials.
import * as cheerio from "cheerio";
import { cacheLife, cacheTag } from "next/cache";
import { siteUrl } from "@/content/site";

const API = "https://amelia.prf.org/wp-json/wp/v2/crew?_fields=title,link,featured_media";

export type CrewPortrait = { name: string; src: string; page: string };

const UA = () => `LuisasLookout/1.0 (+${siteUrl()})`;

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** The crew member's featured image (img.wp-image-{mediaId}) from their page, else og:image. */
export function portraitFromHtml(html: string, mediaId?: number): string | null {
  const $ = cheerio.load(html);
  const featured = mediaId ? $(`img.wp-image-${mediaId}`).first().attr("src") : undefined;
  const img =
    featured || $('meta[property="og:image"]').attr("content") || $("img.wp-post-image").first().attr("src");
  if (!img) return null;
  try {
    const u = new URL(img, "https://amelia.prf.org/");
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Portraits keyed by normalized name. Never throws. */
export async function getCrewPortraits(): Promise<Record<string, CrewPortrait>> {
  "use cache";
  cacheTag("crew-portraits");
  const out: Record<string, CrewPortrait> = {};
  try {
    const res = await fetch(API, { headers: { "User-Agent": UA() }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`crew API ${res.status}`);
    const list = (await res.json()) as { title?: { rendered?: string }; link?: string; featured_media?: number }[];
    await Promise.all(
      list.map(async (c) => {
        const name = cheerio.load(c.title?.rendered ?? "").root().text().trim();
        if (!name || !c.link?.startsWith("https://amelia.prf.org/")) return;
        const page = await fetch(c.link, { headers: { "User-Agent": UA() }, signal: AbortSignal.timeout(10000) });
        if (!page.ok) return;
        const src = portraitFromHtml(await page.text(), c.featured_media);
        if (src) out[normalizeName(name)] = { name, src, page: c.link };
      }),
    );
  } catch (err) {
    console.error("Crew portraits unavailable:", err instanceof Error ? err.message : err);
  }
  // A day when we found some; retry within the hour when we found none.
  // stale >= 5 min keeps the result in the instant shell.
  if (Object.keys(out).length) cacheLife({ stale: 300, revalidate: 86400, expire: 604800 });
  else cacheLife({ stale: 300, revalidate: 3600, expire: 7200 });
  return out;
}
