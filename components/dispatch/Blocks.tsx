import { Gallery } from "@/components/dispatch/Gallery";
import { ZoomFigure } from "@/components/dispatch/ZoomFigure";
import type { Block } from "@/lib/types";

/** Renders parsed Purdue blocks with our own components (never raw HTML). */
export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "paragraph":
            return b.isQuote ? (
              <blockquote
                key={i}
                className="my-8 border-l-4 border-amber bg-paper py-4 pr-4 pl-5 font-display text-[1.35rem] leading-[1.5] text-navy italic sm:text-[1.5rem]"
              >
                {b.text}
              </blockquote>
            ) : (
              <p key={i} className="my-5 text-[1.1rem] leading-[1.7]">
                {b.text}
              </p>
            );
          case "heading":
            return (
              <h2 key={i} className="mt-10 mb-3 text-[1.6rem] font-semibold text-navy">
                {b.text}
              </h2>
            );
          case "figure":
            return <ZoomFigure key={i} photo={b.photo} />;
          case "gallery":
            return <Gallery key={i} photos={b.photos} />;
        }
      })}
    </>
  );
}
