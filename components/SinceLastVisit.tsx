"use client";

import Link from "next/link";
import { newSince, usePreviousVisit } from "@/lib/last-visit";
import { formatLongDate } from "@/lib/time";

type Item = { slug: string; title: string; publishedAt: string };

/** "2 new dispatches since your last visit on Tuesday" — shown only when there's something new. */
export function SinceLastVisit({ items }: { items: Item[] }) {
  const previous = usePreviousVisit();
  const fresh = newSince(items, previous);
  if (!previous || fresh.length === 0) return null;
  const when = formatLongDate(new Date(previous)).split(",")[0];
  return (
    <div className="relative mt-6 rounded-[var(--radius-card)] bg-navy-2 p-4 ring-2 ring-signal">
      <p className="font-semibold text-foam">
        <span className="mr-2 inline-flex rounded-full bg-signal px-2.5 font-mono text-navy">NEW</span>
        {fresh.length === 1 ? "1 new dispatch" : `${fresh.length} new dispatches`} since your last visit on {when}
      </p>
      <ul className="mt-2 space-y-1">
        {fresh.slice(0, 3).map((d) => (
          <li key={d.slug}>
            <Link href={`/dispatch/${d.slug}`} className="text-amber underline">
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
