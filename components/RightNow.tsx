import { RightNowPanel } from "@/components/RightNowPanel";
import { SectionHeading } from "@/components/SectionHeading";
import type { Conditions } from "@/lib/conditions-shared";

export function RightNow({ conditions }: { conditions: Conditions }) {
  return (
    <section aria-labelledby="now-heading" className="chart-grid mt-12 text-foam">
      <div className="mx-auto max-w-[720px] px-5 py-12 sm:px-8">
        <SectionHeading kicker="Right now" title="On Nikumaroro" id="now-heading" tone="dark" />
        <RightNowPanel conditions={conditions} />
      </div>
    </section>
  );
}
