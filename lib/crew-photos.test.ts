import { describe, expect, it } from "vitest";
import { normalizeName, portraitFromHtml } from "@/lib/crew-photos";

describe("crew portraits", () => {
  it("reads og:image, falls back to the featured image, and rejects non-https", () => {
    expect(portraitFromHtml('<meta property="og:image" content="https://amelia.prf.org/wp-content/uploads/a.jpg">')).toBe(
      "https://amelia.prf.org/wp-content/uploads/a.jpg",
    );
    expect(portraitFromHtml('<img class="wp-post-image" src="/wp-content/uploads/b.jpg">')).toBe(
      "https://amelia.prf.org/wp-content/uploads/b.jpg",
    );
    expect(portraitFromHtml('<meta property="og:image" content="javascript:alert(1)">')).toBeNull();
    expect(portraitFromHtml("<p>nothing</p>")).toBeNull();
    // Real markup shape from amelia.prf.org/crew/marc-hagle (featured media 1168)
    const html =
      '<img src="https://amelia.prf.org/logo.png" class="logo"><img width="400" height="565" src="https://amelia.prf.org/wp-content/uploads/2025/10/marc-hagle-bw_web.jpg" class="attachment-large size-large wp-image-1168" alt="Headshot of Marc Hagle">';
    expect(portraitFromHtml(html, 1168)).toBe("https://amelia.prf.org/wp-content/uploads/2025/10/marc-hagle-bw_web.jpg");
  });
  it("matches roster names to the site's upper-case titles", () => {
    expect(normalizeName("MARC HAGLE")).toBe(normalizeName("Marc Hagle"));
  });
});
