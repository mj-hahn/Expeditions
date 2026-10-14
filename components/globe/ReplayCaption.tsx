import Link from "next/link";
import { memo } from "react";
import { formatShortDate } from "@/lib/time";
import type { VoyageStep } from "@/lib/voyage";

export const ReplayCaption = memo(function ReplayCaption({ step }: { step: VoyageStep | null }) {
  return (
    <div aria-live="polite">
      {step && (
        <p className="mt-4 rounded-[var(--radius-card)] bg-navy-2/80 px-4 py-3 ring-1 ring-foam/10">
          <span className="font-mono font-semibold text-signal">{formatShortDate(new Date(step.publishedAt), "America/Toronto")}</span>
          {" · "}
          <Link href={`/dispatch/${step.slug}`} className="text-amber underline">
            {step.title}
          </Link>
        </p>
      )}
    </div>
  );
});
