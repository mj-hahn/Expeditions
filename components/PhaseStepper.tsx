import { PHASE_INFO, phaseIndex } from "@/lib/status";
import { PHASES, type Phase } from "@/lib/types";

// Phases where a one-line explainer helps; for the travel steps the label says it all.
const EXPLAIN: ReadonlySet<Phase> = new Set([
  "tarawa",
  "base_camp",
  "surface_survey",
  "magnetometer",
  "sonar",
  "hydroprobe",
  "dredge",
]);

// For these the explainer adds something the status sentence doesn't.
const INSTRUMENTS: ReadonlySet<Phase> = new Set(["magnetometer", "sonar", "hydroprobe", "dredge"]);

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

/** The 12 phases from content/status.json: done steps checked, the current one pulsing (SPEC §6). */
export function PhaseStepper({ phase }: { phase: Phase }) {
  const current = phaseIndex(phase);
  return (
    <ol className="relative" aria-label={`Search progress: step ${current + 1} of ${PHASES.length}`}>
      {PHASES.map((p, i) => {
        const info = PHASE_INFO[p];
        const state = i < current ? "done" : i === current ? "current" : "next";
        const last = i === PHASES.length - 1;
        return (
          <li key={p} className="relative flex gap-4 pb-5 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute top-9 bottom-0 left-[15px] w-0.5 ${i < current ? "bg-teal" : "bg-rule"}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${
                state === "done"
                  ? "bg-teal text-white"
                  : state === "current"
                    ? "live-ring bg-signal text-navy"
                    : "bg-paper text-ink-muted ring-2 ring-rule"
              }`}
            >
              {state === "done" ? <Check /> : <span className="font-mono text-[1rem] font-semibold">{i + 1}</span>}
            </span>
            <div className={`min-w-0 pt-0.5 ${state === "current" ? "paper -mt-1 flex-1 rounded-[var(--radius-card)] p-4 ring-2 ring-signal" : ""}`}>
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span
                  className={`font-semibold ${
                    state === "current" ? "text-[1.2rem] text-navy" : state === "done" ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {info.label}
                </span>
                {info.when && <span className="font-mono text-[1rem] text-ink-muted">{info.when}</span>}
                {state === "current" && (
                  <span className="rounded-full bg-signal px-2.5 font-mono text-[1rem] font-semibold tracking-wider text-navy uppercase">
                    Now
                  </span>
                )}
                <span className="sr-only">
                  {state === "done" ? "(done)" : state === "current" ? "(happening now)" : "(still to come)"}
                </span>
              </p>
              {(state === "current" || EXPLAIN.has(p)) && (
                <p className={`mt-0.5 ${state === "next" ? "text-ink-muted" : ""}`}>
                  {state === "current" ? info.sentence + "." : info.explainer}
                  {state === "current" && INSTRUMENTS.has(p) && (
                    <span className="mt-1 block text-ink-muted">{info.explainer}</span>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
