import { FactText } from "@/components/FactText";
import { Img } from "@/components/Img";
import { SectionHeading } from "@/components/SectionHeading";
import { ASTRONAUT_LINE, CREW, CREW_GROUPS } from "@/content/crew";
import { DID_YOU_KNOW } from "@/content/facts";
import { getCrewPortraits, normalizeName } from "@/lib/crew-photos";

function initials(name: string) {
  const parts = name.split(/\s+/);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function Crew() {
  const portraits = await getCrewPortraits();
  const anyPortrait = Object.keys(portraits).length > 0;
  return (
    <section aria-labelledby="crew-heading" className="mx-auto max-w-[720px] px-5 pt-14 sm:px-8">
      <SectionHeading kicker="Meet the crew" title="The 17 on the island" id="crew-heading" />

      <p className="paper flex items-start gap-3 rounded-[var(--radius-card)] p-4 ring-2 ring-amber">
        <span aria-hidden="true" className="text-[1.5rem] leading-none text-amber">★</span>
        <span>{ASTRONAUT_LINE}</span>
      </p>

      <div className="mt-8 space-y-8">
        {CREW_GROUPS.map((group) => {
          const people = CREW.filter(group.match);
          return (
            <div key={group.title}>
              <h3 className="font-mono text-[1rem] font-semibold tracking-[0.12em] text-teal-ink uppercase">{group.title}</h3>
              <ul className="paper mt-3 divide-y divide-rule rounded-[var(--radius-card)] ring-1 ring-rule">
                {people.map((c) => (
                  <li key={c.name} className={`flex gap-3 px-4 py-3 ${c.astronaut ? "bg-amber/15" : ""}`}>
                    {portraits[normalizeName(c.name)] ? (
                      <span
                        className={`mt-0.5 size-16 shrink-0 overflow-hidden rounded-full bg-sand-2 ${
                          c.astronaut ? "ring-3 ring-amber" : "ring-2 ring-rule"
                        }`}
                      >
                        <Img
                          photo={{ src: portraits[normalizeName(c.name)].src, alt: `Portrait of ${c.name}` }}
                          sizes="64px"
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full font-mono font-semibold ${
                          c.astronaut ? "bg-amber text-navy" : "bg-navy text-foam"
                        }`}
                      >
                        {c.astronaut ? "★" : initials(c.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-[1.2rem] font-semibold text-navy">{c.name}</p>
                      <p>
                        {c.role}
                        {c.org.startsWith("Ministry") && <span className="text-ink-muted">, {c.org}</span>}
                      </p>
                      {c.note && <p className="text-ink-muted">{c.note}</p>}
                      {c.astronaut && <p className="font-semibold text-navy">Cradle of Astronauts</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {anyPortrait && (
        <p className="mt-4 text-[1rem] text-ink-muted">
          Portraits:{" "}
          <a href="https://amelia.prf.org/" target="_blank" rel="noopener noreferrer" className="underline">
            the official expedition site
          </a>
          .
        </p>
      )}

      <div className="mt-10">
        <h3 className="text-[1.5rem] font-semibold text-navy">Life on the expedition</h3>
        <ul className="mt-4 space-y-4">
          {DID_YOU_KNOW.map((id) => (
            <li key={id} className="flex gap-3">
              <span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rounded-full bg-signal" />
              <FactText id={id} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
