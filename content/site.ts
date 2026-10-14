// Site-wide settings. Change the name here and it changes everywhere.

const NAME = "Luisa’s Lookout";

export const site = {
  name: NAME,
  /** Home-screen label; keep it short enough to fit under an app icon. */
  shortName: NAME,
  tagline: "Following the 2026 search for Amelia Earhart's Electra on Nikumaroro",
  dedication: "Made for one very dedicated Earhart follower.",
  /** Keep true: this is a personal site shared by link, not found in search. */
  noindex: true,
  /** Her timezone (SPEC §5). */
  homeTimeZone: "America/Toronto",
  homeLabel: "Your time",
  islandLabel: "Nikumaroro",
  /** Day 1 on the island, island calendar date (SPEC §5). */
  islandDay1: "2026-10-13",
  /** Rough length of fieldwork in days. */
  fieldDays: 5,
  disclaimer:
    `${NAME} is an unofficial fan tracker made for one very dedicated Earhart follower. It is not affiliated with Purdue University, the Purdue Research Foundation or the Archaeological Legacy Institute. Dispatches and photos belong to their owners and are shown with links to the originals.`,
  purdueNewsUrl: "https://www.purdue.edu/newsroom/",
  openMeteoUrl: "https://open-meteo.com/",
} as const;

/** Absolute base URL. Falls back to Vercel's production domain, then localhost. */
export function siteUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}
