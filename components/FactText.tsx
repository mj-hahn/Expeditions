import { FACTS, type FactId } from "@/content/facts";

/** One Fact Bank entry with its source links (SPEC §11: each fact linked to its source). */
export function FactText({ id, className = "", tone = "light" }: { id: FactId; className?: string; tone?: "light" | "dark" }) {
  const fact = FACTS[id];
  const muted = tone === "dark" ? "text-foam-muted" : "text-ink-muted";
  const link = tone === "dark" ? "text-amber" : "text-teal-ink";
  return (
    <p className={className}>
      {fact.text}
      {fact.sources.length > 0 && (
        <span className={`block ${muted}`}>
          {fact.sources.map((s, i) => (
            <span key={s.url + i}>
              {i === 0 ? "Source: " : " · "}
              <a href={s.url} target="_blank" rel="noopener noreferrer" className={`underline ${link}`}>
                {s.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </span>
          ))}
        </span>
      )}
    </p>
  );
}
