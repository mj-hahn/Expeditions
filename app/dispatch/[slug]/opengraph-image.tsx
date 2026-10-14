import { getDispatchBySlug, getDispatches } from "@/lib/dispatches";
import { OG_SIZE, renderDispatchOg } from "@/lib/og";
import { formatShortDate } from "@/lib/time";

export const alt = "Expedition dispatch";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export async function generateStaticParams() {
  const all = await getDispatches();
  return all.length ? all.map((d) => ({ slug: d.slug })) : [{ slug: "_none" }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getDispatchBySlug(slug);
  if (!found) {
    return renderDispatchOg({ kicker: "Expedition dispatch", title: "Following the search for Amelia Earhart's Electra" });
  }
  const d = found.dispatch;
  return renderDispatchOg({
    kicker: `${d.kind === "dispatch" ? "Expedition dispatch" : "Background"} · ${formatShortDate(d.publishedAt)}`,
    title: d.title,
    dateline: d.dateline,
    photo: d.hero ?? d.photos[0],
  });
}
