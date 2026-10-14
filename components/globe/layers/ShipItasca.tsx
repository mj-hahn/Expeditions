import { coords, isVisible, pointVisible, SIZE } from "../geo";
import { CHAR_W } from "../labels";
import { text } from "./text";
import type { Layer } from "./types";

const SHIP_D = "M-8 0h16l-3.5 6h-9zM-2 0v-6h5v6z";
const SHIP_LABEL = "Marin Mainiku";

/** The Marin Mainiku (label outranks "Phoenix Islands") and the Itasca beside Howland. */
export const ShipItasca: Layer = {
  id: "ship-itasca",
  render: ({ view, proj, labeler, scene }) => {
    const { shipAt } = scene;
    const shipPt = shipAt && pointVisible(shipAt, view) ? proj(shipAt) : null;
    // Centred under the glyph, nudged to stay inside the frame.
    const half = (SHIP_LABEL.length * CHAR_W) / 2 + 2;
    const label = view.zoom >= 3 && shipPt ? { x: Math.max(half, Math.min(SIZE - half, shipPt[0])), y: shipPt[1] + 38 } : null;
    if (label) labeler.claim(label.x, label.y, SHIP_LABEL, "middle", true);

    // Itasca sits just above Howland, its label left of the glyph (Howland's own label is to the right).
    const howland = view.zoom >= 4 && isVisible("howland", view) ? proj(coords("howland")) : null;
    if (howland) labeler.claim(howland[0] - 12, howland[1] - 15, "Itasca", "end", true);

    return (
      <>
        {shipPt && (
          <g>
            <path transform={`translate(${shipPt[0]} ${shipPt[1] + 14})`} d={SHIP_D} fill="#E8692C" stroke="#0B1F33" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" />
            {label && text(label.x, label.y, SHIP_LABEL, { anchor: "middle" })}
          </g>
        )}
        {howland && (
          <g aria-hidden="true">
            <path
              transform={`translate(${howland[0]} ${howland[1] - 20})`}
              d="M-8 0h16l-3.5 6h-9zM-2 0v-6h5v6M3-4l7-1"
              fill="#D9A441"
              stroke="#D9A441"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {text(howland[0] - 12, howland[1] - 15, "Itasca", { anchor: "end" })}
          </g>
        )}
      </>
    );
  },
};
