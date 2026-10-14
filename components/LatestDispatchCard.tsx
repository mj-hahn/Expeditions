import Link from "next/link";
import { DispatchTimes } from "@/components/DispatchTimes";
import { NewBadge } from "@/components/NewBadge";
import { SectionHeading } from "@/components/SectionHeading";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import type { Dispatch } from "@/lib/types";

export function LatestDispatchCard({ dispatch }: { dispatch: Dispatch }) {
  const photo = dispatch.hero ?? dispatch.photos[0];
  return (
    <section aria-labelledby="latest-heading" className="mx-auto max-w-[720px] px-5 pt-12 pb-4 sm:px-8">
      <SectionHeading kicker="Latest dispatch" title="Word from the island" id="latest-heading" />
      <article className="paper overflow-hidden rounded-[var(--radius-card)] shadow-[0_1px_0_var(--color-rule),0_12px_30px_-18px_rgb(11_31_51/0.45)] ring-1 ring-rule">
        {photo && (
          <ZoomablePhoto
            photo={photo}
            more={dispatch.photos}
            eager
            sizes="(min-width: 760px) 720px, 100vw"
            className="aspect-[3/2]"
          />
        )}
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <NewBadge iso={dispatch.publishedAt.toISOString()} />
            {dispatch.dateline && (
              <p className="font-mono text-[1rem] font-semibold tracking-wider text-teal-ink uppercase">
                {dispatch.dateline}
              </p>
            )}
          </div>
          <h3 className="mt-3 text-[1.65rem] font-semibold text-navy sm:text-[2rem]">
            <Link href={`/dispatch/${dispatch.slug}`} className="hover:underline" prefetch>
              {dispatch.title}
            </Link>
          </h3>
          <div className="mt-3 text-[1rem]">
            <DispatchTimes date={dispatch.publishedAt} />
          </div>
          <p className="mt-4 text-[1.1rem] leading-[1.65]">{dispatch.lead}</p>
          <Link
            href={`/dispatch/${dispatch.slug}`}
            prefetch
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full whitespace-nowrap bg-signal px-6 text-[1.1rem] font-semibold text-navy transition-colors hover:bg-[#f07a40] sm:w-auto sm:inline-flex"
          >
            Read the full dispatch <span aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
    </section>
  );
}
