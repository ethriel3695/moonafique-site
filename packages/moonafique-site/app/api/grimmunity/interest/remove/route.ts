import { z } from "zod";
import { database } from "@/lib/grimmunity/db";
import { jsonAction } from "@/lib/grimmunity/http";
import { grimMode } from "@/lib/grimmunity/runtime";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return jsonAction(request, true, async () => {
    const { email, confirmed } = z.object({
      email: z.string().trim().toLowerCase().max(254).email(),
      confirmed: z.literal("yes"),
    }).parse(await request.json());
    if (confirmed) await database().query("DELETE FROM grim.interest WHERE mode=$1 AND email=$2", [grimMode(), email]);
    return { ok: true };
  });
}
