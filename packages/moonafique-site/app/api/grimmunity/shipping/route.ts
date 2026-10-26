import { z } from "zod";
import { jsonAction } from "@/lib/grimmunity/http";
import { club, grimMode } from "@/lib/grimmunity/runtime";
import {
  quoteOrder,
  buyOrderLabel,
  refreshOrderLabel,
} from "@/lib/grimmunity/shipping";
import { shippoGateway } from "@/lib/shippo";
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("quote"), id: z.string().uuid() }).strict(),
  z
    .object({
      action: z.literal("refresh"),
      id: z.string().uuid(),
      transactionId: z
        .string()
        .regex(/^[a-f0-9]{32}$/)
        .optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("buy"),
      id: z.string().uuid(),
      quoteId: z.string().uuid(),
      rateId: z.string().min(1).max(100),
      maxAmount: z.number().int().positive(),
      confirmed: z.literal(true),
    })
    .strict(),
]);
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return jsonAction(request, true, async (user) => {
    const value = input.parse(await request.json());
    const c = club(),
      gateway = shippoGateway(grimMode());
    if (value.action === "quote")
      return quoteOrder(c, gateway, user.id, value.id);
    if (value.action === "buy") await buyOrderLabel(c, gateway, user.id, value);
    else
      await refreshOrderLabel(
        c,
        gateway,
        user.id,
        value.id,
        value.transactionId,
      );
    return { ok: true };
  });
}
