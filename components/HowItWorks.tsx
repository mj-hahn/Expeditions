/** A short "how to use this page" note for first-time visitors. Plain UI guidance, not editorial facts. */
export function HowItWorks() {
  const items = [
    {
      icon: "↓",
      title: "Keep scrolling for more.",
      body: "Below the latest dispatch: headlines and videos from around the web, the weather on the island right now, how far the search has got, a map of the journey, every dispatch so far, and the story behind the search.",
    },
    {
      icon: "↻",
      title: "It updates by itself.",
      body: "New dispatches from Purdue appear here within about 10 minutes, and the island weather every half hour. Just open the page again to see the latest.",
    },
    {
      icon: "→",
      title: "Tap any dispatch to read it all,",
      body: "with every photo. Tap a photo to see it bigger.",
    },
  ];
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-[720px] px-5 pt-8 sm:px-8">
      <div className="paper rounded-[var(--radius-card)] p-5 ring-1 ring-rule sm:p-6">
        <h2 id="how-heading" className="text-[1.35rem] font-semibold text-navy">
          How this page works
        </h2>
        <ul className="mt-4 space-y-4">
          {items.map((it) => (
            <li key={it.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-[1.2rem] text-foam"
              >
                {it.icon}
              </span>
              <p>
                <strong className="text-navy">{it.title}</strong> {it.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
