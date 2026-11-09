import { z } from "zod";
import { requireStaff } from "@/lib/grimmunity/http";
import { database } from "@/lib/grimmunity/db";
import { grimMode } from "@/lib/grimmunity/runtime";
import { referencePhoto } from "@/lib/customs/photos";
import { customFailure } from "@/lib/customs/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const id = z.string().uuid().parse((await context.params).id);
    const photo = await referencePhoto(database(), grimMode(), id);
    if (!photo) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(new Uint8Array(photo.data), { headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": `inline; filename="reference-${id}.webp"`,
      "Content-Length": String(photo.data.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    } });
  } catch (error) { return customFailure(error); }
}
