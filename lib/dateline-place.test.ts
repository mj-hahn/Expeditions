import { describe, expect, it } from "vitest";
import { datelinePlace } from "@/lib/dateline-place";

describe("datelinePlace", () => {
  it("matches the datelines Purdue has actually used", () => {
    expect(datelinePlace("NIKUMARORO, Kiribati")).toMatchObject({ key: "nikumaroro", lon: -174.52, lat: -4.67 });
    expect(datelinePlace("TARAWA, Kiribati")).toMatchObject({ key: "tarawa" });
    expect(datelinePlace("WEST LAFAYETTE, Ind.")).toMatchObject({ key: "purdue", label: "Purdue University Airport, West Lafayette" });
  });

  it("puts halfway datelines at the midpoint of the two places", () => {
    const p = datelinePlace("HALFWAY BETWEEN TARAWA AND NIKUMARORO, Kiribati")!;
    expect(p.key).toBe("between-tarawa-nikumaroro");
    expect(p.label).toBe("Halfway between Tarawa and Nikumaroro");
    expect(p.lat).toBeGreaterThan(-4.67);
    expect(p.lat).toBeLessThan(1.35);
  });

  it("is case-insensitive and knows the other stops", () => {
    expect(datelinePlace("los angeles, Calif.")?.key).toBe("lax");
    expect(datelinePlace("Nadi, Fiji")?.key).toBe("nadi");
    expect(datelinePlace("FIJI")?.key).toBe("nadi");
    expect(datelinePlace("Howland Island")?.key).toBe("howland");
    expect(datelinePlace("Baker Island")).toBeNull(); // never a guess
    expect(datelinePlace("HOWLAND, Kiribati")?.key).toBe("howland");
    expect(datelinePlace("Lae, Papua New Guinea")?.key).toBe("lae");
  });

  it("returns null for unknown or missing datelines", () => {
    expect(datelinePlace("HONOLULU, Hawaii")).toBeNull();
    expect(datelinePlace("HALFWAY BETWEEN TARAWA AND MARS")).toBeNull();
    expect(datelinePlace("")).toBeNull();
    expect(datelinePlace(undefined)).toBeNull();
  });
});
