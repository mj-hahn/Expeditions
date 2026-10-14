"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { usePlatform, type Platform } from "@/lib/use-platform";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Chrome on Android may fire this before React mounts, so catch it at module load.
let deferred: InstallEvent | null = null;
const waiting = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    waiting.forEach((fn) => fn());
  });
}

function ShareIcon() {
  return (
    <svg aria-label="Share" role="img" viewBox="0 0 24 24" className="inline size-6 -translate-y-0.5 text-[#0a7aff]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy font-mono font-semibold text-foam">
            {i + 1}
          </span>
          <span className="pt-1">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function AddToHomeScreen() {
  const info = usePlatform();
  const [choice, setChoice] = useState<Platform | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const update = () => setCanPrompt(deferred !== null);
    waiting.add(update);
    update();
    return () => {
      waiting.delete(update);
    };
  }, []);

  if (info?.installed) {
    return (
      <p className="paper rounded-[var(--radius-card)] p-5 ring-1 ring-rule">
        You&apos;re using {site.name} from your home screen. It will show the latest news each time you open it.
      </p>
    );
  }

  const tab: Platform = choice ?? (info?.platform === "android" ? "android" : "ios");

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    deferred = null;
    setCanPrompt(false);
  };

  return (
    <div className="paper rounded-[var(--radius-card)] p-5 ring-1 ring-rule sm:p-6">
      <h3 className="text-[1.4rem] font-semibold text-navy">Put it on your home screen</h3>
      <p className="mt-2">Then it opens like an app, with one tap.</p>

      <div role="group" aria-label="Choose your phone" className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-sand-2 p-1.5">
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={tab === p}
            onClick={() => setChoice(p)}
            className={`min-h-12 rounded-full text-[1.05rem] font-semibold transition-colors ${
              tab === p ? "bg-navy text-foam" : "text-ink hover:bg-paper"
            }`}
          >
            {p === "ios" ? "iPhone" : "Android"}
          </button>
        ))}
      </div>

      {tab === "ios" ? (
        <Steps
          items={[
            info?.iosBrowser === "other" ? (
              <>
                Tap the <ShareIcon /> Share button. In Chrome it&apos;s at the top right, next to the address.
              </>
            ) : (
              <>
                Tap the <ShareIcon /> Share button at the bottom of Safari.
              </>
            ),
            <>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </>,
            <>
              Tap <strong>Add</strong>. Look for the compass icon on your home screen.
            </>,
          ]}
        />
      ) : canPrompt ? (
        <button
          type="button"
          onClick={install}
          className="mt-5 flex min-h-14 w-full items-center justify-center rounded-full bg-signal px-6 text-[1.1rem] font-semibold text-navy"
        >
          Add {site.name} to my home screen
        </button>
      ) : (
        <Steps
          items={[
            <>
              Tap the <strong aria-label="menu">⋮</strong> menu at the top right of Chrome.
            </>,
            <>
              Tap <strong>Add to Home screen</strong> (it may say <strong>Install app</strong>).
            </>,
            <>
              Tap <strong>Add</strong>. Look for the compass icon on your home screen.
            </>,
          ]}
        />
      )}
    </div>
  );
}
