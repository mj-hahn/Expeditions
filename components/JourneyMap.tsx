import { GlobeLoader } from "@/components/globe/GlobeLoader";
import { SectionHeading } from "@/components/SectionHeading";
import { FACTS } from "@/content/facts";
import type { Phase } from "@/lib/types";

function Swatch({ dash, color }: { dash?: string; color: string }) {
  return (
    <svg viewBox="0 0 40 8" className="h-3 w-10 shrink-0" aria-hidden="true">
      <path d="M2 4h36" stroke={color} strokeWidth="3" strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

export function JourneyMap({ phase }: { phase: Phase }) {
  const f14 = FACTS.F14.sources[0];
  return (
    <section aria-labelledby="journey-heading" className="chart-grid mt-14 text-foam">
      <div className="mx-auto max-w-[720px] px-5 py-12 sm:px-8">
        <SectionHeading kicker="Journey map" title="Two journeys, one atoll" id="journey-heading" tone="dark" />
        <GlobeLoader phase={phase} />
        <p className="mt-2 text-center text-foam-muted">Drag the globe to turn it.</p>
        <ul className="mt-6 space-y-3">
          <li className="flex items-center gap-3">
            <Swatch color="#D9A441" dash="7 5" />
            <span>Earhart&apos;s planned final leg, July 2, 1937</span>
          </li>
          <li className="flex items-center gap-3">
            <Swatch color="#D9A441" dash="1 5" />
            <span>The Nikumaroro hypothesis (an idea, not a known path)</span>
          </li>
          <li className="flex items-center gap-3">
            <Swatch color="#E8692C" />
            <span>2026 expedition: West Lafayette, Los Angeles, Nadi, Tarawa, then by sea to Nikumaroro</span>
          </li>
        </ul>
        <p className="mt-6 rounded-[var(--radius-card)] bg-navy-2/80 px-4 py-3 ring-1 ring-foam/10">
          <span className="font-mono font-semibold text-amber">830 nautical miles</span> by sea from Tarawa.{" "}
          <a href={f14.url} target="_blank" rel="noopener noreferrer" className="text-foam-muted underline">
            Source: {f14.name}
          </a>
        </p>
      </div>
    </section>
  );
}
