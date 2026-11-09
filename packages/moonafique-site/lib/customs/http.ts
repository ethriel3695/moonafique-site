import { z } from "zod";
import { validatePhotoFiles } from "./photos";
import { ClubError } from "../grimmunity/model";

async function readBytes(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new ClubError("invalid_request", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ClubError("invalid_request", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function readRequestBody(request: Request) {
  return JSON.parse((await readBytes(request, 32768)).toString("utf8")) as unknown;
}

export async function readSubmission(request: Request): Promise<{ input: unknown; photos: File[] }> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data")) return { input: await readRequestBody(request), photos: [] };
  const bytes = await readBytes(request, 3 * 1024 * 1024 + 65536);
  let form: FormData;
  try { form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": type } }).formData(); }
  catch { throw new ClubError("invalid_request", 400); }
  const payload = form.get("payload");
  if (typeof payload !== "string" || Buffer.byteLength(payload) > 32768) throw new ClubError("invalid_request", 400);
  const photos = form.getAll("photos");
  if (photos.some((photo) => typeof photo === "string") || [...form.keys()].some((key) => !["payload", "photos"].includes(key)))
    throw new ClubError("invalid_request", 400);
  validatePhotoFiles(photos as File[]);
  return { input: JSON.parse(payload) as unknown, photos: photos as File[] };
}

export function customFailure(error: unknown) {
  const messages: Record<string, string> = {
    sign_in_required: "Sign in to manage custom requests.",
    staff_only: "This queue is for Moonafique staff.",
    invalid_origin: "Reload this page and try again.",
    custom_date_past: "Choose today or a future date for your request.",
    custom_rate_limited: "Too many requests. Please try again in an hour.",
    custom_changed: "This request changed since you opened it. Reload the page before saving again. Your changes have not been saved.",
    custom_photo_limit: "Choose up to three reference photos.",
    custom_photo_type: "Use JPG, PNG, or WebP photos.",
    custom_photo_size: "One of your photos is too large. Remove it and try a smaller image.",
    custom_photo_invalid: "We couldn’t read one of your photos. Try exporting it as a new JPG, PNG, or WebP image.",
    invalid_request: "Check the form fields and try again.",
  };
  const invalid = error instanceof z.ZodError || error instanceof SyntaxError;
  const code = error instanceof ClubError ? error.code : invalid ? "invalid_request" : "custom_unavailable";
  return Response.json({
    error: error instanceof z.ZodError ? error.issues[0]?.message : messages[code] ?? "Custom requests are temporarily unavailable. Please try again shortly.",
  }, { status: error instanceof ClubError ? error.status : invalid ? 400 : 503, headers: { "Cache-Control": "no-store" } });
}
