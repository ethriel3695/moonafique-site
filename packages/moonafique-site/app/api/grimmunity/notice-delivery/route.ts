import { database } from "@/lib/grimmunity/db";
import { grimMode } from "@/lib/grimmunity/runtime";
import { receiveNoticeDelivery } from "@/lib/grimmunity/notice-delivery";
import { failure } from "@/lib/grimmunity/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await receiveNoticeDelivery(database(), grimMode(), request);
    return Response.json({ received: true });
  } catch (error) {
    return failure(error);
  }
}
