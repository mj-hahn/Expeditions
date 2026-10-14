import { memo } from "react";
import { BTN, ROUND } from "./ui";

export const ZoomControls = memo(function ZoomControls({ atMin, atMax, onZoomOut, onReset, onZoomIn }: { atMin: boolean; atMax: boolean; onZoomOut: () => void; onReset: () => void; onZoomIn: () => void }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <button type="button" aria-label="Zoom out" className={ROUND} disabled={atMin} onClick={onZoomOut}>
        −
      </button>
      <button type="button" className={BTN} onClick={onReset}>
        Reset view
      </button>
      <button type="button" aria-label="Zoom in" className={ROUND} disabled={atMax} onClick={onZoomIn}>
        +
      </button>
    </div>
  );
});
