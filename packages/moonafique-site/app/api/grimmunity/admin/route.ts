import { z } from "zod";
import { jsonAction } from "@/lib/grimmunity/http";
import { club } from "@/lib/grimmunity/runtime";
import { reissueNotice } from "@/lib/grimmunity/renewals";
import { replaceRenewal } from "@/lib/grimmunity/renewal-replacement";
import { shippoGateway } from "@/lib/shippo";
const input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("replace_renewal"),
      invoice: z.string().startsWith("in_"),
      note: z.string().trim().min(8).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("renotice"),
      invoice: z.string().startsWith("in_"),
      note: z.string().trim().min(8).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("unlock"),
      id: z.string().uuid(),
      note: z.string().trim().min(8).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("reconsider"),
      invoice: z.string().startsWith("in_"),
      note: z.string().trim().min(8).max(1000),
    })
    .strict(),
  z.object({ action: z.literal("lock"), id: z.string().uuid() }).strict(),
  z
    .object({
      action: z.literal("ship"),
      id: z.string().uuid(),
      number: z.string().trim().min(1).max(150),
      url: z.union([
        z.literal(""),
        z.url().refine((v) => new URL(v).protocol === "https:"),
      ]),
    })
    .strict(),
  z
    .object({
      action: z.literal("resolve"),
      id: z.string().uuid(),
      note: z.string().trim().min(8).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("release"),
      invoice: z.string().startsWith("in_"),
      note: z.string().trim().min(8).max(1000),
    })
    .strict(),
]);
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, true, async (user) => {
    const v = input.parse(await request.json());
    const c = club();
    if (v.action === "replace_renewal")
      await replaceRenewal(
        c,
        shippoGateway(c.mode),
        user.id,
        v.invoice,
        v.note,
      );
    if (v.action === "renotice")
      await reissueNotice(c, user.id, v.invoice, v.note);
    if (v.action === "unlock") await c.unlockOrder(user.id, v.id, v.note);
    if (v.action === "reconsider")
      await c.reconsiderInvoice(user.id, v.invoice, v.note);
    if (v.action === "lock") await c.lockOrder(user.id, v.id);
    if (v.action === "ship")
      await c.shipOrder(user.id, v.id, { number: v.number, url: v.url });
    if (v.action === "resolve") await c.resolveException(user.id, v.id, v.note);
    if (v.action === "release") await c.releaseHold(user.id, v.invoice, v.note);
    return { ok: true };
  });
}
