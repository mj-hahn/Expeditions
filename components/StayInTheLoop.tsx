import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { SectionHeading } from "@/components/SectionHeading";
import { ShareButton } from "@/components/ShareButton";
import { site } from "@/content/site";

export function StayInTheLoop() {
  return (
    <section aria-labelledby="loop-heading" className="bg-sand-2/60">
      <div className="mx-auto max-w-[720px] px-5 py-14 sm:px-8">
        <SectionHeading kicker="Stay in the loop" title="Keep it close" id="loop-heading" />
        <AddToHomeScreen />
        <div className="mt-8">
          <h3 className="text-[1.4rem] font-semibold text-navy">Share it with a friend</h3>
          <p className="mt-2 mb-5">Send the link to anyone following the search.</p>
          <ShareButton title={site.name} text={site.tagline} />
        </div>
        <p className="mt-6 text-ink-muted">
          New dispatches appear here within about 10 minutes of Purdue publishing them.
        </p>
      </div>
    </section>
  );
}
