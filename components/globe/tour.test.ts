import { describe, expect, it } from "vitest";
import type { DispatchPin } from "@/lib/dateline-place";
import { voyageTrack } from "@/lib/voyage";
import { buildTourStops, markerStops, STORY_STOPS } from "@/components/globe/tour";

const pin = (slug: string, publishedAt: string, key: string, label: string): DispatchPin => ({
  slug,
  title: slug,
  publishedAt,
  kind: "dispatch",
  place: { key, label, lon: 175, lat: -2 },
});

describe("buildTourStops", () => {
  it("is just the story stops when no dispatch was written at sea", () => {
    const pins = [pin("a", "2026-01-01T00:00:00Z", "tarawa", "Tarawa")];
    expect(buildTourStops(pins, voyageTrack(pins))).toEqual(STORY_STOPS);
  });

  it("slots each at-sea place once, just before the 2026 Nikumaroro visit", () => {
    const pins = [
      pin("a", "2026-01-01T00:00:00Z", "tarawa", "Tarawa"),
      pin("b", "2026-01-02T00:00:00Z", "between-tarawa-nikumaroro", "Halfway between Tarawa and Nikumaroro"),
      pin("c", "2026-01-03T00:00:00Z", "nikumaroro", "Nikumaroro"),
      pin("d", "2026-01-04T00:00:00Z", "between-tarawa-nikumaroro", "Halfway between Tarawa and Nikumaroro"),
    ];
    const stops = buildTourStops(pins, voyageTrack(pins));
    expect(stops).toHaveLength(STORY_STOPS.length + 1);
    const i = stops.findIndex((s) => s.key === "between-tarawa-nikumaroro");
    expect(stops[i].short).toBe("Halfway");
    expect(stops[i + 1].key).toBe("niku-2026");
    expect(stops[i - 1].key).toBe("tarawa");
  });
});

describe("markerStops", () => {
  it("draws one dot per place and gives Nikumaroro to the 2026 stop", () => {
    const m = markerStops(STORY_STOPS);
    expect(m.filter((s) => s.placeKey === "nikumaroro").map((s) => s.key)).toEqual(["niku-2026"]);
    expect(new Set(m.map((s) => s.placeKey)).size).toBe(m.length);
  });
});
