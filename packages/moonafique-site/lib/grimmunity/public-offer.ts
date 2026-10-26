import { publicOffer } from "./queries";

export async function publicOfferProps() {
  const { program, editions, availability } = await publicOffer();
  const now = new Date();
  // Both collection pages require the deployment-level live billing approval.
  const displayedProgram =
    program?.id === "live" && process.env.GRIM_LIVE_ENROLLMENT !== "approved"
      ? { ...program, enabled: false }
      : program;
  return {
    program: displayedProgram,
    availability,
    interestEnabled: process.env.GRIM_INTEREST_ENABLED === "true",
    edition: editions.find(
      (edition) =>
        edition.enrollment_open <= now && edition.enrollment_close > now,
    ),
    nextEdition: editions.find((edition) => edition.enrollment_open > now),
  };
}
