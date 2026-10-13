"use client";

import { isWithinHours } from "@/lib/time";
import { useNow } from "@/lib/use-now";

export function NewBadge({ iso }: { iso: string }) {
  const now = useNow();
  if (now === null || !isWithinHours(new Date(iso), new Date(now), 24)) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-signal px-3 py-0.5 font-mono text-[1rem] font-semibold tracking-wider text-navy uppercase">
      New
    </span>
  );
}
