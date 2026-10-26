import { database } from "@/lib/grimmunity/db";
import { grimMode } from "@/lib/grimmunity/runtime";
import { requireStaff, sameOrigin } from "@/lib/grimmunity/http";
import { workerAuthorized } from "@/lib/grimmunity/worker";
import { deliverCustomEmails } from "@/lib/customs/mail";
import { customFailure, readRequestBody } from "@/lib/customs/http";
import { submitRequest } from "@/lib/customs/store";
import { ClubError } from "@/lib/grimmunity/model";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;
async function run() {
  return Response.json(await deliverCustomEmails(database(), grimMode(), { limit: 10, deadline: Date.now() + 20_000 }), { headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request) {
  if (!workerAuthorized(request.headers.get("authorization"))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return await run(); } catch (error) { return customFailure(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const staff = await requireStaff();
    const input = z.object({ action: z.enum(["retry", "test"]).default("retry"), submissionKey: z.string().uuid().optional() }).parse(request.body ? await readRequestBody(request) : {});
    if (input.action === "test") {
      if (process.env.CUSTOM_REQUEST_SEND_EMAILS !== "approved") throw new ClubError("email_not_configured", 503);
      const email = z.email().parse(process.env.CUSTOM_REQUEST_STAFF_EMAIL);
      const submissionKey = z.uuid().parse(input.submissionKey);
      const mode = grimMode();
      // The authenticated test action always uses the configured staff inbox, never a browser-supplied recipient.
      const reference = await submitRequest(database(), mode, { submissionKey, name: "Moonafique email test", email,
        request: "TEST ONLY: A sample custom creation request to verify the staff notification and customer confirmation.",
        details: "No customer order, production work, or follow-up is required.", hasDeadline: false, acknowledged: true },
        `staff-email-test:${staff.id}`, process.env.GRIM_INTEREST_SECRET ?? "", new Date(), { staffEmailTest: true });
      const result = await deliverCustomEmails(database(), mode, { requestId: reference!, deadline: Date.now() + 20_000 });
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    return await run();
  } catch (error) { return customFailure(error); }
}
