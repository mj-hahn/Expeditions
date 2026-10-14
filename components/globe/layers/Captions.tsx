import { geoInterpolate } from "d3-geo";
import { LEG_1937, SPUR_1937, type PlaceId } from "@/content/route-points";
import { coords, pointVisible } from "../geo";
import { text } from "./text";
import type { Layer, LayerContext } from "./types";

const PHOENIX: [number, number] = [-172, -3.5];

function caption({ view, proj, labeler }: LayerContext, a: PlaceId, b: PlaceId, s: string, minZoom: number, where: "above" | "right" | "below") {
  if (view.zoom < minZoom) return null;
  const m = geoInterpolate(coords(a), coords(b))(0.5);
  if (!pointVisible(m, view)) return null;
  const p = proj(m);
  if (!p) return null;
  const anchor = where === "right" ? "start" : "middle";
  const x = p[0] + (where === "right" ? 10 : 0);
  const y = p[1] + (where === "above" ? -14 : where === "below" ? 22 : 5);
  if (!labeler.claim(x, y, s, anchor)) return null;
  return text(x, y, s, { anchor, mono: true, fill: "#E9DBBB" });
}

/** Lowest-priority text: it only prints where nothing else already does. */
export const Captions: Layer = {
  id: "captions",
  minZoom: 2,
  render: (ctx) => {
    const { view, proj, labeler } = ctx;
    const phoenix = view.zoom >= 4 && pointVisible(PHOENIX, view) ? proj(PHOENIX) : null;
    const showPhoenix = phoenix ? labeler.claim(phoenix[0], phoenix[1], "Phoenix Islands", "start") : false;
    return (
      <>
        {phoenix && showPhoenix && text(phoenix[0], phoenix[1], "Phoenix Islands", { italic: true, opacity: 0.6 })}
        {caption(ctx, LEG_1937.from, LEG_1937.to, "2,556 mi", 2, "above")}
        {caption(ctx, SPUR_1937.from, SPUR_1937.to, "≈400 mi", 3, "right")}
        {caption(ctx, "tarawa", "nikumaroro", "830 nm", 2, "below")}
      </>
    );
  },
};
