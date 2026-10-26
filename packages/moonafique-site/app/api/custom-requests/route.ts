import { database } from "@/lib/grimmunity/db";
import { sameOrigin } from "@/lib/grimmunity/http";
import { grimMode } from "@/lib/grimmunity/runtime";
import { submitRequest } from "@/lib/customs/store";
import { customFailure, readRequestBody } from "@/lib/customs/http";
import { after } from "next/server";
import { deliverCustomEmails } from "@/lib/customs/mail";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = await readRequestBody(request);
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const mode = grimMode();
    const reference = await submitRequest(database(), mode, input, ip, process.env.GRIM_INTEREST_SECRET ?? "");
    if (reference) after(async () => {
      try {
        const options = { requestId: reference, deadline: Date.now() + 20_000 };
        const result = await deliverCustomEmails(database(), mode, options);
        if (result.failures) await deliverCustomEmails(database(), mode, options);
      } catch { console.error("Custom request saved; email notification remains pending."); }
    });
    return Response.json({ ok: true, reference }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return customFailure(error); }
}
