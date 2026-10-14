import { prefersReducedMotion } from "./geo";

const TOP_GAP = 12;

/** If the globe's top is above the viewport or its centre is off-screen, scroll so its top sits just below the top edge. */
export function revealGlobe(svg: Element | null) {
  if (!svg) return;
  const r = svg.getBoundingClientRect();
  const centre = r.top + r.height / 2;
  if (r.top >= 0 && centre >= 0 && centre <= window.innerHeight) return;
  window.scrollTo({ top: window.scrollY + r.top - TOP_GAP, behavior: prefersReducedMotion() ? "instant" : "smooth" });
}

/** Scroll a chip row sideways (never the page) so the chip is fully in view. */
export function revealChip(row: HTMLElement | null, chip: HTMLElement | null) {
  if (!row || !chip) return;
  const rr = row.getBoundingClientRect();
  const cr = chip.getBoundingClientRect();
  if (cr.left >= rr.left && cr.right <= rr.right) return;
  const left = row.scrollLeft + (cr.left - rr.left) - (rr.width - cr.width) / 2;
  row.scrollTo({ left, behavior: prefersReducedMotion() ? "instant" : "smooth" });
}
