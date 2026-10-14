import { pointVisible } from "../geo";
import type { Layer } from "./types";

/** The pulsing dot where the team is now. */
export const TeamPulse: Layer = {
  id: "team-pulse",
  render: ({ view, proj, scene }) => {
    const at = scene.team && pointVisible(scene.team, view) ? proj(scene.team) : null;
    if (!at) return null;
    return (
      <g transform={`translate(${at[0]} ${at[1]})`}>
        <circle className="globe-ping" r="6" fill="none" stroke="#E8692C" strokeWidth="2.5" />
        <circle r="6" fill="#E8692C" stroke="#fff" strokeWidth="2" />
      </g>
    );
  },
};
