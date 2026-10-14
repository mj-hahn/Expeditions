import { Crew } from "@/components/Crew";
import { DispatchTimeline } from "@/components/DispatchTimeline";
import { ExploreMore } from "@/components/ExploreMore";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import { InTheNews } from "@/components/InTheNews";
import { JourneyMap } from "@/components/JourneyMap";
import { LatestDispatchCard } from "@/components/LatestDispatchCard";
import { Mystery } from "@/components/Mystery";
import { NewsSection } from "@/components/news/NewsSection";
import { Quiz } from "@/components/Quiz";
import { RightNow } from "@/components/RightNow";
import { SearchProgress } from "@/components/SearchProgress";
import { SkepticsCorner } from "@/components/SkepticsCorner";
import { StatusHero } from "@/components/StatusHero";
import { StayInTheLoop } from "@/components/StayInTheLoop";
import { getConditions } from "@/lib/conditions";
import { dispatchPins } from "@/lib/dateline-place";
import { getDispatches } from "@/lib/dispatches";
import { getNews, getVideos } from "@/lib/news";
import { getStatus } from "@/lib/status";

export default async function Home() {
  const [dispatches, conditions, news, videos] = await Promise.all([
    getDispatches(),
    getConditions(),
    getNews(),
    getVideos(),
  ]);
  const status = getStatus();
  const latest = dispatches[0];
  return (
    <>
      <main>
        <StatusHero status={status} latest={latest} recent={dispatches.slice(0, 10)} news={news} />
        <HowItWorks />
        {latest && <LatestDispatchCard dispatch={latest} />}
        <NewsSection news={news} videos={videos} />
        <RightNow conditions={conditions} />
        <SearchProgress status={status} tide={conditions.marine?.tide ?? null} />
        <JourneyMap phase={status.phase} pins={dispatchPins(dispatches)} />
        <DispatchTimeline dispatches={dispatches} />
        <ExploreMore dispatches={dispatches} />
        <Mystery />
        <SkepticsCorner />
        <Crew />
        <Quiz />
        <InTheNews />
        <StayInTheLoop />
      </main>
      <Footer />
    </>
  );
}
