import { formatDispatchTimes } from "@/lib/time";

/** "Tue, Oct 13 · 10:16 a.m. your time" plus muted island time (SPEC §5). Server-rendered. */
export function DispatchTimes({ date, tone = "light" }: { date: Date; tone?: "light" | "dark" }) {
  const t = formatDispatchTimes(date);
  return (
    <p className={tone === "dark" ? "text-foam" : "text-ink"}>
      <time dateTime={date.toISOString()} className="font-semibold">
        {t.home} your time
      </time>{" "}
      <span className={tone === "dark" ? "text-foam-muted" : "text-ink-muted"}>
        ({t.island} on Nikumaroro)
      </span>
    </p>
  );
}
