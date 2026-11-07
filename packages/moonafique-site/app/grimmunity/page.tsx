import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";
import { getLiveSchedule } from "@/lib/live-shows-server";
import { LiveShowsProvider } from "@/components/live-shows-provider";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Grimmunity | Moonafique",
  description:
    "Collect a new Grimm each month: mystery characters with Starter or exclusive painted finishes with Keeper. Memberships from $15, plus shipping.",
};
export default async function GrimmunityPage() {
  const [offer, schedule] = await Promise.all([publicOfferProps("grimm"), getLiveSchedule()]);
  return <LiveShowsProvider initialSchedule={schedule}><OfferView {...offer} club="grimm" /></LiveShowsProvider>;
}
