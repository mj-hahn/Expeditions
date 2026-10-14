"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DispatchPin } from "@/lib/dateline-place";
import type { Phase } from "@/lib/types";
import { voyageTrack } from "@/lib/voyage";
import { BUTTON_ZOOM, DETAIL_ZOOM, MAX_ZOOM, MIN_ZOOM } from "./geo";
import { GlobeCanvas } from "./GlobeCanvas";
import { useDetailedLand } from "./land";
import { hitStop } from "./markers";
import { ReplayCaption } from "./ReplayCaption";
import { revealGlobe } from "./scroll";
import { StopCard } from "./StopCard";
import { StopChips } from "./StopChips";
import { StopNav } from "./StopNav";
import { buildTourStops, groupPins, type TourStop } from "./tour";
import { useGlobeView } from "./useGlobeView";
import { useReplay } from "./useReplay";
import { ZoomControls } from "./ZoomControls";

export { legProgress, teamLocation } from "./progress";

// Orthographic globe of both journeys (SPEC §7.4) with a stop tour. No tiles, no API keys.
// Only `view` (and the replay ship) change per frame, and only GlobeCanvas receives them; every callback
// below is stable across frames, so the memoized HTML never re-renders while the globe moves.
export default function JourneyGlobe({ phase, pins }: { phase: Phase; pins: DispatchPin[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { view, animating, flyTo, zoomBy, reset, svgHandlers, svgRef, onTap, onInput } = useGlobeView();

  const byPlace = useMemo(() => groupPins(pins), [pins]);
  const track = useMemo(() => voyageTrack(pins), [pins]);
  const stops = useMemo(() => buildTourStops(pins, track), [pins, track]);
  const { replay, start: startReplay, cancel: cancelReplay, canReplay } = useReplay(track, flyTo);

  // The coarse coastline is drawn while moving; the fine one only once zoomed in and still.
  const wantDetail = view.zoom >= DETAIL_ZOOM;
  const land50 = useDetailedLand(wantDetail);

  const selectedIndex = stops.findIndex((s) => s.key === selected);
  const selectedStop = stops[selectedIndex] ?? null;

  const selectStop = useCallback(
    (stop: TourStop) => {
      cancelReplay();
      setSelected(stop.key);
      flyTo({ lon: -stop.lon, lat: -stop.lat, zoom: stop.zoom }, 1400);
      revealGlobe(svgRef.current); // the fly-to is only seen if the globe is on screen
    },
    [cancelReplay, flyTo, svgRef],
  );

  useEffect(() => onInput(cancelReplay), [onInput, cancelReplay]);
  useEffect(
    () =>
      onTap(({ clientX, clientY, view: v, rect }) => {
        const stop = hitStop(stops, byPlace, v, rect, clientX, clientY);
        if (stop) selectStop(stop);
      }),
    [onTap, stops, byPlace, selectStop],
  );

  const onStart = useCallback(() => selectStop(stops[0]), [selectStop, stops]);
  const onBack = useCallback(() => selectStop(stops[selectedIndex - 1]), [selectStop, stops, selectedIndex]);
  const onNext = useCallback(() => selectStop(stops[selectedIndex + 1]), [selectStop, stops, selectedIndex]);
  const onClose = useCallback(() => setSelected(null), []);
  const onReset = useCallback(() => {
    setSelected(null);
    reset();
  }, [reset]);
  const onZoomIn = useCallback(() => zoomBy(BUTTON_ZOOM), [zoomBy]);
  const onZoomOut = useCallback(() => zoomBy(1 / BUTTON_ZOOM), [zoomBy]);

  return (
    <div>
      <GlobeCanvas
        view={view}
        animating={animating}
        land50={land50}
        phase={phase}
        stops={stops}
        byPlace={byPlace}
        track={track}
        selectedKey={selected}
        replay={replay}
        svgRef={svgRef}
        handlers={svgHandlers}
      />
      <StopNav index={selectedIndex} total={stops.length} onBack={onBack} onNext={onNext} onStart={onStart} />
      <ZoomControls atMin={view.zoom <= MIN_ZOOM + 0.01} atMax={view.zoom >= MAX_ZOOM - 0.01} onZoomOut={onZoomOut} onReset={onReset} onZoomIn={onZoomIn} />
      <StopChips stops={stops} selected={selected} onSelect={selectStop} />
      <StopCard stop={selectedStop} dispatches={selectedStop ? byPlace.get(selectedStop.placeKey) : undefined} canReplay={canReplay} onReplay={startReplay} onClose={onClose} />
      <ReplayCaption step={replay ? (track[replay.index] ?? null) : null} />
    </div>
  );
}
