"use client";

import { useSyncExternalStore } from "react";

// Re-renders its caller once a minute, unlike useNow's per-second tick, which would re-render the whole globe every second.
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 5000);
  return () => clearInterval(id);
};
const getSnapshot = () => Math.floor(Date.now() / 60000);
const getServerSnapshot = () => null;

/** Minutes since the epoch, or null during SSR and hydration. */
export function useMinute(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
