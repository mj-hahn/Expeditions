import { VERDICT_INFO } from "@/lib/status";
import type { Verdict } from "@/lib/types";

const TONES = {
  sand: "bg-sand text-ink ring-1 ring-rule",
  teal: "bg-teal text-white",
  gold: "bg-amber text-navy shadow-[0_0_0_4px_rgb(217_164_65/0.3)]",
  slate: "bg-slate text-white",
} as const;

/** The verdict is only ever read from content/status.json (SPEC §2, §6). */
export function VerdictPill({ verdict, size = "md" }: { verdict: Verdict; size?: "md" | "lg" }) {
  const info = VERDICT_INFO[verdict];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold ${TONES[info.tone]} ${
        size === "lg" ? "px-5 py-2 text-[1.05rem]" : "px-4 py-1.5 text-[1rem]"
      }`}
    >
      <span aria-hidden="true" className="size-2.5 rounded-full bg-current opacity-70" />
      <span>
        <span className="sr-only">Verdict: </span>
        {info.label}
      </span>
    </span>
  );
}
