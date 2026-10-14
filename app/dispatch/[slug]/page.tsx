import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Blocks } from "@/components/dispatch/Blocks";
import { ZoomFigure } from "@/components/dispatch/ZoomFigure";
import { DispatchTimes } from "@/components/DispatchTimes";
import { Footer } from "@/components/Footer";
import { ShareButton } from "@/components/ShareButton";
import { site } from "@/content/site";
import { getDispatchBySlug, getDispatches } from "@/lib/dispatches";
import { shortTitle } from "@/lib/purdue";
import type { Dispatch } from "@/lib/types";

// Cache Components needs at least one param at build time. If Purdue is
// unreachable during the build, this placeholder renders a 404 and real
// slugs are still generated on demand.
const PLACEHOLDER = "_none";

export async function generateStaticParams() {
  const all = await getDispatches();
  return all.length ? all.map((d) => ({ slug: d.slug })) : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: PageProps<"/dispatch/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getDispatchBySlug(slug);
  if (!found) return { title: "Dispatch not found" };
  const d = found.dispatch;
  return {
    title: shortTitle(d.title),
    description: d.lead.slice(0, 200),
    openGraph: { title: d.title, description: d.lead.slice(0, 200), type: "article" },
    twitter: { card: "summary_large_image", title: d.title },
  };
}

function TopBar() {
  return (
    <header className="bg-navy text-foam">
      <div className="mx-auto flex max-w-[720px] items-center justify-between gap-4 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-8">
        <Link
          href="/"
          className="-ml-2 flex min-h-12 items-center gap-2 rounded-full px-2 text-[1.05rem] font-semibold hover:underline"
        >
          <span aria-hidden="true">←</span> {site.name}
        </Link>
        <span className="flex items-center gap-2 font-mono text-[1rem] text-foam-muted">Dispatch</span>
      </div>
    </header>
  );
}

function SourceLine({ d }: { d: Dispatch }) {
  return (
    <p className="rounded-[var(--radius-card)] bg-sand-2/70 px-4 py-3 text-[1rem]">
      Source: Purdue University News ·{" "}
      <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-ink underline">
        Read the original
      </a>
    </p>
  );
}

function PrevNext({ newer, older }: { newer?: Dispatch; older?: Dispatch }) {
  if (!newer && !older) return null;
  const card = (d: Dispatch, label: string, align: "left" | "right") => (
    <Link
      href={`/dispatch/${d.slug}`}
      prefetch
      className={`paper flex min-h-24 flex-col justify-center rounded-[var(--radius-card)] p-4 ring-1 ring-rule hover:ring-teal ${
        align === "right" ? "sm:text-right" : ""
      }`}
    >
      <span className="font-mono text-[1rem] font-semibold tracking-wider text-signal-ink uppercase">{label}</span>
      <span className="mt-1 font-display text-[1.15rem] font-semibold text-navy">{shortTitle(d.title)}</span>
    </Link>
  );
  return (
    <nav aria-label="More dispatches" className="mt-14 grid gap-3 sm:grid-cols-2">
      {older ? card(older, "← Previous dispatch", "left") : <span className="hidden sm:block" />}
      {newer && card(newer, "Next dispatch →", "right")}
    </nav>
  );
}

async function DispatchArticle({ params }: { params: PageProps<"/dispatch/[slug]">["params"] }) {
  const { slug } = await params;
  const found = await getDispatchBySlug(slug);
  if (!found) notFound();
  const { dispatch: d, newer, older } = found;
  const hero = d.hero ?? d.photos[0];
  // Don't show the same photo twice when the featured image also opens the body.
  const blocks =
    hero && d.blocks[0]?.type === "figure" && d.blocks[0].photo.src === hero.src ? d.blocks.slice(1) : d.blocks;

  return (
    <article className="mx-auto max-w-[720px] px-5 pt-6 pb-16 sm:px-8">
      <SourceLine d={d} />
      <p className="mt-8 font-mono text-[1rem] font-semibold tracking-[0.14em] text-signal-ink uppercase">
        {d.kind === "dispatch" ? "Expedition dispatch" : "Background"}
      </p>
      <h1 className="mt-2 text-[2rem] font-semibold text-navy sm:text-[2.6rem]">{d.title}</h1>
      <div className="mt-4 text-[1rem]">
        <DispatchTimes date={d.publishedAt} />
      </div>

      {hero && <ZoomFigure photo={hero} eager />}

      <p className="my-6 text-[1.25rem] leading-[1.65]">
        {d.dateline && (
          <span className="font-mono text-[1rem] font-semibold tracking-wider text-teal-ink uppercase">
            {d.dateline} —{" "}
          </span>
        )}
        {d.lead}
      </p>

      {d.fallback ? (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-14 items-center justify-center rounded-full bg-signal px-6 text-[1.1rem] font-semibold text-navy"
        >
          Read on Purdue News <span aria-hidden="true">&nbsp;→</span>
        </a>
      ) : (
        <Blocks blocks={blocks} />
      )}

      <div className="mt-10">
        <ShareButton title={d.title} path={`/dispatch/${d.slug}`} label="Share this dispatch" tone="outline" />
      </div>
      <div className="mt-6">
        <SourceLine d={d} />
      </div>
      <PrevNext newer={newer} older={older} />
    </article>
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-[720px] animate-pulse px-5 pt-6 pb-16 sm:px-8" aria-busy="true" aria-label="Loading dispatch">
      <div className="h-12 rounded-[var(--radius-card)] bg-sand-2" />
      <div className="mt-8 h-24 rounded-xl bg-sand-2" />
      <div className="mt-6 aspect-[3/2] rounded-[var(--radius-card)] bg-sand-2" />
    </div>
  );
}

export default function DispatchPage({ params }: PageProps<"/dispatch/[slug]">) {
  return (
    <>
      <TopBar />
      <main>
        <Suspense fallback={<ArticleSkeleton />}>
          <DispatchArticle params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
