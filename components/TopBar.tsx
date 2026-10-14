import Link from "next/link";
import { site } from "@/content/site";

/** Navy header with a big "back to home" link; `label` shows at the right. */
export function TopBar({ label }: { label: string }) {
  return (
    <header className="bg-navy text-foam">
      <div className="mx-auto flex max-w-[720px] items-center justify-between gap-4 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-8">
        <Link
          href="/"
          className="-ml-2 flex min-h-12 items-center gap-2 rounded-full px-2 text-[1.05rem] font-semibold hover:underline"
        >
          <span aria-hidden="true">←</span> {site.name}
        </Link>
        <span className="flex items-center gap-2 font-mono text-[1rem] text-foam-muted">{label}</span>
      </div>
    </header>
  );
}
