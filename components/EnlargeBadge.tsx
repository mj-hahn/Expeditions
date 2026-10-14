/** Small "Enlarge" pill shown on photos that open full screen when tapped. */
export function EnlargeBadge() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-navy/85 px-3 py-1 text-[1rem] font-semibold text-foam"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
      Enlarge
    </span>
  );
}
