import { z } from "zod";
import { database, transaction } from "@/lib/grimmunity/db";
import { jsonAction } from "@/lib/grimmunity/http";
import { grimMode } from "@/lib/grimmunity/runtime";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return jsonAction(request, true, async () => {
    const { email, confirmed } = z.object({
      email: z.string().trim().toLowerCase().max(254).email(),
      confirmed: z.literal("yes"),
    }).parse(await request.json());
    if (confirmed) {
      const mode = grimMode();
      await transaction(database(), async (db) => {
        await db.query("DELETE FROM grim.email_opt_ins WHERE mode=$1 AND purpose='launch' AND email=$2", [mode, email]);
        await db.query("DELETE FROM grim.interest WHERE mode=$1 AND email=$2", [mode, email]);
      });
    }
    return { ok: true };
  });
}
