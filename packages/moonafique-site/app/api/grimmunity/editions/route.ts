import { jsonAction } from "@/lib/grimmunity/http";
import { club } from "@/lib/grimmunity/runtime";
import { saveEdition, setEditionState } from "@/lib/grimmunity/editions";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, true, async (user) => {
    const body = await request.json();
    if (body.action === "state") {
      const { action: _, ...fields } = body;
      void _;
      await setEditionState(club(), user.id, fields);
    } else await saveEdition(club(), user.id, body);
    return { ok: true };
  });
}
