import { pointVisible } from "../geo";
import { pinPoint } from "../markers";
import type { Layer } from "./types";

/** A numbered badge on each place that has dispatches. */
export const Pins: Layer = {
  id: "pins",
  render: ({ view, proj, labeler, scene }) => (
    <>
      {scene.markerStops.map((stop) => {
        const list = scene.byPlace.get(stop.placeKey);
        if (!list) return null;
        const lonlat: [number, number] = [stop.lon, stop.lat];
        if (!pointVisible(lonlat, view)) return null;
        const at = pinPoint(stop.placeKey, lonlat, proj, view.zoom);
        if (!at) return null;
        labeler.reserve({ x0: at[0] - 12, x1: at[0] + 12, y0: at[1] - 12, y1: at[1] + 12 });
        return (
          <g key={`pin-${stop.placeKey}`}>
            <rect x={at[0] - 12} y={at[1] - 12} width="24" height="24" rx="6" fill="#fff" stroke="#0B1F33" strokeWidth="2" />
            <text x={at[0]} y={at[1] + 6} textAnchor="middle" fontSize="17" fontWeight="700" fontFamily="var(--font-mono)" fill="#0B1F33">
              {list.length}
            </text>
          </g>
        );
      })}
    </>
  ),
};
