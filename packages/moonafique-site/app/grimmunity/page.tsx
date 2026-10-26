import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Grimmunity | Moonafique",
  description:
    "Monthly mystery and custom Grimm subscriptions. Choose Grimm Starter for $15 or Grimm Keeper for $30 per month, plus shipping.",
};
export default async function GrimmunityPage() {
  return <OfferView {...await publicOfferProps()} club="grimm" />;
}
