"use client";

import { useState } from "react";

type Props = { title: string; text?: string; path?: string; label?: string; tone?: "solid" | "outline" };

/** Opens the phone's share sheet; falls back to copying the link (SPEC §7.1). */
export function ShareButton({ title, text, path = "/", label = "Share with a friend", tone = "solid" }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");

  async function share() {
    const href = new URL(path, window.location.origin).toString();
    setUrl(href);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: href });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // she closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(href);
      setState("copied");
      setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("manual");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={share}
        className={`flex min-h-14 w-full items-center justify-center gap-3 rounded-full px-6 text-[1.1rem] font-semibold whitespace-nowrap transition-colors sm:w-auto ${
          tone === "solid"
            ? "bg-signal text-navy hover:bg-[#f07a40]"
            : "bg-transparent text-navy ring-2 ring-navy hover:bg-navy hover:text-foam"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="m7 8 5-5 5 5" />
          <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
        {label}
      </button>
      <p className="mt-2 min-h-[1.6em] text-ink-muted" aria-live="polite">
        {state === "copied" && "Link copied. Paste it into a message or email."}
      </p>
      {state === "manual" && (
        <label className="block">
          <span className="text-ink-muted">Copy this link:</span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-xl bg-paper px-4 py-3 ring-1 ring-rule"
          />
        </label>
      )}
    </div>
  );
}
