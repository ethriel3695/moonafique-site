import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Grimmunity | Moonafique",
  description:
    "Collect a new Grimm each month: mystery characters with Starter or exclusive painted finishes with Keeper. Memberships from $15, plus shipping.",
};
export default async function GrimmunityPage() {
  return <OfferView {...await publicOfferProps("grimm")} club="grimm" />;
}
