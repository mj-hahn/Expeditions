import { FactText } from "@/components/FactText";
import { SectionHeading } from "@/components/SectionHeading";
import { FACTS, SKEPTICS, SKEPTICS_CLOSING } from "@/content/facts";

export function SkepticsCorner() {
  return (
    <section aria-labelledby="skeptics-heading" className="mt-14 bg-navy-2 text-foam">
      <div className="mx-auto max-w-[720px] px-5 py-12 sm:px-8">
        <SectionHeading kicker="The skeptic's corner" title="Not everyone is convinced" id="skeptics-heading" tone="dark" />
        <ul className="space-y-5">
          {SKEPTICS.map((id) => (
            <li key={id} className="border-l-4 border-slate pl-4">
              <FactText id={id} tone="dark" className="text-[1.05rem] leading-[1.65]" />
            </li>
          ))}
        </ul>
        <p className="mt-8 rounded-[var(--radius-card)] bg-navy px-5 py-4 font-display text-[1.3rem] leading-[1.45] text-foam ring-1 ring-foam/10">
          {FACTS[SKEPTICS_CLOSING].text}
        </p>
      </div>
    </section>
  );
}
