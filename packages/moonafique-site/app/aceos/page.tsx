import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ACEO memberships | Moonafique",
  description:
    "Collect original art on a smaller scale. Choose two physical ACEO prints for $10 a month or one original artwork for $20, plus shipping.",
};

export default async function ACEOsPage() {
  return <OfferView {...await publicOfferProps("aceo")} club="aceo" />;
}
