import { describe, expect, it } from "vitest";
import { cullLand, fineGraticule, prepareLand, visibleAngle, type LandPiece } from "@/components/globe/geo";

const square = (lon: number, lat: number, half = 2): [number, number][] => [
  [lon - half, lat - half],
  [lon - half, lat + half],
  [lon + half, lat + half],
  [lon + half, lat - half],
  [lon - half, lat - half],
];
const piece = (centre: [number, number], radius: number): LandPiece => ({
  feature: { type: "Feature", properties: { id: centre.join() }, geometry: { type: "Polygon", coordinates: [] } },
  centre,
  radius,
});
const ids = (fs: { properties: unknown }[]) => fs.map((f) => (f.properties as { id: string }).id);
const view = { lon: 0, lat: 0, zoom: 1 }; // d3 rotation 0,0 centres on lon 0, lat 0

describe("prepareLand", () => {
  it("splits a MultiPolygon and bounds each piece", () => {
    const pieces = prepareLand({
      type: "Feature",
      properties: {},
      geometry: { type: "MultiPolygon", coordinates: [[square(10, 10)], [square(-100, 40, 5)]] },
    });
    expect(pieces).toHaveLength(2);
    expect(pieces[0].centre[0]).toBeCloseTo(10, 0);
    expect(pieces[0].radius).toBeGreaterThan(0.02);
    expect(pieces[0].radius).toBeLessThan(0.1);
    expect(pieces[1].radius).toBeGreaterThan(pieces[0].radius);
  });
});

describe("visibleAngle", () => {
  it("is the full hemisphere when zoomed out and narrows as you zoom in", () => {
    expect(visibleAngle(1)).toBeCloseTo(Math.PI / 2);
    expect(visibleAngle(3)).toBeLessThan(visibleAngle(2));
    expect(visibleAngle(10)).toBeLessThan(0.5);
  });
});

describe("cullLand", () => {
  it("drops a polygon on the far side and keeps one at the centre", () => {
    const far = piece([180, 0], 0.05);
    const near = piece([0, 0], 0.05);
    expect(ids(cullLand([far, near], view))).toEqual(["0,0"]);
  });

  it("keeps a huge polygon whose centroid is far away but whose radius covers the view", () => {
    const huge = piece([150, 0], 2.5);
    const small = piece([150, 0], 0.1);
    expect(ids(cullLand([huge, small], view))).toEqual(["150,0"]);
    expect(cullLand([huge], view)).toHaveLength(1);
    expect(cullLand([small], view)).toHaveLength(0);
  });

  it("culls tighter when zoomed in", () => {
    const off = piece([60, 0], 0.05);
    expect(cullLand([off], view)).toHaveLength(1);
    expect(cullLand([off], { ...view, zoom: 6 })).toHaveLength(0);
  });
});

describe("fineGraticule", () => {
  it("covers the view across the antimeridian and is far smaller than the whole globe", () => {
    const g = fineGraticule({ lon: 174.5, lat: 4.67, zoom: 5 }); // centred on lon -174.5
    const lines = g.coordinates;
    expect(lines.length).toBeGreaterThan(10);
    expect(lines.length).toBeLessThan(150);
    const lonsNorm = lines.flatMap((l) => l.map(([x]) => ((x + 540) % 360) - 180));
    expect(lonsNorm.some((x) => Math.abs(x - -174) < 1)).toBe(true);
    expect(lonsNorm.some((x) => Math.abs(x - 175) < 1)).toBe(true);
  });
});
