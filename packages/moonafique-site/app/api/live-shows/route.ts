import { getLiveSchedule } from "@/lib/live-shows-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(await getLiveSchedule(), {
    // The server owns the shared cache; browsers recheck it without adding
    // another stale response layer or exposing the credential.
    headers: { "Cache-Control": "no-store" },
  });
}
