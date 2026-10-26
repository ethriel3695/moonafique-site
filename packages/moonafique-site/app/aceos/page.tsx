import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ACEO memberships | Moonafique",
  description:
    "Make room for happy mail. Collect two ACEO prints for $10 a month or a new original artwork for $20. Find your next tiny treasure, plus shipping.",
};

export default async function ACEOsPage() {
  return <OfferView {...await publicOfferProps()} club="aceo" />;
}
