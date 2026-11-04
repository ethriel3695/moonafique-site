import { database } from "@/lib/grimmunity/db";
import { failure, sameOrigin } from "@/lib/grimmunity/http";
import { confirmEmail, readInterestBody } from "@/lib/grimmunity/interest";
import { grimMode } from "@/lib/grimmunity/runtime";
import { activateNewsletter } from "@/lib/newsletter";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { token } = z.object({ token: z.string().max(100) }).parse(await readInterestBody(request));
    const purpose = await confirmEmail(database(), grimMode(), token, process.env.GRIM_INTEREST_SECRET ?? "", activateNewsletter);
    return Response.json({ purpose }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
