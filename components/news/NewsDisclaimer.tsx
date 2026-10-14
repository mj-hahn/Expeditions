/** Shown above every list of outside headlines (the verdict only ever comes from status.json). */
export function NewsDisclaimer() {
  return (
    <p className="mb-5 flex gap-3 rounded-[var(--radius-card)] bg-sand-2/70 p-4">
      <span aria-hidden="true" className="text-[1.3rem] leading-none">ⓘ</span>
      <span>
        Headlines from other news outlets, collected automatically and <strong>not checked by us</strong>. The official word
        comes from Purdue&apos;s dispatches.
      </span>
    </p>
  );
}
