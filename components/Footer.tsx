import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="bg-navy text-foam">
      <div className="mx-auto max-w-[720px] px-5 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-8">
        <p className="font-display text-[1.35rem] font-semibold">{site.name}</p>
        <p className="mt-3 text-foam-muted">{site.disclaimer}</p>
        <ul className="mt-6 space-y-2">
          <li>
            Dispatches:{" "}
            <a href={site.purdueNewsUrl} className="font-semibold text-amber underline" target="_blank" rel="noopener noreferrer">
              Purdue University News
            </a>
          </li>
          <li className="text-foam-muted">Photo captions and credits are shown as published.</li>
        </ul>
      </div>
    </footer>
  );
}
