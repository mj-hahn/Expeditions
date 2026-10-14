import { pointVisible } from "../geo";
import type { Anchor } from "../labels";
import type { TourStop } from "../tour";
import { text } from "./text";
import type { Layer } from "./types";

function labelFor(key: string, showAll: boolean): { dx: number; dy: number; anchor: Anchor } | null {
  if (key === "howland") return { dx: 9, dy: -6, anchor: "start" };
  if (key === "nikumaroro") return showAll ? { dx: -10, dy: 5, anchor: "end" } : { dx: 10, dy: 20, anchor: "start" };
  if (key.startsWith("between-") || !showAll) return null;
  if (key === "purdue") return { dx: 9, dy: 5, anchor: "start" };
  return { dx: -9, dy: 5, anchor: "end" }; // lae, lax, nadi, tarawa
}

/** Stop dots with their names, and a ring on the selected stop. Stop labels are claimed first and always show. */
export const Markers: Layer = {
  id: "markers",
  render: ({ view, proj, labeler, scene }) => {
    const showAll = view.zoom >= 2;
    const sel = scene.selected;
    const selAt = sel && pointVisible([sel.lon, sel.lat], view) ? proj([sel.lon, sel.lat]) : null;
    const marker = (stop: TourStop) => {
      const lonlat: [number, number] = [stop.lon, stop.lat];
      if (!pointVisible(lonlat, view)) return null;
      const p = proj(lonlat);
      if (!p) return null;
      const lab = labelFor(stop.placeKey, showAll);
      const amber = stop.placeKey === "lae" || stop.placeKey === "howland";
      if (lab) labeler.claim(p[0] + lab.dx, p[1] + lab.dy, stop.short, lab.anchor, true);
      return (
        <g key={stop.placeKey}>
          <circle cx={p[0]} cy={p[1]} r={lab ? 5.5 : 4} fill={amber ? "#D9A441" : "#E8692C"} stroke="#0B1F33" strokeWidth="2" />
          {lab && text(p[0] + lab.dx, p[1] + lab.dy, stop.short, { anchor: lab.anchor })}
        </g>
      );
    };
    return (
      <>
        {selAt && <circle cx={selAt[0]} cy={selAt[1]} r="12" fill="none" stroke="#fff" strokeWidth="3" />}
        {scene.markerStops.map(marker)}
      </>
    );
  },
};
