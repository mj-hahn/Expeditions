"use client";

import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import { landPiece, landPolygons, prepareLand, type LandPiece } from "./geo";

const toLand = (t: unknown) => {
  const topo = t as Topology<{ land: GeometryCollection }>;
  return feature(topo, topo.objects.land);
};

export const LAND_110: LandPiece[] = prepareLand(toLand(land110));

// Bounding the 50m polygons is ~100k distance calls; slice it up so a fly-to in progress keeps its frames.
function prepareInSlices(polys: ReturnType<typeof landPolygons>, done: (p: LandPiece[]) => void) {
  const out: LandPiece[] = [];
  const run = () => {
    const end = performance.now() + 4;
    while (out.length < polys.length && performance.now() < end) out.push(landPiece(polys[out.length]));
    if (out.length < polys.length) setTimeout(run, 0);
    else done(out);
  };
  run();
}

/** The detailed coastline, fetched the first time `wanted` turns true. Null until it arrives. */
export function useDetailedLand(wanted: boolean): LandPiece[] | null {
  const [land, setLand] = useState<LandPiece[] | null>(null);
  const requested = useRef(false);
  useEffect(() => {
    if (!wanted || requested.current) return;
    requested.current = true;
    import("world-atlas/land-50m.json")
      .then((m) => prepareInSlices(landPolygons(toLand(m.default)), setLand))
      .catch(() => {
        requested.current = false;
      });
  }, [wanted]);
  return land;
}
