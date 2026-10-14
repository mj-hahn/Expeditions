// Share-preview images (SPEC §10). Server only: rendered by next/og (Satori).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { site } from "@/content/site";
import { VERDICT_INFO } from "@/lib/status";
import type { Photo, Verdict } from "@/lib/types";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/jpeg";

/** Satori renders PNG; photos make that ~600 KB, too big for some chat apps. Re-encode as JPEG. */
async function asJpeg(png: ImageResponse): Promise<Response> {
  const input = Buffer.from(await png.arrayBuffer());
  const jpeg = await sharp(input).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": OG_CONTENT_TYPE,
      // Let the CDN reuse the card for an hour; chat apps fetch previews in bursts.
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

const C = {
  navy: "#0B1F33",
  navy2: "#12304D",
  foam: "#EEF4F7",
  foamMuted: "#B3C6D6",
  amber: "#D9A441",
  signal: "#E8692C",
  teal: "#1F7A7A",
  sand: "#F3E9D2",
  slate: "#4A5B6C",
  ink: "#1B1B1B",
};

const PILL: Record<"sand" | "teal" | "gold" | "slate", { bg: string; fg: string }> = {
  sand: { bg: C.sand, fg: C.ink },
  teal: { bg: C.teal, fg: "#FFFFFF" },
  gold: { bg: C.amber, fg: C.navy },
  slate: { bg: C.slate, fg: "#FFFFFF" },
};

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 600 | 700; style: "normal" }[]> | undefined;
function fonts() {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Fraunces-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Inter-Bold.ttf")),
  ]).then(([fraunces, interMedium, interBold]) => [
    { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
    { name: "Inter", data: interMedium, weight: 500, style: "normal" },
    { name: "Inter", data: interBold, weight: 700, style: "normal" },
  ]);
  return fontsPromise;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 12)).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** Pick a mid-size rendition from a WordPress srcset to keep the fetch small. */
export function pickPhotoUrl(photo: Photo): string {
  const candidates = (photo.srcSet ?? "")
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w ?? "", 10) }))
    .filter((c) => c.url && Number.isFinite(c.w));
  const fit = candidates.filter((c) => c.w >= 600).sort((a, b) => a.w - b.w)[0];
  return fit?.url ?? photo.src;
}

/** Fetch a photo as a data URL. Returns null on any failure so the card still renders. */
async function photoDataUrl(photo: Photo | undefined): Promise<string | null> {
  if (!photo) return null;
  try {
    const res = await fetch(pickPhotoUrl(photo), { signal: AbortSignal.timeout(8000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(jpeg|png)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function Mark() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill={C.navy2} />
      <path
        d="M15 28c2-8 9-13 17-13 9 0 16 6 17 14 1 6-2 10-6 13-4 4-9 6-15 6-7-1-12-5-13-10-1-4-1-7 0-10Z"
        fill="none"
        stroke={C.amber}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M32 6 36 32H28Z" fill={C.signal} />
      <path d="M32 58 28 32h8Z" fill={C.foam} fillOpacity="0.35" />
      <circle cx="32" cy="32" r="3.5" fill={C.foam} />
    </svg>
  );
}

function Frame({ children, photo }: { children: React.ReactNode; photo: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: C.navy,
        backgroundImage:
          "linear-gradient(rgba(238,244,247,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(238,244,247,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        fontFamily: "Inter",
        color: C.foam,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: photo ? 760 : 1200,
          height: "100%",
          padding: "56px 60px",
        }}
      >
        {children}
      </div>
      {photo && (
        <div style={{ display: "flex", position: "relative", width: 440, height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img */}
          <img src={photo} width={440} height={630} style={{ objectFit: "cover", width: 440, height: 630 }} alt="" />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 120,
              height: 630,
              backgroundImage: `linear-gradient(90deg, ${C.navy}, rgba(11,31,51,0))`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Brand({ coords = true }: { coords?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <Mark />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 36, fontWeight: 600 }}>{site.name}</div>
        {coords && (
          <div style={{ display: "flex", fontSize: 22, color: C.foamMuted, fontWeight: 500 }}>
            Nikumaroro, Kiribati · 4°40′S 174°31′W
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ verdict }: { verdict: Verdict }) {
  const info = VERDICT_INFO[verdict];
  const tone = PILL[info.tone];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        alignSelf: "flex-start",
        backgroundColor: tone.bg,
        color: tone.fg,
        borderRadius: 999,
        padding: "12px 26px",
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: tone.fg, opacity: 0.7 }} />
      {info.label}
    </div>
  );
}

export async function renderHomeOg(opts: {
  overline: string;
  sentence: string;
  verdict: Verdict;
  latestTitle?: string;
  photo?: Photo;
}) {
  const photo = await photoDataUrl(opts.photo);
  const png = new ImageResponse(
    (
      <Frame photo={photo}>
        <Brand />
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 4, color: C.amber }}>
            {opts.overline.toUpperCase()}
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: photo ? 60 : 68, lineHeight: 1.1 }}>
            {truncate(opts.sentence, 70)}
          </div>
          <Pill verdict={opts.verdict} />
        </div>
        {opts.latestTitle ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: C.signal }}>
              LATEST DISPATCH
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: C.foamMuted, lineHeight: 1.3 }}>
              {truncate(opts.latestTitle, 90)}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
  return asJpeg(png);
}

export async function renderDispatchOg(opts: {
  kicker: string;
  title: string;
  dateline?: string;
  photo?: Photo;
}) {
  const photo = await photoDataUrl(opts.photo);
  const png = new ImageResponse(
    (
      <Frame photo={photo}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: C.amber }}>
          {opts.kicker.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: photo ? 58 : 66, lineHeight: 1.12 }}>
            {truncate(opts.title, 110)}
          </div>
          {opts.dateline && (
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 2, color: C.foamMuted }}>
              {opts.dateline.toUpperCase()}
            </div>
          )}
        </div>
        <Brand coords={false} />
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
  return asJpeg(png);
}
