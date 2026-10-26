import { z } from "zod";
import { jsonAction } from "@/lib/grimmunity/http";
import { club } from "@/lib/grimmunity/runtime";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, false, async (user) => {
    const value = z
      .object({ membershipId: z.string().uuid().optional() })
      .strict()
      .parse(await request.json());
    return {
      url: value.membershipId
        ? await club().portal(user.id, value.membershipId)
        : await club().portal(user.id),
    };
  });
}
