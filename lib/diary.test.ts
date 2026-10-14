import { describe, it, expect } from "vitest";
import { buildDiary, diaryDayLabel, phasesOnDate } from "@/lib/diary";
import type { Dispatch } from "@/lib/types";

describe("phasesOnDate", () => {
  it("covers single-day and range phases", () => {
    expect(phasesOnDate("2026-10-02")).toEqual(["departed"]);
    expect(phasesOnDate("2026-10-07")).toEqual(["tarawa", "at_sea"]);
    expect(phasesOnDate("2026-10-12")).toEqual(["at_sea", "arrived"]);
    expect(phasesOnDate("2026-10-13")).toEqual(["base_camp"]);
    expect(phasesOnDate("2026-10-20")).toEqual([]);
  });
});

// Synthetic dispatches for testing only.
function synthetic(id: number, iso: string): Dispatch {
  const publishedAt = new Date(iso);
  return {
    id,
    slug: `synthetic-${id}`,
    url: `https://example.test/${id}`,
    publishedAt,
    updatedAt: publishedAt,
    kind: "dispatch",
    title: `Synthetic ${id}`,
    lead: "Synthetic lead.",
    blocks: [],
    photos: [],
  };
}

describe("buildDiary", () => {
  // Island is UTC+13: 2026-10-12T20:00Z is Oct 13 on the island.
  const list = [
    synthetic(1, "2026-10-12T20:00:00Z"),
    synthetic(2, "2026-10-12T22:00:00Z"),
    synthetic(3, "2026-10-06T00:00:00Z"),
  ];
  const diary = buildDiary(list, "2026-10-05", "2026-10-14");

  it("is newest first with one entry per day", () => {
    expect(diary.map((d) => d.date)[0]).toBe("2026-10-14");
    expect(diary).toHaveLength(10);
    expect(diary.at(-1)?.date).toBe("2026-10-05");
  });

  it("assigns dispatches by island date, newest first within a day", () => {
    const oct13 = diary.find((d) => d.date === "2026-10-13")!;
    expect(oct13.dispatches.map((d) => d.id)).toEqual([2, 1]);
    expect(oct13.day).toBe(1);
    expect(oct13.phases).toEqual(["base_camp"]);
    expect(diary.find((d) => d.date === "2026-10-06")!.dispatches.map((d) => d.id)).toEqual([3]);
    expect(diary.find((d) => d.date === "2026-10-14")!.dispatches).toEqual([]);
  });
});

describe("diaryDayLabel", () => {
  it("uses weekday before arrival and Day N after", () => {
    expect(diaryDayLabel("2026-10-07")).toBe("Wednesday, Oct 7");
    expect(diaryDayLabel("2026-10-13")).toBe("Day 1 on Nikumaroro");
    expect(diaryDayLabel("2026-10-14")).toBe("Day 2 on Nikumaroro");
  });
});
