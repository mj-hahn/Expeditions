"use client";

import { isNightOnIsland, moonInfo, moonPath } from "@/lib/sky";
import { useNow } from "@/lib/use-now";

// Decorative backdrop for the top banner that follows day and night on Nikumaroro:
// a warm sun glow by day, stars and the actual moon phase by night. Purely visual.

// Fixed pseudo-random star positions (deterministic so nothing shifts between renders).
const STARS = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 73.13) % 100;
  const y = (i * 37.71 + (i % 7) * 11) % 100;
  const r = i % 9 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7;
  return { x, y, r, twinkle: i % 5 === 0 };
});

export function HeroSky() {
  const now = useNow();
  if (now === null) return null;
  const date = new Date(now);
  const night = isNightOnIsland(date);

  if (!night) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% 0%, rgb(217 164 65 / 0.28), transparent 45%), radial-gradient(circle at 10% 100%, rgb(31 122 122 / 0.25), transparent 50%)",
        }}
      />
    );
  }

  const moon = moonInfo(date);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#071526]/70">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="#EEF4F7"
            opacity={s.r > 1 ? 0.9 : 0.55}
            className={s.twinkle ? "star-twinkle" : undefined}
            style={s.twinkle ? { animationDelay: `${(i % 4) * 0.7}s` } : undefined}
          />
        ))}
      </svg>
      {moon.aboveHorizon && (
        <svg viewBox="-24 -24 48 48" className="absolute top-24 right-6 size-14 sm:top-28 sm:size-16">
          <circle r="20" fill="#1C4266" />
          <path d={moonPath(moon.phase, 20)} fill="#EEF4F7" />
          <circle r="20" fill="none" stroke="#EEF4F7" strokeOpacity="0.25" />
        </svg>
      )}
    </div>
  );
}
