import { RelativeTime } from "@/components/RelativeTime";
import type { NewsItem } from "@/lib/news";
import { formatShortDate } from "@/lib/time";

function alsoLine(item: NewsItem) {
  const names = item.alsoIn.map((a) => a.outlet);
  if (names.length === 0) return null;
  if (names.length <= 2) return `Also reported by ${names.join(" and ")}`;
  return `Also reported by ${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

/** Headlines only, each linking to the outlet's own story. */
export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li key={n.id}>
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="paper group block rounded-[var(--radius-card)] p-4 ring-1 ring-rule hover:ring-teal"
          >
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[1rem]">
              <span className="font-semibold text-teal-ink">{n.outlet}</span>
              <span className="text-ink-muted">
                <RelativeTime iso={n.publishedAt} fallback={formatShortDate(new Date(n.publishedAt))} />
              </span>
            </p>
            <p className="mt-1 font-display text-[1.2rem] leading-snug font-semibold text-navy group-hover:underline">
              {n.title}
              <span aria-hidden="true" className="ml-1 text-ink-muted">↗</span>
              <span className="sr-only"> (opens {n.outlet} in a new tab)</span>
            </p>
            {alsoLine(n) && <p className="mt-1 text-ink-muted">{alsoLine(n)}</p>}
          </a>
        </li>
      ))}
    </ul>
  );
}
