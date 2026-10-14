import { describe, expect, it } from "vitest";
import { datelinePlace, type DispatchPin } from "@/lib/dateline-place";
import { voyageTrack } from "@/lib/voyage";

const pin = (slug: string, publishedAt: string, dateline: string): DispatchPin => ({
  slug,
  title: slug,
  publishedAt,
  kind: "dispatch",
  place: datelinePlace(dateline)!,
});

const ALL = [
  pin("c", "2026-10-12T14:16:09Z", "NIKUMARORO, Kiribati"),
  pin("b", "2026-10-09T13:26:32Z", "HALFWAY BETWEEN TARAWA AND NIKUMARORO, Kiribati"),
  pin("a2", "2026-10-07T20:08:41Z", "TARAWA, Kiribati"),
  pin("a1", "2026-10-06T13:00:09Z", "TARAWA, Kiribati"),
  pin("p", "2026-10-02T21:14:11Z", "WEST LAFAYETTE, Ind."),
];

describe("voyageTrack", () => {
  it("orders by publish time and ignores places off the voyage", () => {
    const t = voyageTrack(ALL);
    expect(t.map((s) => s.key)).toEqual(["tarawa", "between-tarawa-nikumaroro", "nikumaroro"]);
    expect(t[0].slug).toBe("a1");
  });

  it("only includes Tarawa and Nikumaroro when dispatched from", () => {
    expect(voyageTrack(ALL.filter((p) => p.slug === "b")).map((s) => s.key)).toEqual(["between-tarawa-nikumaroro"]);
  });

  it("is empty with no voyage dispatches", () => {
    expect(voyageTrack([])).toEqual([]);
    expect(voyageTrack(ALL.filter((p) => p.slug === "p"))).toEqual([]);
  });
});
