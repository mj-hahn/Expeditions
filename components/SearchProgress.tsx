import { LagoonSection } from "@/components/LagoonSection";
import { PhaseStepper } from "@/components/PhaseStepper";
import { SectionHeading } from "@/components/SectionHeading";
import type { TidePoint } from "@/lib/conditions-shared";
import type { Status } from "@/lib/types";

export function SearchProgress({ status, tide }: { status: Status; tide: TidePoint[] | null }) {
  return (
    <section aria-labelledby="progress-heading" className="mx-auto max-w-[720px] px-5 pt-12 sm:px-8">
      <SectionHeading kicker="Search progress" title="Where the search stands" id="progress-heading" />
      <LagoonSection phase={status.phase} verdict={status.verdict} tide={tide} />
      <div className="mt-8">
        <PhaseStepper phase={status.phase} />
      </div>
    </section>
  );
}
