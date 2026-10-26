import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ACEO memberships | Moonafique",
  description:
    "Collect tiny artworks each month. Two physical ACEO prints for $10 or one original ACEO for $20 per month, plus shipping.",
};

export default async function ACEOsPage() {
  return <OfferView {...await publicOfferProps()} club="aceo" />;
}
