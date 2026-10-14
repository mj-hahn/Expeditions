"use client";

import { useSyncExternalStore } from "react";

export type Platform = "ios" | "android" | "other";
export type PlatformInfo = { platform: Platform; installed: boolean; iosBrowser: "safari" | "other" };

function detect(): PlatformInfo {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    platform: ios ? "ios" : android ? "android" : "other",
    installed: standalone,
    iosBrowser: /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "other" : "safari",
  };
}

let cached: PlatformInfo | null = null;
const getSnapshot = () => (cached ??= detect());
const getServerSnapshot = () => null;
const subscribe = () => () => {};

/** Visitor's platform, or null during SSR and hydration. */
export function usePlatform(): PlatformInfo | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
