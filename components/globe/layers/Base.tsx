import { SIZE, R } from "../geo";
import type { Layer } from "./types";

// Deterministic stars (seeded LCG, so the sky doesn't reshuffle between renders).
const STARS = (() => {
  let seed = 20260;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const out: { x: number; y: number; r: number; o: number }[] = [];
  while (out.length < 40) {
    const x = rnd() * SIZE;
    const y = rnd() * SIZE;
    if (Math.hypot(x - SIZE / 2, y - SIZE / 2) < R + 12) continue;
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r: 0.6 + rnd() * 0.9, o: 0.2 + rnd() * 0.35 });
  }
  return out;
})();

/** Sky, ocean, graticule, land and the night side. */
export const Base: Layer = {
  id: "base",
  render: ({ view, geom }) => (
    <>
      <defs>
        <radialGradient id="g-ocean" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#1C4266" />
          <stop offset="1" stopColor="#0E2740" />
        </radialGradient>
        <radialGradient id="g-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0.9" stopColor="#4FB3B3" stopOpacity="0" />
          <stop offset="0.96" stopColor="#4FB3B3" stopOpacity="0.3" />
          <stop offset="1" stopColor="#4FB3B3" stopOpacity="0" />
        </radialGradient>
      </defs>
      {view.zoom <= 1.2 && (
        <g aria-hidden="true">
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#EEF4F7" fillOpacity={s.o} />
          ))}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#g-glow)" />
        </g>
      )}
      <path d={geom.sphere} fill="url(#g-ocean)" stroke="#EEF4F7" strokeOpacity="0.25" />
      <path d={geom.graticule} fill="none" stroke="#EEF4F7" strokeOpacity="0.07" />
      <path d={geom.land} fill="#E9DBBB" fillOpacity="0.9" stroke="#0B1F33" strokeWidth="0.5" />
      {geom.night && <path d={geom.night} fill="#06121F" fillOpacity="0.45" />}
    </>
  ),
};
