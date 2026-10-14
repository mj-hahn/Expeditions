import type { Anchor } from "../labels";

const HALO = { stroke: "#0B1F33", strokeWidth: 4, paintOrder: "stroke" } as const;

type Opts = { anchor?: Anchor; mono?: boolean; italic?: boolean; opacity?: number; fill?: string };

/** A haloed SVG label, 17px so it stays readable once the globe is scaled to a phone. */
export function text(x: number, y: number, s: string, o: Opts = {}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={o.anchor ?? "start"}
      fontSize="17"
      fontWeight={o.mono ? 500 : 600}
      fontStyle={o.italic ? "italic" : undefined}
      fontFamily={o.mono ? "var(--font-mono)" : "var(--font-sans)"}
      fill={o.fill ?? "#EEF4F7"}
      fillOpacity={o.opacity}
      {...HALO}
    >
      {s}
    </text>
  );
}
