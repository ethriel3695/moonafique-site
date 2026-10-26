import { z } from "zod";
import { jsonAction } from "@/lib/grimmunity/http";
import { club } from "@/lib/grimmunity/runtime";
import { lockedProgram, one, transaction } from "@/lib/grimmunity/db";
import { ClubError, type Membership } from "@/lib/grimmunity/model";
import { preferencesSchema } from "@/lib/grimmunity/preferences";
const input = z
  .object({ membershipId: z.string().uuid(), preferences: preferencesSchema })
  .strict();
export const runtime = "nodejs";
export async function POST(request: Request) {
  return jsonAction(request, false, async (user) => {
    const value = input.parse(await request.json()),
      c = club();
    await transaction(c.pool, async (db) => {
      await lockedProgram(db, c.mode);
      const m = await one<Membership>(
        db,
        "SELECT * FROM grim.memberships WHERE id=$1 AND owner_id=$2 AND program_id=$3",
        [value.membershipId, user.id, c.mode],
      );
      if (!m || m.tier_snapshot.id !== "grimm_starter")
        throw new ClubError("membership_not_found", 404);
      await db.query("UPDATE grim.memberships SET preferences=$2 WHERE id=$1", [
        m.id,
        value.preferences,
      ]);
      await c.audit(db, user.id, "color_preferences_updated", m.id);
    });
    return { ok: true };
  });
}
