import { jsonAction } from "@/lib/grimmunity/http";
import { club, grimMode } from "@/lib/grimmunity/runtime";
import { quoteMembership } from "@/lib/grimmunity/shipping";
import { shippoGateway } from "@/lib/shippo";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, false, async (user) =>
    quoteMembership(
      club(),
      shippoGateway(grimMode()),
      user.id,
      await request.json(),
    ),
  );
}
