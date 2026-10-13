// NOTE: all HTML below is SYNTHETIC, modelled on SPEC §4.2 (not real Purdue markup).
import { describe, it, expect } from "vitest";
import { parseDispatchContent, htmlToText } from "@/lib/parse-dispatch";

const P = (t: string) => `<p class="wp-block-paragraph">${t}</p>`;
const parse = (html: string, excerpt = "<p>Excerpt text [&hellip;]</p>") =>
  parseDispatchContent(html, excerpt);

describe("dateline and lead", () => {
  it("extracts the dateline before the em dash", () => {
    const r = parse(P("NIKUMARORO, Kiribati &#8212; The team has landed.") + P("Second."));
    expect(r.dateline).toBe("NIKUMARORO, Kiribati");
    expect(r.lead).toBe("The team has landed.");
    expect(r.fallback).toBe(false);
    expect(r.blocks).toEqual([{ type: "paragraph", text: "Second.", isQuote: false }]);
  });
  it("handles en dash", () => {
    expect(parse(P("TARAWA, Kiribati – Hello.")).dateline).toBe("TARAWA, Kiribati");
  });
  it("no dateline when there is no dash", () => {
    const r = parse(P("The crew is at sea.") + P("More."));
    expect(r.dateline).toBeUndefined();
    expect(r.lead).toBe("The crew is at sea.");
  });
  it("no dateline when the dash is late or preceded by a sentence", () => {
    const r = parse(P("The crew arrived. Then they rested — a long day."));
    expect(r.dateline).toBeUndefined();
    expect(r.lead).toContain("The crew arrived.");
  });
});

describe("blocks", () => {
  it("detects quotes", () => {
    const r = parse(P("Lead.") + P("&#8220;We are here,&#8221; said a member.") + P("Plain."));
    expect(r.blocks.map((b) => b.type === "paragraph" && b.isQuote)).toEqual([true, false]);
  });
  it("emits headings and list items", () => {
    const r = parse(P("Lead.") + '<h2 class="wp-block-heading">Day one</h2><ul><li>Alpha</li><li>Beta</li></ul>');
    expect(r.blocks).toEqual([
      { type: "heading", text: "Day one" },
      { type: "paragraph", text: "• Alpha", isQuote: false },
      { type: "paragraph", text: "• Beta", isQuote: false },
    ]);
  });
  it("descends into wrapper divs", () => {
    const r = parse(`<div><section>${P("Lead.")}${P("Body.")}</section></div>`);
    expect(r.blocks).toHaveLength(1);
  });
  it("parses figure with figcaption", () => {
    const r = parse(
      P("Lead.") +
        '<figure class="wp-block-image"><img src="https://x.test/a.jpg" alt="  Boat " width="800" height="600" srcset="https://x.test/a-300.jpg 300w, https://x.test/a.jpg 800w"><figcaption>The   boat &amp; crew</figcaption></figure>',
    );
    expect(r.blocks[0]).toEqual({
      type: "figure",
      photo: {
        src: "https://x.test/a.jpg",
        srcSet: "https://x.test/a-300.jpg 300w, https://x.test/a.jpg 800w",
        alt: "Boat",
        caption: "The boat & crew",
        width: 800,
        height: 600,
      },
    });
  });
  it("alt falls back to caption, then empty", () => {
    const r = parse(
      P("Lead.") +
        '<figure><img src="/a.jpg"><figcaption>Cap</figcaption></figure><figure><img src="/b.jpg"></figure>',
    );
    expect(r.photos.map((p) => p.alt)).toEqual(["Cap", ""]);
  });
});

describe("carousel", () => {
  const slide = (src: string, cap: string) =>
    `<div class="slide"><div class="purdue-home-cta-carousel__card-image"><img src="${src}" alt=""></div><div class="purdue-home-cta-carousel__story-content"><p>${cap}</p></div></div>`;
  const carousel = `<div class="purdue-home-cta-carousel"><h2>Earhart team underway</h2><div class="track">${slide("https://x.test/1.jpg", "First caption")}${slide("https://x.test/2.jpg", "Second caption")}</div></div>`;

  it("becomes a gallery with captions and ignores its h2", () => {
    const r = parse(P("Lead.") + carousel + P("After."));
    expect(r.blocks).toHaveLength(2);
    const g = r.blocks[0];
    expect(g.type).toBe("gallery");
    if (g.type === "gallery") {
      expect(g.photos.map((p) => p.caption)).toEqual(["First caption", "Second caption"]);
      expect(g.photos[0].alt).toBe("First caption");
    }
    expect(JSON.stringify(r.blocks)).not.toContain("Earhart team underway");
  });
  it("pairs captions by index when slide structure is flat", () => {
    const flat = `<div class="purdue-home-cta-carousel"><div><div class="purdue-home-cta-carousel__card-image"><img src="/1.jpg"></div><div class="purdue-home-cta-carousel__card-image"><img src="/2.jpg"></div><div class="purdue-home-cta-carousel__story-content">A</div><div class="purdue-home-cta-carousel__story-content">B</div></div></div>`;
    const r = parse(P("Lead.") + flat);
    const g = r.blocks[0];
    expect(g.type === "gallery" && g.photos.map((p) => p.caption)).toEqual(["A", "B"]);
  });
});

