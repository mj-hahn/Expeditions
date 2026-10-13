import { DispatchTimeline } from "@/components/DispatchTimeline";
import { Footer } from "@/components/Footer";
import { LatestDispatchCard } from "@/components/LatestDispatchCard";
import { StatusHero } from "@/components/StatusHero";
import { getDispatches } from "@/lib/dispatches";
import { getStatus } from "@/lib/status";

export default async function Home() {
  const [dispatches, status] = [await getDispatches(), getStatus()];
  const latest = dispatches[0];
  return (
    <>
      <main>
        <StatusHero status={status} latest={latest} />
        {latest && <LatestDispatchCard dispatch={latest} />}
        <DispatchTimeline dispatches={dispatches} />
      </main>
      <Footer />
    </>
  );
}
