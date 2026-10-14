// Renders the original atoll + compass mark into PWA / Apple touch icons.
// Usage: node scripts/make-icons.mjs
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const mark = (scale) => {
  // 64x64 design scaled around the centre; the background is always full-bleed navy.
  const t = (64 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0B1F33"/>
  <g transform="translate(${t} ${t}) scale(${scale})">
    <path d="M15 28c2-8 9-13 17-13 9 0 16 6 17 14 1 6-2 10-6 13-4 4-9 6-15 6-7-1-12-5-13-10-1-4-1-7 0-10Z" fill="none" stroke="#D9A441" stroke-width="5" stroke-linejoin="round"/>
    <path d="M32 6 36 32H28Z" fill="#E8692C"/>
    <path d="M32 58 28 32h8Z" fill="#EEF4F7" fill-opacity="0.35"/>
    <circle cx="32" cy="32" r="3.5" fill="#EEF4F7"/>
  </g>
</svg>`;
};

const out = [
  { file: "public/icons/icon-192.png", size: 192, scale: 0.9 },
  { file: "public/icons/icon-512.png", size: 512, scale: 0.9 },
  // Maskable icons must keep content inside the central 80% safe zone.
  { file: "public/icons/maskable-512.png", size: 512, scale: 0.7 },
  { file: "app/apple-icon.png", size: 180, scale: 0.82 },
];

await mkdir("public/icons", { recursive: true });
for (const { file, size, scale } of out) {
  await sharp(Buffer.from(mark(scale)), { density: 300 }).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
