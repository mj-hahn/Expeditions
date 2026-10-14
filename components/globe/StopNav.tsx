import { memo } from "react";
import { BTN } from "./ui";

const NAV_BTN = `${BTN} min-w-0 flex-1 px-4`;

/** Back / counter / Next, or the tour starter. Fixed height and position: it must not move when the card below changes. */
export const StopNav = memo(function StopNav({ index, total, onBack, onNext, onStart }: { index: number; total: number; onBack: () => void; onNext: () => void; onStart: () => void }) {
  return (
    <div className="mt-3 flex min-h-12 items-center gap-3">
      {index < 0 ? (
        <button type="button" className="min-h-12 w-full rounded-full bg-amber px-6 text-[1.05rem] font-semibold text-navy hover:brightness-110" onClick={onStart}>
          ▶ Take the tour
        </button>
      ) : (
        <>
          <button type="button" className={NAV_BTN} disabled={index <= 0} onClick={onBack}>
            ← Back
          </button>
          <span className="shrink-0 text-center font-mono font-semibold whitespace-nowrap text-foam">
            {index + 1} of {total}
          </span>
          <button type="button" className={NAV_BTN} disabled={index >= total - 1} onClick={onNext}>
            Next →
          </button>
        </>
      )}
    </div>
  );
});
