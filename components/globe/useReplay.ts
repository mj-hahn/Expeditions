"use client";

import { geoInterpolate } from "d3-geo";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoyageStep } from "@/lib/voyage";
import { coords, prefersReducedMotion, type View } from "./geo";

export type Replay = { pos: [number, number]; index: number };

const LEAD = 1400;
const SEGMENT = 1500;

/** The ship's voyage replay: fly to frame the leg, then move the ship dispatch to dispatch (datelines only, never interpolated by time). */
export function useReplay(track: VoyageStep[], flyTo: (to: View, ms: number) => void) {
  const [replay, setReplay] = useState<Replay | null>(null);
  const raf = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setReplay(null);
  }, []);

  const start = useCallback(() => {
    if (track.length < 2) return;
    cancel();
    const last = track.length - 1;
    const pt = (i: number): [number, number] => [track[i].lon, track[i].lat];
    const mid = geoInterpolate(coords("tarawa"), coords("nikumaroro"))(0.5);
    flyTo({ lon: -mid[0], lat: -mid[1], zoom: 4 }, LEAD);
    if (prefersReducedMotion()) {
      setReplay({ pos: pt(last), index: last });
      return;
    }
    setReplay({ pos: pt(0), index: 0 });
    const t0 = performance.now();
    const step = (t: number) => {
      const el = t - t0 - LEAD;
      if (el < 0) {
        raf.current = requestAnimationFrame(step);
        return;
      }
      const s = Math.min(last - 1, Math.floor(el / SEGMENT));
      const k = Math.min(1, (el - s * SEGMENT) / SEGMENT);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const finished = el >= last * SEGMENT;
      setReplay({ pos: finished ? pt(last) : geoInterpolate(pt(s), pt(s + 1))(e), index: finished ? last : s + (k >= 1 ? 1 : 0) });
      raf.current = finished ? null : requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [track, flyTo, cancel]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return { replay, start, cancel, canReplay: track.length >= 2 };
}
