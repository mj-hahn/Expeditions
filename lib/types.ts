// Shared domain types (SPEC §4.2, §6).

export type Photo = {
  src: string;
  srcSet?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export type Block =
  | { type: "paragraph"; text: string; isQuote: boolean }
  | { type: "heading"; text: string }
  | { type: "figure"; photo: Photo }
  | { type: "gallery"; photos: Photo[] };

export type DispatchKind = "dispatch" | "background";

export type Dispatch = {
  id: number;
  slug: string;
  url: string;
  publishedAt: Date;
  updatedAt: Date;
  kind: DispatchKind;
  title: string;
  /** e.g. "NIKUMARORO, Kiribati": text before the em dash in the first paragraph */
  dateline?: string;
  /** First paragraph with the dateline removed */
  lead: string;
  blocks: Block[];
  /** All images (figures + carousel slides), de-duplicated by src */
  photos: Photo[];
  /** Featured media */
  hero?: Photo;
  /** True when body parsing failed and we fell back to the excerpt */
  fallback?: boolean;
};

/** Subset of the WordPress REST post shape we read (SPEC §4.1). */
export type WpPost = {
  id: number;
  slug: string;
  link: string;
  date_gmt: string;
  modified_gmt: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string;
      alt_text?: string;
      caption?: { rendered?: string };
      media_details?: {
        width?: number;
        height?: number;
        sizes?: Record<
          string,
          { source_url: string; width: number; height: number }
        >;
      };
    }>;
  };
};

export const PHASES = [
  "departed",
  "tarawa",
  "at_sea",
  "arrived",
  "base_camp",
  "surface_survey",
  "magnetometer",
  "sonar",
  "hydroprobe",
  "dredge",
  "verdict",
  "return",
] as const;
export type Phase = (typeof PHASES)[number];

export const VERDICTS = [
  "investigating",
  "promising",
  "confirmed_electra",
  "not_electra",
  "inconclusive",
] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Status = {
  phase: Phase;
  verdict: Verdict;
  headline: string | null;
  /** Required for confirmed_electra / not_electra; should link the dispatch that said so */
  note: string | null;
  /** Optional URL of the dispatch backing the note */
  noteUrl?: string | null;
  updatedAt: string;
};
