import { SectionHeading } from "@/components/SectionHeading";
import { PRESS } from "@/content/press";

const KIND = { video: "Video", podcast: "Podcast", site: "Website" } as const;

export function InTheNews() {
  return (
    <section aria-labelledby="news-heading" className="mx-auto max-w-[720px] px-5 pt-14 pb-14 sm:px-8">
      <SectionHeading kicker="In the news" title="Elsewhere on the story" id="news-heading" />
      <ul className="space-y-3">
        {PRESS.map((p) => (
          <li key={p.url}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="paper group flex items-center gap-4 rounded-[var(--radius-card)] p-4 ring-1 ring-rule hover:ring-teal"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[1rem] font-semibold text-teal-ink">
                  {p.outlet}
                  {p.kind && ` · ${KIND[p.kind]}`}
                  {p.date && ` · ${p.date}`}
                </p>
                <p className="mt-1 font-display text-[1.2rem] font-semibold text-navy group-hover:underline">{p.title}</p>
              </div>
              <span aria-hidden="true" className="text-[1.4rem] text-ink-muted">↗</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
