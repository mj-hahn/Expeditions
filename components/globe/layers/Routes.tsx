import type { LineString } from "geojson";
import { LEG_1937, LEGS_2026, PLACES, SPUR_1937, type PlaceId } from "@/content/route-points";
import type { Layer } from "./types";

const line = (a: PlaceId, b: PlaceId): LineString => ({
  type: "LineString",
  coordinates: [
    [PLACES[a].lon, PLACES[a].lat],
    [PLACES[b].lon, PLACES[b].lat],
  ],
});

/** 1937 flight and hypothesis spur, the 2026 legs, and the ship's track so far. */
export const Routes: Layer = {
  id: "routes",
  render: ({ path, memo, scene }) => {
    const { legs, travelled } = scene;
    const fixed = memo("routes", () => ({
      leg1937: path(line(LEG_1937.from, LEG_1937.to)) ?? "",
      spur: path(line(SPUR_1937.from, SPUR_1937.to)) ?? "",
      legs2026: LEGS_2026.map((l) => path(line(l.from, l.to)) ?? ""),
    }));
    const travelPath = travelled.length > 1 ? (path({ type: "LineString", coordinates: travelled }) ?? "") : "";
    return (
      <>
        {/* 1937: planned final leg (amber, dashed) and the hypothesis spur (dotted) */}
        <path d={fixed.leg1937} fill="none" stroke="#D9A441" strokeWidth="2.5" strokeDasharray="7 5" />
        <path d={fixed.spur} fill="none" stroke="#D9A441" strokeWidth="2.5" strokeDasharray="1 5" strokeLinecap="round" />

        {/* 2026: completed legs solid with a draw-in, the current leg dashed, future legs faint */}
        {LEGS_2026.map((_, i) => {
          const state = i < legs.done ? "done" : legs.active.includes(i) ? "active" : "next";
          return (
            <path
              key={i}
              d={fixed.legs2026[i]}
              fill="none"
              stroke="#E8692C"
              strokeWidth={state === "next" ? 2 : 3}
              strokeOpacity={state === "next" ? 0.35 : 1}
              strokeDasharray={state === "done" ? undefined : "6 6"}
              strokeLinecap="round"
              className={state === "done" ? "globe-draw" : state === "active" ? "ls-dash" : undefined}
              pathLength={state === "done" ? 1 : undefined}
              style={state === "done" ? { animationDelay: `${0.4 + i * 0.5}s` } : undefined}
            />
          );
        })}

        {travelPath && <path d={travelPath} fill="none" stroke="#E8692C" strokeWidth="3.5" strokeLinecap="round" />}
      </>
    );
  },
};
