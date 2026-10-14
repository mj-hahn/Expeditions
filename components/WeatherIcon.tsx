import type { WeatherIcon as Icon } from "@/lib/conditions-shared";

/** Simple original line icons for WMO weather groups. Decorative: the label carries meaning. */
export function WeatherIcon({ icon, className }: { icon: Icon; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const cloud = <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z" {...common} />;
  const sun = (
    <g {...common}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </g>
  );
  const drops = (n: number) => (
    <g {...common}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${8 + i * 4} 20l-1 2`} />
      ))}
    </g>
  );
  const body: Record<Icon, React.ReactNode> = {
    sun,
    moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" {...common} />,
    partly: (
      <g>
        <g transform="translate(-3 -3) scale(0.75)">{sun}</g>
        <g transform="translate(2 1) scale(0.9)">{cloud}</g>
      </g>
    ),
    cloud,
    fog: <path d="M4 9h16M6 13h12M4 17h16" {...common} />,
    drizzle: (
      <g>
        <g transform="translate(0 -3)">{cloud}</g>
        {drops(2)}
      </g>
    ),
    rain: (
      <g>
        <g transform="translate(0 -3)">{cloud}</g>
        {drops(3)}
      </g>
    ),
    showers: (
      <g>
        <g transform="translate(0 -3)">{cloud}</g>
        {drops(3)}
      </g>
    ),
    storm: (
      <g>
        <g transform="translate(0 -3)">{cloud}</g>
        <path d="M13 15l-3 4h3l-2 4" {...common} />
      </g>
    ),
    unknown: cloud,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {body[icon]}
    </svg>
  );
}
