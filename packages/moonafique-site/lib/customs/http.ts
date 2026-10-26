import { z } from "zod";
import { ClubError } from "../grimmunity/model";

export async function readRequestBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ClubError("invalid_request", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        throw new ClubError("invalid_request", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export function customFailure(error: unknown) {
  const messages: Record<string, string> = {
    sign_in_required: "Sign in to manage custom requests.",
    staff_only: "This queue is for Moonafique staff.",
    invalid_origin: "Reload this page and try again.",
    custom_date_past: "Choose today or a future date for your request.",
    custom_rate_limited: "Too many requests. Please try again in an hour.",
    custom_changed: "This request changed since you opened it. Reload the page before saving again. Your changes have not been saved.",
    invalid_request: "Check the form fields and try again.",
  };
  const invalid = error instanceof z.ZodError || error instanceof SyntaxError;
  const code = error instanceof ClubError ? error.code : invalid ? "invalid_request" : "custom_unavailable";
  return Response.json({
    error: error instanceof z.ZodError ? error.issues[0]?.message : messages[code] ?? "Custom requests are temporarily unavailable. Please try again shortly.",
  }, { status: error instanceof ClubError ? error.status : invalid ? 400 : 503, headers: { "Cache-Control": "no-store" } });
}
