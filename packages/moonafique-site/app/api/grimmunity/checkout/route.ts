import { jsonAction } from "@/lib/grimmunity/http";
import { ClubError } from "@/lib/grimmunity/model";
import { guardProviderRequest } from "@/lib/grimmunity/provider-request-guard";
import { club } from "@/lib/grimmunity/runtime";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, false, async (user) => {
    if (!user.emailVerified) throw new ClubError("verified_email_required", 403);
    await guardProviderRequest(request, "membership", user.id);
    return { url: await club().checkout(user, await request.json()) };
  });
}
