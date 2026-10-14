// Cached dispatch list for pages (SPEC §4.1: ISR every 10 minutes, tag "dispatches").
import { readFile } from "node:fs/promises";
import { cacheLife, cacheTag } from "next/cache";
import { fetchPurduePosts, postsToDispatches } from "@/lib/purdue";
import type { Dispatch, WpPost } from "@/lib/types";

async function loadPosts(): Promise<WpPost[]> {
  // Local-dev escape hatch for working offline: point at a saved API response.
  // Ignored in production so the live site always reads Purdue.
  const file = process.env.PURDUE_FIXTURE_FILE;
  if (file && process.env.NODE_ENV !== "production") {
    return JSON.parse(await readFile(file, "utf8")) as WpPost[];
  }
  return fetchPurduePosts();
}

async function getDispatchesCached(): Promise<Dispatch[]> {
  "use cache";
  cacheTag("dispatches");
  try {
    const dispatches = postsToDispatches(await loadPosts());
    cacheLife({ stale: 300, revalidate: 600, expire: 60 * 60 * 24 * 30 });
    return dispatches;
  } catch (err) {
    // Errors can't escape a cache scope without failing the render, so cache
    // the outage briefly and try again soon. Pages show a friendly empty state.
    console.error("Purdue fetch failed:", err instanceof Error ? err.message : err);
    // stale >= 5 min keeps this in the instant shell; revalidate still retries soon.
    cacheLife({ stale: 300, revalidate: 60, expire: 600 });
    return [];
  }
}

/** All kept posts, newest first. Never throws: an outage shows an empty state. */
export async function getDispatches(): Promise<Dispatch[]> {
  return getDispatchesCached();
}

export async function getDispatchBySlug(slug: string) {
  const all = await getDispatches();
  const index = all.findIndex((d) => d.slug === slug);
  if (index === -1) return null;
  return {
    dispatch: all[index],
    /** Newer post (published after this one). */
    newer: index > 0 ? all[index - 1] : undefined,
    /** Older post (published before this one). */
    older: index < all.length - 1 ? all[index + 1] : undefined,
  };
}
