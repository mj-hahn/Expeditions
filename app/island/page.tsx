import type { Metadata } from "next";
import Link from "next/link";
import { ZoomFigure } from "@/components/dispatch/ZoomFigure";
import { FactText } from "@/components/FactText";
import { Footer } from "@/components/Footer";
import { IslandLocator } from "@/components/IslandLocator";
import { SectionHeading } from "@/components/SectionHeading";
import { TopBar } from "@/components/TopBar";
import type { FactId } from "@/content/facts";
import type { Photo } from "@/lib/types";

export const metadata: Metadata = { title: "Nikumaroro, the island" };

const SATELLITE: Photo = {
  src: "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/91000/91889/nikumaroro_oli_2014209.jpg",
  alt: "Satellite view of Nikumaroro atoll and its central lagoon",
  caption: "Nikumaroro from space, July 28, 2014 (Landsat 8).",
};

const STATS = [
  { value: "7.5 × 2.5 km", label: "Size of the atoll" },
  { value: "1,000 mi", label: "From Fiji (nearly)" },
  { value: "2006", label: "Protected area since" },
];

const SECTIONS: { title: string; facts: FactId[]; link?: { href: string; label: string } }[] = [
  { title: "What it's like", facts: ["I2", "F2", "F3", "F17"] },
  { title: "Many names, many visitors", facts: ["I4", "I5", "I6", "F15"] },
  { title: "Life on the island today", facts: ["F12", "F16", "I7"] },
  {
    title: "Where the object is",
    facts: ["F10", "F4", "F13"],
    link: { href: "/#progress-heading", label: "See the lagoon diagram" },
  },
];

export default function IslandPage() {
  return (
    <>
      <TopBar label="The island" />
      <main className="mx-auto max-w-[720px] px-5 pt-8 pb-16 sm:px-8">
        <SectionHeading kicker="The island" title="Nikumaroro" />
        <ZoomFigure photo={SATELLITE} eager />
        <p className="-mt-5 text-[1rem] text-ink-muted">
          <a
            href="https://earthobservatory.nasa.gov/images/91889/nikumaroro-atoll"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block min-h-11 underline"
          >
            NASA Earth Observatory image by Joshua Stevens, using Landsat data from the U.S. Geological Survey
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>

        <section aria-labelledby="glance" className="mt-8">
          <h2 id="glance" className="text-[1.5rem] font-semibold text-navy">
            At a glance
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STATS.map((s) => (
              <li key={s.label} className="paper rounded-[var(--radius-card)] p-4 text-center ring-1 ring-rule">
                <p className="font-display text-[1.6rem] font-semibold text-navy">{s.value}</p>
                <p className="text-ink-muted">{s.label}</p>
              </li>
            ))}
          </ul>
          <FactText id="I1" className="mt-4" />
          <FactText id="I3" className="mt-3" />
        </section>

        <div className="mt-10 space-y-6">
          {SECTIONS.map((s, i) => (
            <section
              key={s.title}
              aria-labelledby={`sec-${i}`}
              className="paper rounded-[var(--radius-card)] p-6 ring-1 ring-rule"
            >
              <h2 id={`sec-${i}`} className="text-[1.5rem] font-semibold text-navy">
                {s.title}
              </h2>
              <div className="mt-3 space-y-3">
                {s.facts.map((id) => (
                  <FactText key={id} id={id} />
                ))}
              </div>
              {s.link && (
                <Link href={s.link.href} className="mt-4 inline-flex min-h-12 items-center font-semibold text-teal-ink underline">
                  {s.link.label} <span aria-hidden="true" className="ml-2">→</span>
                </Link>
              )}
            </section>
          ))}
        </div>

        <section aria-labelledby="where" className="mt-10">
          <h2 id="where" className="mb-4 text-[1.5rem] font-semibold text-navy">
            Where it is
          </h2>
          <IslandLocator />
        </section>
      </main>
      <Footer />
    </>
  );
}
