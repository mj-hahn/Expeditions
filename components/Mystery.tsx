import { FactText } from "@/components/FactText";
import { SectionHeading } from "@/components/SectionHeading";
import { MYSTERY } from "@/content/facts";

export function Mystery() {
  return (
    <section aria-labelledby="mystery-heading" className="mx-auto max-w-[720px] px-5 pt-14 sm:px-8">
      <SectionHeading kicker="The mystery" title="Why this lagoon matters" id="mystery-heading" />
      <div className="space-y-5">
        {MYSTERY.map((part, i) => (
          <article key={part.title} className="paper rounded-[var(--radius-card)] p-5 ring-1 ring-rule sm:p-6">
            <p className="flex items-center gap-3 font-mono text-[1rem] font-semibold tracking-[0.12em] text-signal-ink uppercase">
              <span className="flex size-8 items-center justify-center rounded-full bg-navy text-foam">{i + 1}</span>
              {part.kicker}
            </p>
            <h3 className="mt-3 text-[1.5rem] font-semibold text-navy">{part.title}</h3>
            <div className="mt-3 space-y-4">
              {part.facts.map((id) => (
                <FactText key={id} id={id} className="text-[1.05rem] leading-[1.65]" />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
