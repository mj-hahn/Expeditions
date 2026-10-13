import { describe, it, expect } from "vitest";
import {
  ISLAND_TZ,
  HOME_TZ,
  formatClock,
  formatDispatchTimes,
  formatLongDate,
  formatShortDate,
  formatTime,
  hoursAhead,
  islandDate,
  islandDayNumber,
  isWithinHours,
  relativeTime,
  zonedParts,
} from "@/lib/time";

const d = (s: string) => new Date(s);

describe("island timezone", () => {
  it("resolves to a UTC+13 zone", () => {
    expect(["Pacific/Kanton", "Pacific/Enderbury", "Etc/GMT-13"]).toContain(ISLAND_TZ);
    const p = zonedParts(d("2026-10-13T00:00:00Z"), ISLAND_TZ);
    expect(p.hour).toBe(13);
    expect(HOME_TZ).toBe("America/Toronto");
  });
});

describe("formatting", () => {
  it("formats dispatch times in both zones", () => {
    expect(formatDispatchTimes(d("2026-10-12T14:16:09Z"))).toEqual({
      home: "Mon, Oct 12 · 10:16 a.m.",
      island: "Tue 3:16 a.m.",
    });
  });
  it("formats noon and midnight", () => {
    expect(formatTime(d("2026-10-12T16:00:00Z"), HOME_TZ)).toBe("12:00 p.m.");
    expect(formatTime(d("2026-10-12T04:00:00Z"), HOME_TZ)).toBe("12:00 a.m.");
    expect(formatTime(d("2026-10-12T19:05:00Z"), HOME_TZ)).toBe("3:05 p.m.");
  });
  it("formats dates and clock", () => {
    const t = d("2026-10-13T14:16:00Z");
    expect(formatShortDate(t)).toBe("Oct 13");
    expect(formatLongDate(t)).toBe("Tuesday, October 13");
    expect(formatClock(t, HOME_TZ)).toEqual({
      time: "10:16",
      ampm: "a.m.",
      weekday: "Tue",
      date: "Oct 13",
    });
  });
  it("gives island calendar date", () => {
    expect(islandDate(d("2026-10-12T11:00:00Z"))).toBe("2026-10-13");
    expect(islandDate(d("2026-10-12T10:59:00Z"))).toBe("2026-10-12");
  });
});

describe("hoursAhead", () => {
  it("is 17 before and 18 after Toronto DST ends", () => {
    expect(hoursAhead(d("2026-10-20T12:00:00Z"))).toBe(17);
    expect(hoursAhead(d("2026-11-05T12:00:00Z"))).toBe(18);
  });
});

describe("islandDayNumber", () => {
  it("counts island calendar days", () => {
    expect(islandDayNumber(d("2026-10-12T10:59:00Z"))).toBe(0);
    expect(islandDayNumber(d("2026-10-12T11:00:00Z"))).toBe(1);
    expect(islandDayNumber(d("2026-10-14T00:00:00Z"))).toBe(2);
  });
});

describe("relativeTime", () => {
  const now = d("2026-10-20T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;
  const HR = 60 * MIN;
  it("buckets", () => {
    expect(relativeTime(ago(30_000), now)).toBe("just now");
    expect(relativeTime(ago(MIN), now)).toBe("1 minute ago");
    expect(relativeTime(ago(5 * MIN), now)).toBe("5 minutes ago");
    expect(relativeTime(ago(HR), now)).toBe("1 hour ago");
    expect(relativeTime(ago(3 * HR), now)).toBe("3 hours ago");
    expect(relativeTime(ago(30 * HR), now)).toBe("yesterday");
    expect(relativeTime(ago(72 * HR), now)).toBe("3 days ago");
    expect(relativeTime(ago(20 * 24 * HR), now)).toBe("Sep 30");
    expect(relativeTime(new Date(now.getTime() + HR), now)).toBe("just now");
  });
  it("isWithinHours", () => {
    expect(isWithinHours(ago(2 * HR), now, 3)).toBe(true);
    expect(isWithinHours(ago(4 * HR), now, 3)).toBe(false);
  });
});
