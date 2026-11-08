import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";
import { getLiveSchedule } from "@/lib/live-shows-server";
import { LiveShowsProvider } from "@/components/live-shows-provider";
import { ShowcaseInventoryProvider } from "@/components/grimmunity/showcase-inventory";
import { getShowcaseInventory } from "@/lib/grimmunity/showcase-inventory-server";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Grimmunity | Moonafique",
  description:
    "Collect a new Grimm each month: mystery characters with The Grimm Path or exclusive painted finishes with Grimmoire Collection. Memberships from $15, plus shipping.",
};
export default async function GrimmunityPage() {
  const [offer, schedule, inventory] = await Promise.all([publicOfferProps("grimm"), getLiveSchedule(), getShowcaseInventory()]);
  return <LiveShowsProvider initialSchedule={schedule}><ShowcaseInventoryProvider initialInventory={inventory} initialNow={new Date().getTime()}><OfferView {...offer} club="grimm" /></ShowcaseInventoryProvider></LiveShowsProvider>;
}
