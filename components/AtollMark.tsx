/** Original mark: a compass rose over a ring-shaped atoll. Decorative. */
export function AtollMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={className} fill="none">
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 5" />
      {/* atoll ring: irregular sand outline around a lagoon */}
      <path
        d="M34 52c3-12 15-21 29-21 15 0 26 9 27 22 1 9-3 15-9 20-6 6-15 10-24 9-12-1-21-7-23-17-1-5-1-9 0-13Z"
        stroke="#D9A441"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M41 54c3-8 11-14 21-14 10 0 18 6 19 15"
        stroke="#1F7A7A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      {/* compass needle */}
      <path d="M60 8 66 60 60 112 54 60Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M60 8 66 60H54Z" fill="#E8692C" />
      <path d="M8 60 60 55v10Z" fill="currentColor" fillOpacity="0.35" />
      <path d="M112 60 60 65V55Z" fill="currentColor" fillOpacity="0.35" />
      <circle cx="60" cy="60" r="4" fill="currentColor" />
    </svg>
  );
}
