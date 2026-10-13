import Link from "next/link";

export default function NotFound() {
  return (
    <main className="chart-grid flex min-h-dvh items-center text-foam">
      <div className="mx-auto max-w-[720px] px-5 sm:px-8">
        <p className="font-mono text-[1rem] tracking-[0.14em] text-amber uppercase">Off the chart</p>
        <h1 className="mt-2 text-[2.2rem] font-semibold">We couldn&apos;t find that page.</h1>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-14 items-center rounded-full bg-signal px-6 text-[1.1rem] font-semibold text-navy"
        >
          Back to the latest news
        </Link>
      </div>
    </main>
  );
}
