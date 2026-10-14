"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Phase } from "@/lib/types";

// d3 + map data load only when the globe scrolls into view (SPEC §9 performance).
const JourneyGlobe = dynamic(() => import("@/components/globe/JourneyGlobe"), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

function GlobePlaceholder() {
  return (
    <div className="mx-auto aspect-square w-full max-w-[600px] rounded-full bg-navy-3/40 ring-1 ring-foam/10" aria-hidden="true" />
  );
}

export function GlobeLoader({ phase }: { phase: Phase }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref}>{show ? <JourneyGlobe phase={phase} /> : <GlobePlaceholder />}</div>;
}
