import { jsonAction } from "@/lib/grimmunity/http";
import { club } from "@/lib/grimmunity/runtime";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, false, async (user) => ({
    url: await club().checkout(user, await request.json()),
  }));
}
