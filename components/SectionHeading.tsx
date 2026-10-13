/** Logbook-style section header: a mono "log entry" kicker over a serif title. */
export function SectionHeading({
  kicker,
  title,
  id,
  tone = "light",
}: {
  kicker: string;
  title: string;
  id?: string;
  tone?: "light" | "dark";
}) {
  return (
    <header className="mb-6">
      <p
        className={`flex items-center gap-3 font-mono text-[1rem] font-semibold tracking-[0.14em] uppercase ${
          tone === "dark" ? "text-amber" : "text-signal-ink"
        }`}
      >
        <span aria-hidden="true" className="h-px w-8 bg-current" />
        {kicker}
      </p>
      <h2
        id={id}
        className={`mt-2 text-[1.9rem] font-semibold sm:text-[2.3rem] ${tone === "dark" ? "text-foam" : "text-navy"}`}
      >
        {title}
      </h2>
    </header>
  );
}
