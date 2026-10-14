"use client";

import { tideLevelNow, type TidePoint } from "@/lib/conditions-shared";
import { phaseIndex } from "@/lib/status";
import { useNow } from "@/lib/use-now";
import type { Phase, Verdict } from "@/lib/types";

// Side view of the Taraia Peninsula shore (SPEC §7.3). Original artwork, not to scale
// except for the two Fact Bank measurements (F10). viewBox units: 360 x 240.
const W = 360;
const H = 240;
const FLOOR = 166; // top of the lagoon sediment
const SHORE_X = 118; // where the beach meets the water at mid tide
const OBJ_X = 252; // centre of the object
const BOAT_X = OBJ_X;
const DIM_X = 330; // vertical "5 ft of water" dimension line

type Mode = "off" | "done" | "now";

function modeFor(phase: Phase, step: Phase): Mode {
  const cur = phaseIndex(phase);
  const at = phaseIndex(step);
  // After the search ends (verdict, return) every completed step stays as a faint mark.
  if (cur > at) return "done";
  if (cur === at) return "now";
  return "off";
}

function Boat({ y, moving }: { y: number; moving: boolean }) {
  return (
    <g className={moving ? "ls-boat-sweep" : undefined}>
      <g transform={`translate(${BOAT_X} ${y})`}>
        <path d="M-17 -4h34l-6 8h-22Z" fill="#FBF7EE" stroke="#0B1F33" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M-6 -4v-8h9l3 8" fill="#E8692C" stroke="#0B1F33" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </g>
  );
}

function ObjectShape({ verdict }: { verdict: Verdict }) {
  const electra = verdict === "confirmed_electra";
  return (
    <g>
      {/* Ambiguous dark shape. Never an airplane unless the verdict says so. */}
      <g className={electra ? "ls-fade-out" : undefined}>
        <path
          d={`M${OBJ_X - 38} 174c3-11 17-19 34-17 9-6 24-6 34 1 8 4 10 12 4 18-14 6-54 7-72-2Z`}
          fill="#16222E"
        />
        <text
          x={OBJ_X}
          y={171}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="20"
          fontWeight="700"
          fill="#F3E9D2"
        >
          ?
        </text>
      </g>
      {electra && (
        <g className="ls-fade-in" aria-hidden="true">
          {/* Simplified side silhouette of a twin-tail, low-wing airliner. */}
          <path
            d={`M${OBJ_X - 44} 168c3-5 10-8 21-8h50c8 0 13 1 17 4l-4-13h7l8 15c2 2 1 5-3 5h-82c-8 0-13-1-14-3Z`}
            fill="#D9A441"
            stroke="#0B1F33"
            strokeWidth="1.2"
          />
          <path d={`M${OBJ_X - 18} 171h34l-5 5h-24Z`} fill="#0B1F33" opacity="0.7" />
          <circle cx={OBJ_X - 31} cy={165} r="2" fill="#0B1F33" />
          <circle cx={OBJ_X - 24} cy={165} r="2" fill="#0B1F33" />
          <circle cx={OBJ_X - 17} cy={165} r="2" fill="#0B1F33" />
        </g>
      )}
    </g>
  );
}

