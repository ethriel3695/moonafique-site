import { database } from "@/lib/grimmunity/db";
import { requireStaff, sameOrigin } from "@/lib/grimmunity/http";
import { grimMode } from "@/lib/grimmunity/runtime";
import { updateRequest } from "@/lib/customs/store";
import { customFailure, readRequestBody } from "@/lib/customs/http";

export const runtime = "nodejs";
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireStaff();
    const result = await updateRequest(database(), grimMode(), await readRequestBody(request), user.id);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return customFailure(error); }
}
