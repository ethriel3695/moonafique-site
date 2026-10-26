import { publicOffer } from "@/lib/grimmunity/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const { availability, availabilityEditionId, unavailable } =
    await publicOffer();
  return Response.json(
    { availability, editionId: availabilityEditionId },
    {
      status: unavailable ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
