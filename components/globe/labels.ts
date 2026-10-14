// Text boxes already on the globe this frame, so later labels can step aside instead of overprinting.
// Priority is call order: claim the labels that matter most first.
export type Anchor = "start" | "middle" | "end";
export type Box = { x0: number; x1: number; y0: number; y1: number };

export const LABEL_H = 20;
export const CHAR_W = 10.5; // rough advance of a 17px label, enough for collision checks

export function labelBox(x: number, y: number, label: string, anchor: Anchor): Box {
  const w = label.length * CHAR_W;
  const x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
  return { x0, x1: x0 + w, y0: y - LABEL_H + 4, y1: y + 4 };
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function createLabeler() {
  const boxes: Box[] = [];
  return {
    /** True if the label fits. `force` always claims (and shows) it, still reserving its space for later labels. */
    claim(x: number, y: number, label: string, anchor: Anchor, force = false) {
      const box = labelBox(x, y, label, anchor);
      if (!force && boxes.some((o) => overlaps(box, o))) return false;
      boxes.push(box);
      return true;
    },
    /** Reserve space for something that isn't text, such as a pin. */
    reserve(box: Box) {
      boxes.push(box);
    },
  };
}
export type Labeler = ReturnType<typeof createLabeler>;
