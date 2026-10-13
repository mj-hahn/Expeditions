// Parses Purdue Newsroom post HTML into typed blocks (SPEC §4.2).
// Server-side only: never import this from a client component.
// (No `server-only` import so that Vitest can load it.)
import * as cheerio from "cheerio";
import type { Block, Photo } from "@/lib/types";

const BASE = "https://www.purdue.edu/";

export type ParsedDispatch = {
  dateline?: string;
  lead: string;
  blocks: Block[];
  photos: Photo[];
  fallback: boolean;
};

function clean(s: string): string {
  return s.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Decode entities, strip tags, collapse whitespace. */
export function htmlToText(html: string): string {
  if (!html) return "";
  const $ = cheerio.load(html, null, false);
  return clean($.root().text());
}

function resolveUrl(u: string): string | undefined {
  try {
    return new URL(u.trim(), BASE).href;
  } catch {
    return undefined;
  }
}

function resolveSrcSet(s: string): string {
  return s
    .split(",")
    .map((part) => {
      const [u, ...rest] = part.trim().split(/\s+/);
      if (!u) return "";
      const abs = u.startsWith("data:") ? undefined : resolveUrl(u);
      return abs ? [abs, ...rest].join(" ") : "";
    })
    .filter(Boolean)
    .join(", ");
}

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

type $ = cheerio.CheerioAPI;
type AnyNode = Parameters<$>[0] extends infer T ? Extract<T, { type: string }> : never;
type Element = Extract<AnyNode, { name: string }>;

function photoFromImg($: $, img: Element, caption?: string): Photo | undefined {
  const el = $(img);
  const raw = [el.attr("src"), el.attr("data-src"), el.attr("data-lazy-src")]
    .map((v) => (v ?? "").trim())
    .find((v) => v && !v.startsWith("data:"));
  if (!raw) return undefined;
  const src = resolveUrl(raw);
  if (!src) return undefined;
  const cap = caption ? clean(caption) : "";
  const photo: Photo = { src, alt: clean(el.attr("alt") ?? "") || cap };
  const ss = (el.attr("srcset") ?? el.attr("data-srcset") ?? "").trim();
  if (ss) {
    const r = resolveSrcSet(ss);
    if (r) photo.srcSet = r;
  }
  const w = num(el.attr("width"));
  const h = num(el.attr("height"));
  if (w) photo.width = w;
  if (h) photo.height = h;
  if (cap) photo.caption = cap;
  return photo;
}

function stripBoilerplate($: $): void {
  $(
    ".purdue-home-quick-links-static, #note, .post-content__attribution, script, style, noscript",
  ).remove();

  $("h2").each((_, h) => {
    const h2 = $(h);
    if (!clean(h2.text()).startsWith("About ")) return;
    h2.nextUntil("h2").remove();
    h2.remove();
  });

  $("p").each((_, p) => {
    const el = $(p);
    const t = clean(el.text());
    if (t.startsWith("The expedition is being supported by")) {
      el.remove();
    } else if (t.startsWith("The Taraia Object expedition team includes")) {
      const next = el.next();
      if (next.length && /^(ul|ol)$/i.test(next.prop("tagName") ?? "")) {
        next.remove();
      }
      el.remove();
    }
  });

  $("h1, h2, h3, h4, h5, h6, p, strong").each((_, h) => {
    const el = $(h);
    if (clean(el.text()).toLowerCase() !== "related coverage") return;
    const tag = (el.prop("tagName") ?? "").toLowerCase();
    if (tag === "strong") return; // handled via its paragraph
    const next = el.next();
    if (next.length && /^(ul|ol|div|section|nav|aside)$/i.test(next.prop("tagName") ?? "")) {
      next.remove();
    }
    el.remove();
  });
}

function galleryPhotos($: $, carousel: Element): Photo[] {
  const c = $(carousel);
  const imgs = c.find(".purdue-home-cta-carousel__card-image img").toArray();
  const stories = c.find(".purdue-home-cta-carousel__story-content").toArray();
  const out: Photo[] = [];
  imgs.forEach((img, i) => {
    let caption: string | undefined;
    let node = $(img).parent();
    while (node.length && !node.is(c)) {
      const own = node.find(".purdue-home-cta-carousel__story-content");
      if (own.length) {
        const slideImgs = node.find(".purdue-home-cta-carousel__card-image img");
        if (slideImgs.length === 1) caption = clean(own.first().text());
        break;
      }
      node = node.parent();
    }
    if (caption === undefined && stories.length === imgs.length) {
      caption = clean($(stories[i]).text());
    }
    const p = photoFromImg($, img, caption || undefined);
    if (p) out.push(p);
  });
  return out;
}

function walk($: $, nodes: AnyNode[], blocks: Block[]): void {
  for (const node of nodes) {
    if (node.type !== "tag") continue;
    const el = node as Element;
    const $el = $(el);
    const tag = el.name.toLowerCase();

    if ($el.hasClass("purdue-home-cta-carousel")) {
      const photos = galleryPhotos($, el);
      if (photos.length) blocks.push({ type: "gallery", photos });
      continue;
    }
    if (tag === "figure") {
      const img = $el.find("img").first();
      if (img.length) {
        const cap = clean($el.find("figcaption").first().text());
        const photo = photoFromImg($, img.get(0) as Element, cap || undefined);
        if (photo) blocks.push({ type: "figure", photo });
        continue;
      }
    }
    if (tag === "p") {
      const text = clean($el.text());
      if (text) {
        blocks.push({
          type: "paragraph",
          text,
          isQuote: text.startsWith("“") || text.startsWith('"'),
        });
      }
      continue;
    }
    if (tag === "h2" || tag === "h3") {
      const text = clean($el.text());
      if (text) blocks.push({ type: "heading", text });
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      $el.children("li").each((_, li) => {
        const text = clean($(li).text());
        if (text) blocks.push({ type: "paragraph", text: `• ${text}`, isQuote: false });
      });
      continue;
    }
    walk($, $el.contents().toArray(), blocks);
  }
}

function splitDateline(text: string): { dateline?: string; lead: string } {
  const m = /[—–]/.exec(text);
  if (m && m.index < 80) {
    const before = text.slice(0, m.index).trim().replace(/,+$/, "").trim();
    const after = text.slice(m.index + 1).trim();
    if (before && after && !/\.\s/.test(before)) {
      return { dateline: before, lead: after };
    }
  }
  return { lead: text };
}

function excerptText(excerptHtml: string): string {
  return htmlToText(excerptHtml)
    .replace(/\s*(\[\s*(…|&hellip;|\.\.\.)\s*\]|…|\.\.\.)\s*$/, "")
    .trim();
}

function fallbackResult(excerptHtml: string): ParsedDispatch {
  let lead = "";
  try {
    lead = excerptText(excerptHtml);
  } catch {
    lead = "";
  }
  return { lead, blocks: [], photos: [], fallback: true };
}

export function parseDispatchContent(
  contentHtml: string,
  excerptHtml: string,
): ParsedDispatch {
  try {
    const $ = cheerio.load(contentHtml ?? "", null, false);
    stripBoilerplate($);
    const blocks: Block[] = [];
    walk($, $.root().contents().toArray(), blocks);

    const firstIdx = blocks.findIndex((b) => b.type === "paragraph");
    if (firstIdx === -1) return fallbackResult(excerptHtml);
    const first = blocks[firstIdx] as Extract<Block, { type: "paragraph" }>;
    const { dateline, lead } = splitDateline(first.text);
    blocks.splice(firstIdx, 1);

    const seen = new Set<string>();
    const photos: Photo[] = [];
    const add = (p: Photo) => {
      if (!seen.has(p.src)) {
        seen.add(p.src);
        photos.push(p);
      }
    };
    for (const b of blocks) {
      if (b.type === "figure") add(b.photo);
      else if (b.type === "gallery") b.photos.forEach(add);
    }

    const result: ParsedDispatch = { lead, blocks, photos, fallback: false };
    if (dateline) result.dateline = dateline;
    return result;
  } catch {
    return fallbackResult(excerptHtml);
  }
}
