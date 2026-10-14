import { GlobeLoader } from "@/components/globe/GlobeLoader";
import { SectionHeading } from "@/components/SectionHeading";
import { FACTS } from "@/content/facts";
import type { DispatchPin } from "@/lib/dateline-place";
import type { Phase } from "@/lib/types";

function Swatch({ dash, color }: { dash?: string; color: string }) {
  return (
    <svg viewBox="0 0 40 8" className="h-3 w-10 shrink-0" aria-hidden="true">
      <path d="M2 4h36" stroke={color} strokeWidth="3" strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

export function JourneyMap({ phase, pins }: { phase: Phase; pins: DispatchPin[] }) {
  const f14 = FACTS.F14.sources[0];
  return (
    <section aria-labelledby="journey-heading" className="chart-grid mt-14 text-foam">
      <div className="mx-auto max-w-[720px] px-5 py-12 sm:px-8">
        <SectionHeading kicker="Journey map" title="Two journeys, one atoll" id="journey-heading" tone="dark" />
        <GlobeLoader phase={phase} pins={pins} />
        <p className="mt-2 text-center text-foam-muted">Drag to turn the globe. Pinch or use + and − to zoom. Tap a dot to learn about that stop.</p>
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
          <li className="flex items-center gap-3">
            <svg viewBox="0 0 40 16" className="h-4 w-10 shrink-0" aria-hidden="true">
              <circle className="globe-ping" cx="20" cy="8" r="4" fill="none" stroke="#E8692C" strokeWidth="2" />
              <circle cx="20" cy="8" r="4" fill="#E8692C" stroke="#fff" strokeWidth="1.5" />
            </svg>
            <span>Where the team is now</span>
          </li>
          <li className="flex items-center gap-3">
            <svg viewBox="0 0 40 16" className="h-4 w-10 shrink-0" aria-hidden="true">
              <path transform="translate(20 5)" d="M-8 0h16l-3.5 6h-9zM-2 0v-6h5v6z" fill="#E8692C" stroke="#0B1F33" strokeWidth="1.5" paintOrder="stroke" />
            </svg>
            <span>The Marin Mainiku, placed where Purdue&apos;s dispatches were written</span>
          </li>
          <li className="flex items-center gap-3">
            <svg viewBox="0 0 40 16" className="h-4 w-10 shrink-0" aria-hidden="true">
              <rect x="12" y="1" width="16" height="14" rx="4" fill="#fff" stroke="#0B1F33" strokeWidth="1.5" />
            </svg>
            <span>Dispatches written here (tap to read)</span>
          </li>
          <li className="flex items-center gap-3">
            <svg viewBox="0 0 40 16" className="h-4 w-10 shrink-0" aria-hidden="true">
              <rect x="8" y="1" width="24" height="14" rx="4" fill="#06121F" stroke="#EEF4F7" strokeOpacity="0.4" />
            </svg>
            <span>Night side of the Earth right now</span>
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