export function LagoonSection({ phase, verdict, tide }: { phase: Phase; verdict: Verdict; tide: TidePoint[] | null }) {
  const now = useNow();
  const tideNow = now !== null && tide ? tideLevelNow(tide, new Date(now)) : null;
  // Water surface moves 16 units between the next 48 hours' low and high tide.
  const waterY = tideNow ? 104 - tideNow.level * 16 : 96;

  const mag = modeFor(phase, "magnetometer");
  const sonar = modeFor(phase, "sonar");
  const probe = modeFor(phase, "hydroprobe");
  const dredge = modeFor(phase, "dredge");
  const boatPhase = mag === "now" || sonar === "now" || probe === "now" || dredge === "now";

  return (
    <figure className="paper overflow-hidden rounded-[var(--radius-card)] ring-1 ring-rule">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="lagoon-title lagoon-desc"
        className="block h-auto w-full"
      >
        <title id="lagoon-title">Side view of the Taraia Object site</title>
        <desc id="lagoon-desc">
          A beach slopes into the lagoon. About 10 feet from shore, under as little as 5 feet of water, an unidentified dark
          object lies partly buried in sediment of unknown depth.
        </desc>
        <defs>
          <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DCEBF0" />
            <stop offset="1" stopColor="#FBF7EE" />
          </linearGradient>
          <linearGradient id="ls-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8FD0C8" />
            <stop offset="1" stopColor="#1F7A7A" />
          </linearGradient>
          <linearGradient id="ls-sediment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B9A27A" />
            <stop offset="0.55" stopColor="#D8C8A4" stopOpacity="0.8" />
            <stop offset="1" stopColor="#FBF7EE" stopOpacity="0" />
          </linearGradient>
          <pattern id="ls-grain" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#8A7550" opacity="0.5" />
            <circle cx="6" cy="5" r="0.6" fill="#8A7550" opacity="0.35" />
          </pattern>
          <clipPath id="ls-underwater">
            <rect x="0" y={waterY} width={W} height={FLOOR - waterY} />
          </clipPath>
        </defs>

        {/* sky, water, sediment */}
        <rect width={W} height={H} fill="url(#ls-sky)" />
        <rect className="ls-tide" x="0" y={waterY} width={W} height={FLOOR - waterY + 2} fill="url(#ls-water)" />
        <path d={`M0 ${FLOOR}H${W}`} stroke="#FBF7EE" strokeOpacity="0.5" />
        <rect x="0" y={FLOOR} width={W} height={H - FLOOR} fill="url(#ls-sediment)" />
        <rect x="0" y={FLOOR} width={W} height={H - FLOOR} fill="url(#ls-grain)" opacity="0.7" />

        {/* beach and a palm, drawn over the water's left edge */}
        <path d={`M0 84L70 86Q100 90 ${SHORE_X} 104L160 ${FLOOR}L0 ${FLOOR}Z`} fill="#E9DBBB" />
        <path d={`M0 84L70 86Q100 90 ${SHORE_X} 104L160 ${FLOOR}`} fill="none" stroke="#C9B385" strokeWidth="1.5" />
        <g stroke="#3E5B3A" strokeLinecap="round" fill="none">
          <path d="M38 86c2-14 1-26-4-38" stroke="#7A5C3A" strokeWidth="3" />
          <path d="M34 48c-8-4-17-2-22 4M34 48c-3-8-11-12-19-10M34 48c6-6 15-6 21-1M34 48c8-1 14 4 16 10M34 48c0-8 5-14 12-16" strokeWidth="2.5" />
        </g>

        {/* water surface line */}
        <path className="ls-tide" d={`M${SHORE_X - 8} ${waterY}H${W}`} stroke="#EEF4F7" strokeWidth="1.5" />

        {/* MAGNETOMETER: parallel transect passes, a sensor towed behind the boat */}
        {mag !== "off" && (
          <g opacity={mag === "done" ? 0.35 : 1} clipPath="url(#ls-underwater)">
            {[12, 22, 32].map((d) => (
              <path
                key={d}
                d={`M150 ${waterY + d}H${DIM_X - 8}`}
                stroke="#EEF4F7"
                strokeWidth="1.5"
                strokeDasharray="5 6"
                className={mag === "now" ? "ls-dash" : undefined}
              />
            ))}
          </g>
        )}
        {mag === "now" && (
          <g className="ls-boat-sweep">
            <path d={`M${BOAT_X + 17} ${waterY}q14 6 22 14`} stroke="#0B1F33" strokeWidth="1.2" fill="none" />
            <rect x={BOAT_X + 36} y={waterY + 12} width="9" height="4" rx="2" fill="#E8692C" stroke="#0B1F33" />
          </g>
        )}

        {/* SONAR: ping arcs spreading down toward the sediment */}
        {sonar !== "off" && (
          <g clipPath="url(#ls-underwater)" opacity={sonar === "done" ? 0.3 : 1}>
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={BOAT_X}
                cy={waterY + 4}
                r={20 + i * 18}
                fill="none"
                stroke="#EEF4F7"
                strokeWidth="1.8"
                className={sonar === "now" ? `ls-ping ls-ping-${i}` : undefined}
                style={{ transformOrigin: `${BOAT_X}px ${waterY + 4}px` }}
              />
            ))}
          </g>
        )}

        {/* DREDGE: a cleared hollow around the object, sediment lifting away */}
        {dredge !== "off" && (
          <path
            d={`M${OBJ_X - 44} ${FLOOR}q44 22 88 0`}
            fill="#5FA9A3"
            opacity={dredge === "done" ? 0.6 : 0.85}
          />
        )}

        <ObjectShape verdict={verdict} />
        <rect x="0" y={FLOOR + 6} width={W} height={H - FLOOR - 6} fill="url(#ls-sediment)" />
        <rect x="0" y={FLOOR + 6} width={W} height={H - FLOOR - 6} fill="url(#ls-grain)" opacity="0.7" />

        {dredge === "now" && (
          <g aria-hidden="true">
            <path d={`M${BOAT_X - 10} ${waterY + 2}C${BOAT_X - 30} ${waterY + 30} ${OBJ_X - 30} 140 ${OBJ_X - 16} 156`} stroke="#0B1F33" strokeWidth="2" fill="none" />
            {[-30, -18, -6, 8, 20, 32].map((dx, i) => (
              <circle key={dx} cx={OBJ_X + dx} cy={FLOOR - 2} r="1.8" fill="#B9A27A" className={`ls-rise ls-rise-${i % 3}`} />
            ))}
          </g>
        )}

        {/* HYDROPROBE: a rod pushed down until it touches the object */}
        {probe !== "off" && (
          <g opacity={probe === "done" ? 0.4 : 1}>
            <path
              d={`M${OBJ_X + 6} ${waterY - 8}V158`}
              stroke="#0B1F33"
              strokeWidth="2.2"
              strokeLinecap="round"
              pathLength={1}
              className={probe === "now" ? "ls-probe" : undefined}
            />
            {probe === "now" && <circle cx={OBJ_X + 6} cy={158} r="3" fill="none" stroke="#E8692C" strokeWidth="2" className="ls-touch" />}
          </g>
        )}

        {boatPhase && <Boat y={waterY} moving={mag === "now"} />}

        {/* F10 measurements, kept in the sky so overlays never cross them */}
        <g fontFamily="var(--font-sans)" fontWeight="600" fill="#0B1F33">
          <path d={`M${SHORE_X} 78H${OBJ_X - 38}M${SHORE_X} 72v12M${OBJ_X - 38} 72v12`} stroke="#0B1F33" strokeWidth="1.5" />
          <text x={(SHORE_X + OBJ_X - 38) / 2} y="66" textAnchor="middle" fontSize="18">
            ≈10 ft from shore
          </text>
          <text x={W - 8} y="24" textAnchor="end" fontSize="18">
            as little as
          </text>
          <text x={W - 8} y="44" textAnchor="end" fontSize="18">
            5 ft of water
          </text>
          <path d={`M${DIM_X} 50V${waterY - 2}`} stroke="#0B1F33" strokeWidth="1" strokeDasharray="2 3" />
        </g>
        <path
          className="ls-tide"
          d={`M${DIM_X} ${waterY + 2}V${FLOOR - 2}M${DIM_X - 5} ${waterY + 2}h10M${DIM_X - 5} ${FLOOR - 2}h10`}
          stroke="#FBF7EE"
          strokeWidth="1.8"
        />
        <text x="12" y={H - 12} fontFamily="var(--font-sans)" fontSize="17" fontWeight="600" fill="#574F43">
          sediment: depth unknown
        </text>
      </svg>
      <figcaption className="border-t border-rule px-4 py-3 text-ink-muted">
        {tideNow ? (
          <>Water level now (approx.), from a tide model. </>
        ) : null}
        Not to scale. Distances from aerial photos, as reported by Purdue.
      </figcaption>
    </figure>
  );
}
