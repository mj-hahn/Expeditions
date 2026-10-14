import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, MultiPoint, Position } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land10 from "world-atlas/land-10m.json";
import { PLACES } from "@/content/route-points";

const W = 360;
const LON_MIN = 178;
const LON_MAX = -168;
const LAT_MIN = -8;
const LAT_MAX = 3;
// 14 degrees of longitude by 11 of latitude; Mercator stretches latitude slightly, fit corrects it.
const H = 290;

/** Pure-SVG regional map, rendered on the server only (no client JS). */
export function IslandLocator() {
  const topo = land10 as unknown as Topology;
  const all = feature(topo, topo.objects.land as GeometryCollection) as FeatureCollection;
  // Only the small islands inside the box. Drawing the whole world through a map that
  // straddles the 180° line inverts the big continent polygons and floods the frame.
  const inBox = ([lon, lat]: Position) => (lon >= LON_MIN || lon <= LON_MAX) && lat >= LAT_MIN && lat <= LAT_MAX;
  const land: FeatureCollection = {
    type: "FeatureCollection",
    features: all.features.flatMap((f) => {
      const g = f.geometry;
      const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      return polys
        .filter((rings) => rings[0].every(inBox))
        .map((coordinates) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates } }));
    }),
  };
  const box: MultiPoint = {
    type: "MultiPoint",
    coordinates: [
      [LON_MIN, LAT_MIN],
      [LON_MAX, LAT_MIN],
      [LON_MAX, LAT_MAX],
      [LON_MIN, LAT_MAX],
    ],
  };
  const projection = geoMercator()
    .rotate([180, 0])
    .fitExtent(
      [
        [0, 0],
        [W, H],
      ],
      box,
    )
    .clipExtent([
      [0, 0],
      [W, H],
    ]);
  const landPath = geoPath(projection)(land) ?? "";

  const howland = projection([PLACES.howland.lon, PLACES.howland.lat]) as [number, number];
  const niku = projection([PLACES.nikumaroro.lon, PLACES.nikumaroro.lat]) as [number, number];

  // 100 km at the map's center latitude: one degree of longitude is 111.32 km * cos(lat).
  const midLat = (LAT_MIN + LAT_MAX) / 2;
  const dLon = 100 / (111.32 * Math.cos((midLat * Math.PI) / 180));
  const a = projection([-175, midLat]) as [number, number];
  const b = projection([-175 + dLon, midLat]) as [number, number];
  const scalePx = Math.abs(b[0] - a[0]);
  const sx = 16;
  const sy = H - 16;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Map of the central Pacific showing Howland Island to the north and Nikumaroro to the south, joined by a dashed line"
        className="block w-full overflow-hidden rounded-[var(--radius-card)]"
      >
        <rect width={W} height={H} className="fill-navy-2" />
        <path d={landPath} className="fill-sand-2" />
        <line
          x1={howland[0]}
          y1={howland[1]}
          x2={niku[0]}
          y2={niku[1]}
          className="stroke-amber"
          strokeWidth={2.5}
          strokeDasharray="7 5"
        />
        <g className="fill-signal stroke-foam" strokeWidth={2}>
          <circle cx={howland[0]} cy={howland[1]} r={6} />
          <circle cx={niku[0]} cy={niku[1]} r={6} />
        </g>
        <g className="fill-foam font-sans font-semibold" fontSize={17} stroke="#12304d" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke">
          <text x={howland[0] + 12} y={howland[1] - 8}>
            Howland Island
          </text>
          <text x={niku[0] + 12} y={niku[1] + 6}>
            Nikumaroro
          </text>
        </g>
        <g className="stroke-foam" strokeWidth={3}>
          <line x1={sx} y1={sy} x2={sx + scalePx} y2={sy} />
          <line x1={sx} y1={sy - 5} x2={sx} y2={sy + 5} />
          <line x1={sx + scalePx} y1={sy - 5} x2={sx + scalePx} y2={sy + 5} />
        </g>
        <text
          x={sx + scalePx + 8}
          y={sy + 6}
          fontSize={17}
          className="fill-foam font-sans font-semibold"
          stroke="#0b1f33"
          strokeWidth={4}
          paintOrder="stroke"
        >
          100 km
        </text>
      </svg>
      <figcaption className="mt-4">
        <ul className="space-y-2">
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="size-4 shrink-0 rounded-full bg-signal ring-2 ring-navy" />
            {PLACES.howland.name}
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="size-4 shrink-0 rounded-full bg-signal ring-2 ring-navy" />
            {PLACES.nikumaroro.name}
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="h-0 w-8 shrink-0 border-t-[3px] border-dashed border-amber" />
            Howland to Nikumaroro: about 400 miles
          </li>
        </ul>
        <p className="mt-3 text-[1rem] text-ink-muted">Map data: Natural Earth (public domain)</p>
      </figcaption>
    </figure>
  );
}
