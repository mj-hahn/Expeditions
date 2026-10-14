import { cacheLife, cacheTag } from "next/cache";
import { site } from "@/content/site";
import { getDispatches } from "@/lib/dispatches";
import { OG_SIZE, renderHomeOg } from "@/lib/og";
import { getStatus, statusParts } from "@/lib/status";
import { islandDayNumber } from "@/lib/time";

export const alt = `${site.name}: following the 2026 search for Amelia Earhart's Electra`;
export const size = OG_SIZE;
export const contentType = "image/jpeg";

async function homeCard() {
  "use cache";
  // Re-render hourly so the "Day N" overline follows the island calendar.
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("dispatches");
  const [dispatches, status] = [await getDispatches(), getStatus()];
  const latest = dispatches[0];
  const { overline, sentence } = statusParts(status, islandDayNumber(new Date()));
  return { overline, sentence, verdict: status.verdict, latestTitle: latest?.title, photo: latest?.hero ?? latest?.photos[0] };
}

export default async function Image() {
  return renderHomeOg(await homeCard());
}
