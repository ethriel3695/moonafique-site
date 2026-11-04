import { jsonAction } from "@/lib/grimmunity/http";
import { ClubError } from "@/lib/grimmunity/model";
import { guardProviderRequest } from "@/lib/grimmunity/provider-request-guard";
import { club, grimMode } from "@/lib/grimmunity/runtime";
import { quoteMembership } from "@/lib/grimmunity/shipping";
import { shippoGateway } from "@/lib/shippo";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, false, async (user) => {
    if (!user.emailVerified) throw new ClubError("verified_email_required", 403);
    await guardProviderRequest(request, "shipping", user.id);
    return quoteMembership(
      club(),
      shippoGateway(grimMode()),
      user.id,
      await request.json(),
    );
  });
}