describe("photos", () => {
  it("de-duplicates by src, first wins, in order", () => {
    const r = parse(
      P("Lead.") +
        '<figure><img src="/a.jpg"><figcaption>One</figcaption></figure><figure><img src="/b.jpg"></figure><figure><img src="/a.jpg"><figcaption>Dup</figcaption></figure>',
    );
    expect(r.photos.map((p) => [p.src, p.caption])).toEqual([
      ["https://www.purdue.edu/a.jpg", "One"],
      ["https://www.purdue.edu/b.jpg", undefined],
    ]);
    expect(r.blocks.filter((b) => b.type === "figure")).toHaveLength(3);
  });
  it("uses data-src / data-lazy-src and skips data: URIs", () => {
    const r = parse(
      P("Lead.") +
        '<figure><img src="data:image/gif;base64,AAAA" data-src="https://x.test/lazy.jpg" data-srcset="https://x.test/lazy-1.jpg 1w"></figure><figure><img data-lazy-src="https://x.test/l2.jpg"></figure><figure><img src="data:image/gif;base64,AAAA"></figure>',
    );
    expect(r.photos.map((p) => p.src)).toEqual(["https://x.test/lazy.jpg", "https://x.test/l2.jpg"]);
    expect(r.photos[0].srcSet).toBe("https://x.test/lazy-1.jpg 1w");
  });
  it("resolves relative URLs against purdue.edu", () => {
    const r = parse(P("Lead.") + '<figure><img src="/newsroom/wp-content/a.jpg" srcset="/s/a-1.jpg 1x"></figure>');
    expect(r.photos[0].src).toBe("https://www.purdue.edu/newsroom/wp-content/a.jpg");
    expect(r.photos[0].srcSet).toBe("https://www.purdue.edu/s/a-1.jpg 1x");
  });
});

describe("boilerplate stripping", () => {
  const all = (r: ReturnType<typeof parse>) =>
    [r.lead, ...r.blocks.map((b) => JSON.stringify(b))].join("\n");

  it("removes About section through following siblings until the next h2", () => {
    const r = parse(
      P("Lead.") +
        P("Keep 1.") +
        '<h2 class="wp-block-heading">About Purdue University</h2>' +
        P("Boiler 1.") + "<ul><li>Boiler list</li></ul>" + P("Boiler 2.") +
        '<h2 class="wp-block-heading">Keep heading</h2>' + P("Keep 2."),
    );
    const s = all(r);
    expect(s).not.toContain("About");
    expect(s).not.toContain("Boiler");
    expect(s).toContain("Keep 1.");
    expect(s).toContain("Keep heading");
    expect(s).toContain("Keep 2.");
  });
  it("removes sponsor paragraph", () => {
    const r = parse(P("Lead.") + P("The expedition is being supported by Foo and Bar.") + P("Keep."));
    expect(all(r)).not.toContain("supported by");
    expect(r.blocks).toHaveLength(1);
  });
  it("removes roster paragraph and following list only", () => {
    const r = parse(
      P("Lead.") + P("The Taraia Object expedition team includes:") + "\n<ul><li>Person A</li></ul>\n" + "<ul><li>Other list</li></ul>" + P("Keep."),
    );
    const s = all(r);
    expect(s).not.toContain("Person A");
    expect(s).not.toContain("team includes");
    expect(s).toContain("Other list");
  });
  it("removes quick-links, #note, attribution, scripts", () => {
    const r = parse(
      P("Lead.") +
        '<div class="purdue-home-quick-links-static"><p>Quick links</p></div>' +
        '<div id="note"><p>Media contact</p></div>' +
        '<div class="post-content__attribution"><p>Writer: Someone</p></div>' +
        "<script>var x='<p>nope</p>'</script><style>p{}</style>" + P("Keep."),
    );
    const s = all(r);
    for (const bad of ["Quick links", "Media contact", "Writer:", "nope"]) expect(s).not.toContain(bad);
    expect(r.blocks).toHaveLength(1);
  });
  it("removes Related coverage heading and its list", () => {
    const r = parse(P("Lead.") + "<h3>Related coverage</h3><ul><li>Link story</li></ul>" + P("Keep."));
    expect(all(r)).not.toContain("Link story");
    expect(all(r)).not.toContain("Related coverage");
    expect(r.blocks).toHaveLength(1);
  });
});

describe("text handling", () => {
  it("decodes entities and normalises whitespace", () => {
    const r = parse(P("Lead."), "") ;
    expect(r.lead).toBe("Lead.");
    const r2 = parse(P("Lead.") + P("Amelia Earhart&#8217;s  plane &amp; more &#8220;quoted&#8221;"));
    expect(r2.blocks[0]).toMatchObject({
      text: "Amelia Earhart’s plane & more “quoted”",
    });
  });
  it("htmlToText strips tags and decodes", () => {
    expect(htmlToText("<b>A&nbsp;&amp;  B</b>")).toBe("A & B");
    expect(htmlToText("")).toBe("");
  });
});

describe("fallback", () => {
  it("uses the excerpt when content is empty", () => {
    const r = parse("", "<p>Crew arrives &#8217;now&#8217; [&hellip;]</p>");
    expect(r).toEqual({ lead: "Crew arrives ’now’", blocks: [], photos: [], fallback: true });
  });
  it("uses the excerpt when content has no paragraphs", () => {
    const r = parse('<figure><img src="/a.jpg"></figure><h2>Only heading</h2>', "<p>Summary...</p>");
    expect(r.fallback).toBe(true);
    expect(r.lead).toBe("Summary");
    expect(r.blocks).toEqual([]);
    expect(r.photos).toEqual([]);
  });
  it("does not throw on garbage input", () => {
    expect(() => parseDispatchContent(undefined as unknown as string, undefined as unknown as string)).not.toThrow();
  });
});
