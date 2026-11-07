import { withAuth } from "@workos-inc/authkit-nextjs";
import { database, one } from "./db";
import { publicOffer } from "./queries";
import type { ClubId } from "./tiers";

export async function publicOfferProps(club: ClubId) {
  const { program, editions, availability, availabilityEditionId } =
    await publicOffer();
  const now = new Date();
  // Both collection pages require the deployment-level live billing approval.
  const displayedProgram =
    program?.id === "live" && process.env.GRIM_LIVE_ENROLLMENT !== "approved"
      ? { ...program, enabled: false }
      : program;
  let existingMembershipName: string | undefined;
  let signedIn = false;
  if (displayedProgram?.enabled) {
    try {
      const { user } = await withAuth();
      signedIn = !!user;
      if (user) {
        const membership = await one<{ name: string }>(
          database(),
          `SELECT tier_snapshot->>'name' AS name FROM grim.memberships
           WHERE program_id=$1 AND owner_id=$2 AND club=$3
             AND (subscription_id IS NOT NULL OR seat_held)`,
          [displayedProgram.id, user.id, club],
        );
        existingMembershipName = membership?.name;
      }
    } catch {
      // The offer still loads if this lookup fails. Checkout enforces the limit.
    }
  }
  return {
    program: displayedProgram,
    existingMembershipName,
    signedIn,
    availability,
    availabilityEditionId,
    interestEnabled: process.env.GRIM_INTEREST_ENABLED === "true",
    edition: editions.find(
      (edition) =>
        edition.enrollment_open <= now && edition.enrollment_close > now,
    ),
    nextEdition: editions.find((edition) => edition.enrollment_open > now),
  };
}
