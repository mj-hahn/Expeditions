import type { Metadata } from "next";
import Link from "next/link";
import { FactText } from "@/components/FactText";
import { Footer } from "@/components/Footer";
import { Img } from "@/components/Img";
import { SectionHeading } from "@/components/SectionHeading";
import { TopBar } from "@/components/TopBar";
import { TIMELINE_1937, TIMELINE_NOTE } from "@/content/timeline-1937";
import type { Photo } from "@/lib/types";

export const metadata: Metadata = { title: "1937, hour by hour" };

const HERO = {
  photo: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Amelia_Earhart_-_GPN-2002-000211.jpg/960px-Amelia_Earhart_-_GPN-2002-000211.jpg",
    alt: "Amelia Earhart standing in front of the Lockheed Electra",
  } satisfies Photo,
  caption: "Earhart in front of the Lockheed Electra in which she disappeared.",
  credit: "Photo: Smithsonian Institution / NASA (GPN-2002-000211), public domain, via Wikimedia Commons",
  href: "https://commons.wikimedia.org/wiki/File:Amelia_Earhart_-_GPN-2002-000211.jpg",
};

const DARWIN = {
  photo: {
    src: "https://upload.wikimedia.org/wikipedia/commons/7/75/Amelia_Earhart_in_Darwin_on_28_June_1937.jpg",
    alt: "Earhart and Noonan beside the Electra at Darwin",
  } satisfies Photo,
  caption: "Earhart and Noonan by the Electra at Darwin, Australia, on June 28, 1937, four days before the last flight.",
  credit: "Photo: public domain, via Wikimedia Commons",
  href: "https://commons.wikimedia.org/wiki/File:Amelia_Earhart_in_Darwin_on_28_June_1937.jpg",
};

function Figure({ p, eager }: { p: typeof HERO; eager?: boolean }) {
  return (
    <figure>
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-sand-2">
        <Img photo={p.photo} eager={eager} sizes="(min-width: 760px) 720px, 100vw" className="w-full" />
      </div>
      <figcaption className="mt-3 text-ink-muted">{p.caption}</figcaption>
      <p className="mt-1 text-[1rem] text-ink-muted">
        <a href={p.href} target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 underline">
          {p.credit}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </figure>
  );
}

export default function Page1937() {
  return (
    <>
      <TopBar label="1937" />
      <main className="mx-auto max-w-[720px] px-5 pt-8 pb-16 sm:px-8">
        <SectionHeading kicker="The last flight" title="1937, hour by hour" />
        <FactText id="F1" className="text-[1.15rem]" />
        <div className="mt-8">
          <Figure p={HERO} eager />
        </div>

        <p className="mt-10 text-ink-muted">{TIMELINE_NOTE}</p>
        <ol className="mt-6">
          {TIMELINE_1937.map((e, i) => {
            const teletype = i === 2 || i === 4;
            const last = i === TIMELINE_1937.length - 1;
            return (
              <li key={e.title} className="relative pb-10 pl-9">
                {!last && <span aria-hidden="true" className="absolute top-4 bottom-0 left-[0.6rem] w-0.5 bg-rule" />}
                <span
                  aria-hidden="true"
                  className={`absolute top-1.5 left-0 size-[1.3rem] rounded-full border-4 border-sand ${
                    i === 4 ? "bg-signal ring-2 ring-signal" : "bg-teal ring-2 ring-teal"
                  }`}
                />
                <p className="font-mono font-semibold text-teal-ink">{e.time}</p>
                <h2 className="mt-1 text-[1.5rem] font-semibold text-navy">{e.title}</h2>
                <div className="mt-3 space-y-3">
                  {e.facts.map((id) => (
                    <FactText
                      key={id}
                      id={id}
                      tone={teletype ? "dark" : "light"}
                      className={
                        teletype
                          ? `rounded-[var(--radius-card)] bg-navy-2 p-5 font-mono text-foam ${
                              i === 4 ? "ring-4 ring-signal" : "ring-1 ring-navy-3"
                            }`
                          : ""
                      }
                    />
                  ))}
                </div>
                {i === 0 && (
                  <div className="mt-8">
                    <Figure p={DARWIN} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <section aria-labelledby="why-niku" className="paper mt-4 rounded-[var(--radius-card)] p-6 ring-1 ring-rule">
          <h2 id="why-niku" className="text-[1.6rem] font-semibold text-navy">
            Why Nikumaroro?
          </h2>
          <div className="mt-3 space-y-3">
            <FactText id="F5" />
            <FactText id="F6" />
          </div>
          <Link
            href="/island"
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-navy px-6 font-semibold text-foam hover:bg-navy-2"
          >
            See the island <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
