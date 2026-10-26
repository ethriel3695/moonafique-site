import { OfferView } from "@/components/grimmunity/views";
import { publicOfferProps } from "@/lib/grimmunity/public-offer";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Grimmunity | Moonafique",
  description:
    "Meet your next little obsession. Unbox a mystery Grimm with Starter or collect an exclusive painted Keeper. Monthly magic from $15, plus shipping.",
};
export default async function GrimmunityPage() {
  return <OfferView {...await publicOfferProps()} club="grimm" />;
}
