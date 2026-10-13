import { describe, expect, it } from "vitest";
import { buildEmail } from "@/emails/render";
import { site } from "@/content/site";
import type { Dispatch, Status } from "@/lib/types";

// Synthetic test dispatch.
const d: Dispatch = {
  id: 1,
  slug: "synthetic-slug",
  url: "https://example.test/original",
  publishedAt: new Date("2026-10-13T00:00:00Z"),
  updatedAt: new Date("2026-10-13T00:00:00Z"),
  kind: "dispatch",
  title: "Earhart expedition update: Base camp is up",
  dateline: "NIKUMARORO, Kiribati",
  lead: "The team has landed gear and started cutting a trail to the lagoon.",
  blocks: [],
  photos: [],
  hero: { src: "https://example.test/hero.jpg", alt: "Synthetic hero" },
};
const status: Status = {
  phase: "base_camp",
  verdict: "confirmed_electra",
  headline: null,
  note: "Synthetic note",
  noteUrl: "https://example.test/note",
  updatedAt: "",
};

describe("buildEmail", () => {
  it("builds subject, html and text", async () => {
    const r = await buildEmail(d, { siteUrl: "https://site.test", verdictChanged: false, status });
    expect(r.subject).toBe("New from Nikumaroro: Base camp is up");
    expect(r.html).toContain("https://site.test/dispatch/synthetic-slug");
    expect(r.html).toContain("https://example.test/hero.jpg");
    expect(r.html).toContain("https://example.test/original");
    expect(r.html).toContain("not affiliated with Purdue University");
    expect(r.html).not.toContain("Verdict update");
    expect(r.text).toContain(d.lead);
    expect(r.text).toContain("Base camp is up");
    expect(r.text).toContain("NIKUMARORO, KIRIBATI");
    expect(r.text).toContain("https://site.test/dispatch/synthetic-slug");
    expect(r.text).toContain("https://example.test/original");
    expect(r.text).toContain(site.disclaimer);
    expect(r.text).toContain("Reply to this email to stop.");
  });

  it("adds the verdict banner with note link when changed", async () => {
    const r = await buildEmail(d, { siteUrl: "https://site.test", verdictChanged: true, status });
    expect(r.html).toContain("Verdict update: It&#x27;s the Electra");
    expect(r.html).toContain("#D9A441");
    expect(r.html).toContain("https://example.test/note");
    expect(r.text).toContain("Synthetic note");
  });
});
