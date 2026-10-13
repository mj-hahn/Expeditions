"use client";

import { relativeTime } from "@/lib/time";
import { useNow } from "@/lib/use-now";

/** Server renders `fallback` (an absolute time); the client swaps in "3 hours ago". */
export function RelativeTime({ iso, fallback }: { iso: string; fallback: string }) {
  const now = useNow();
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {now === null ? fallback : relativeTime(new Date(iso), new Date(now))}
    </time>
  );
}
