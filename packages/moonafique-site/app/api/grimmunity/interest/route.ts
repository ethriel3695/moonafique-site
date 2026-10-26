import { database } from "@/lib/grimmunity/db";
import { failure, sameOrigin } from "@/lib/grimmunity/http";
import { readInterestBody, registerInterest } from "@/lib/grimmunity/interest";
import { ClubError } from "@/lib/grimmunity/model";
import { grimMode } from "@/lib/grimmunity/runtime";
import { after } from "next/server";
import { deliverInterestConfirmations } from "@/lib/grimmunity/interest-mail";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (process.env.GRIM_INTEREST_ENABLED !== "true")
      throw new ClubError("interest_unavailable", 503);
    const input = await readInterestBody(request);
    // Vercel replaces this header with the connecting client's IP.
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const mode = grimMode();
    const interestId = await registerInterest(database(), mode, input, ip, process.env.GRIM_INTEREST_SECRET ?? "");
    if (interestId) after(async () => {
      try {
        const result = await deliverInterestConfirmations(database(), mode, { interestId });
        if (result.failures) console.error("Grimmunity waiting-list confirmation remains pending.");
      } catch {
        console.error("Grimmunity waiting-list confirmation remains pending.");
      }
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
