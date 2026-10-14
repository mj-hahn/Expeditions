import { Img } from "@/components/Img";
import type { VideoItem } from "@/lib/news";
import { formatShortDate } from "@/lib/time";

/** Purdue's expedition videos. Links open YouTube; nothing is embedded (no tracking on our page). */
export function VideoList({ items }: { items: VideoItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((v) => (
        <li key={v.id}>
          <a
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="paper group block overflow-hidden rounded-[var(--radius-card)] ring-1 ring-rule hover:ring-teal"
          >
            <div className="relative aspect-video bg-navy">
              <Img photo={{ src: v.thumbnail, alt: "" }} alt="" className="h-full w-full object-cover" />
              <span
                aria-hidden="true"
                className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-navy/80 text-foam ring-2 ring-foam/70"
              >
                <svg viewBox="0 0 24 24" className="ml-1 size-7" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
            <div className="p-4">
              <p className="font-mono text-[1rem] text-ink-muted">Purdue University · {formatShortDate(new Date(v.publishedAt))}</p>
              <p className="mt-1 font-display text-[1.15rem] leading-snug font-semibold text-navy group-hover:underline">{v.title}</p>
              <p className="mt-1 font-semibold text-teal-ink">
                Watch on YouTube <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </p>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
