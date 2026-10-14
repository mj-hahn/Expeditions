"use client";

import { useSyncExternalStore } from "react";

// Remembers when she last opened the site, on her phone only (no account, no server).
// The previous visit is captured once per browser session, so reloading the page doesn't
// make the "new since your last visit" note disappear straight away.
const KEY = "ll:lastVisit";
const SESSION_KEY = "ll:prevVisit";

let cached: string | null | undefined;

function read(): string | null {
  if (cached !== undefined) return cached;
  try {
    const inSession = sessionStorage.getItem(SESSION_KEY);
    if (inSession !== null) {
      cached = inSession === "" ? null : inSession;
    } else {
      const prev = localStorage.getItem(KEY);
      sessionStorage.setItem(SESSION_KEY, prev ?? "");
      cached = prev;
    }
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    cached = null; // private mode or storage blocked: behave like a first visit
  }
  return cached;
}

const subscribe = () => () => {};

/** ISO time of the previous visit; null on a first visit; undefined during SSR. */
export function usePreviousVisit(): string | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

/** Dispatches published after the previous visit, newest first. */
export function newSince<T extends { publishedAt: string }>(items: T[], previous: string | null | undefined): T[] {
  if (!previous) return [];
  const t = Date.parse(previous);
  if (Number.isNaN(t)) return [];
  return items.filter((d) => Date.parse(d.publishedAt) > t);
}
