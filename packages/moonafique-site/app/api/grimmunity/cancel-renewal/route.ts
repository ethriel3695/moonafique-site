import { z } from "zod";
import { jsonAction } from "@/lib/grimmunity/http";
import { club } from "@/lib/grimmunity/runtime";
import { cancelManaged } from "@/lib/grimmunity/renewals";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, false, async (user) => {
    const { membershipId } = z
      .object({ membershipId: z.string().uuid() })
      .strict()
      .parse(await request.json());
    await cancelManaged(club(), user.id, membershipId);
    return { ok: true };
  });
}
