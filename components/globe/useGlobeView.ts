"use client";

import { geoInterpolate } from "d3-geo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clampLat, clampZoom, HOME, prefersReducedMotion, SETTLE_MS, START, TAP_SLOP, type View } from "./geo";

type Pt = { x: number; y: number };
type Base = { rot: [number, number]; zoom: number; mid: Pt; dist: number };
export type TapEvent = { clientX: number; clientY: number; view: View; rect: DOMRect };

const midpoint = (pts: Pt[]): Pt => ({ x: (pts[0].x + (pts[1] ?? pts[0]).x) / 2, y: (pts[0].y + (pts[1] ?? pts[0]).y) / 2 });
const distance = (pts: Pt[]) => (pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0);

/**
 * Camera state and every way to move it: fly-to, buttons, drag, pinch, ctrl+wheel.
 * `animating` is true while the camera is moving and for SETTLE_MS after, so callers can draw cheap geometry meanwhile.
 * State only changes in event handlers, rAF callbacks and timers.
 */
export function useGlobeView() {
  const [view, setView] = useState<View>(() => (prefersReducedMotion() ? HOME : START));
  const [animating, setAnimating] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef(view); // latest view for event handlers (state lags a frame)
  const goal = useRef<View>(view); // where button zooms build on, even mid-animation
  const anim = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const pointers = useRef(new Map<number, Pt>());
  const base = useRef<Base | null>(null);
  const gesture = useRef({ down: { x: 0, y: 0 }, moved: 0, multi: false });
  const tapCb = useRef<((e: TapEvent) => void) | null>(null);
  const inputCb = useRef<(() => void) | null>(null);

  const settleSoon = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      busy.current = false;
      setAnimating(false);
    }, SETTLE_MS);
  }, []);

  const commit = useCallback((v: View, setGoal = true) => {
    viewRef.current = v;
    if (setGoal) goal.current = v;
    if (settle.current) clearTimeout(settle.current);
    if (!busy.current) {
      busy.current = true;
      setAnimating(true);
    }
    setView(v);
  }, []);

  const stopAnim = useCallback(() => {
    if (anim.current) cancelAnimationFrame(anim.current);
    anim.current = null;
    if (busy.current) settleSoon();
  }, [settleSoon]);

  // Fly along a great circle, easing rotation and zoom together. Reduced motion runs a single frame, i.e. jumps.
  const flyTo = useCallback(
    (to: View, ms: number) => {
      stopAnim();
      goal.current = to;
      const from = viewRef.current;
      const interp = geoInterpolate([-from.lon, -from.lat], [-to.lon, -to.lat]);
      const duration = prefersReducedMotion() ? 0 : ms;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = duration ? Math.min(1, (t - t0) / duration) : 1;
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        const [lon, lat] = interp(e);
        commit({ lon: -lon, lat: -lat, zoom: from.zoom * (to.zoom / from.zoom) ** e }, false);
        if (k < 1) {
          anim.current = requestAnimationFrame(step);
        } else {
          anim.current = null;
          settleSoon();
        }
      };
      anim.current = requestAnimationFrame(step);
    },
    [commit, stopAnim, settleSoon],
  );

  // First view: swing from the US over to Nikumaroro.
  useEffect(() => {
    if (!prefersReducedMotion()) flyTo(HOME, 2200);
    return () => {
      if (anim.current) cancelAnimationFrame(anim.current);
      if (frame.current) cancelAnimationFrame(frame.current);
      if (settle.current) clearTimeout(settle.current);
    };
  }, [flyTo]);

  // Trackpad pinch arrives as ctrl+wheel; a plain wheel must still scroll the page.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      stopAnim();
      inputCb.current?.();
      const v = viewRef.current;
      commit({ ...v, zoom: clampZoom(v.zoom * Math.exp(-e.deltaY * 0.01)) });
      settleSoon();
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [commit, stopAnim, settleSoon]);

  const rebaseline = useCallback(() => {
    const pts = [...pointers.current.values()];
    const v = viewRef.current;
    base.current = pts.length ? { rot: [v.lon, v.lat], zoom: v.zoom, mid: midpoint(pts), dist: distance(pts) } : null;
  }, []);

  const applyGesture = useCallback(() => {
    frame.current = null;
    const b = base.current;
    const svg = svgRef.current;
    const pts = [...pointers.current.values()];
    if (!b || !svg || !pts.length) return;
    const rect = svg.getBoundingClientRect();
    const z = pts.length > 1 && b.dist > 0 ? clampZoom(b.zoom * (distance(pts) / b.dist)) : b.zoom;
    const k = 180 / rect.width / z; // degrees per pixel: one globe-width drag ≈ half a turn at zoom 1
    const mid = midpoint(pts);
    commit({ lon: b.rot[0] + (mid.x - b.mid.x) * k, lat: clampLat(b.rot[1] - (mid.y - b.mid.y) * k), zoom: z });
    settleSoon();
  }, [commit, settleSoon]);

  const svgHandlers = useMemo(() => {
    const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
      stopAnim();
      inputCb.current?.();
      goal.current = viewRef.current;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (pointers.current.size === 0) gesture.current = { down: { x: e.clientX, y: e.clientY }, moved: 0, multi: false };
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size > 1) gesture.current.multi = true;
      rebaseline();
    };
    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current;
      g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.down.x, e.clientY - g.down.y));
      if (frame.current === null) frame.current = requestAnimationFrame(applyGesture);
    };
    const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
      if (!pointers.current.delete(e.pointerId)) return;
      const g = gesture.current;
      const isTap = e.type === "pointerup" && !g.multi && g.moved < TAP_SLOP && pointers.current.size === 0;
      rebaseline(); // going from two fingers to one must not make the globe jump
      const svg = svgRef.current;
      if (isTap && svg) tapCb.current?.({ clientX: e.clientX, clientY: e.clientY, view: viewRef.current, rect: svg.getBoundingClientRect() });
    };
    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
  }, [stopAnim, rebaseline, applyGesture]);

  const zoomBy = useCallback(
    (factor: number) => {
      inputCb.current?.();
      const g = goal.current;
      flyTo({ ...g, zoom: clampZoom(g.zoom * factor) }, 350);
    },
    [flyTo],
  );

  const reset = useCallback(() => {
    inputCb.current?.();
    flyTo(HOME, 1000);
  }, [flyTo]);

  /** Register the tap handler; returns the unregister function, so it can be an effect body. */
  const onTap = useCallback((cb: (e: TapEvent) => void) => {
    tapCb.current = cb;
    return () => {
      if (tapCb.current === cb) tapCb.current = null;
    };
  }, []);

  /** Register what happens when the user grabs the globe, zooms or resets (e.g. cancel a replay). */
  const onInput = useCallback((cb: () => void) => {
    inputCb.current = cb;
    return () => {
      if (inputCb.current === cb) inputCb.current = null;
    };
  }, []);

  return { view, animating, flyTo, zoomBy, reset, svgHandlers, svgRef, onTap, onInput };
}
