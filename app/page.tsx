import { Crew } from "@/components/Crew";
import { DispatchTimeline } from "@/components/DispatchTimeline";
import { Footer } from "@/components/Footer";
import { InTheNews } from "@/components/InTheNews";
import { LatestDispatchCard } from "@/components/LatestDispatchCard";
import { Mystery } from "@/components/Mystery";
import { RightNow } from "@/components/RightNow";
import { SearchProgress } from "@/components/SearchProgress";
import { SkepticsCorner } from "@/components/SkepticsCorner";
import { StatusHero } from "@/components/StatusHero";
import { StayInTheLoop } from "@/components/StayInTheLoop";
import { getConditions } from "@/lib/conditions";
import { getDispatches } from "@/lib/dispatches";
import { getStatus } from "@/lib/status";

export default async function Home() {
  const [dispatches, conditions] = await Promise.all([getDispatches(), getConditions()]);
  const status = getStatus();
  const latest = dispatches[0];
  return (
    <>
      <main>
        <StatusHero status={status} latest={latest} />
        {latest && <LatestDispatchCard dispatch={latest} />}
        <RightNow conditions={conditions} />
        <SearchProgress status={status} tide={conditions.marine?.tide ?? null} />
        <DispatchTimeline dispatches={dispatches} />
        <Mystery />
        <SkepticsCorner />
        <Crew />
        <InTheNews />
        <StayInTheLoop />
      </main>
      <Footer />
    </>
  );
}
