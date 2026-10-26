import type Stripe from "stripe";
import { after, NextResponse } from "next/server";
import { database } from "./db";
import { drainOutbox } from "./outbox";
import { club } from "./runtime";
import { grimMode } from "./runtime";
import { grimStripe } from "./stripe-gateway";
import { handledEvents } from "./service";
export async function processGrimEvent(event: Stripe.Event) {
  if (handledEvents.has(event.type) && "id" in event.data.object)
    await club().process({
      id: event.id,
      type: event.type,
      object_id: event.data.object.id,
      livemode: event.livemode,
    });
}
export async function grimWebhook(request: Request) {
  let event: Stripe.Event;
  try {
    const secret = process.env.GRIM_STRIPE_WEBHOOK_SECRET;
    if (!secret)
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    event = grimStripe(grimMode()).webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
      secret,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }
  try {
    await processGrimEvent(event);
    if (process.env.GRIM_SEND_EMAILS === "approved") {
      after(async () => {
        try { await drainOutbox(database(), grimMode(), true, { limit: 5, deadline: Date.now() + 20_000 }); }
        catch { console.error("Grimmunity notification delivery remains pending for retry."); }
      });
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Event pending; retry required" },
      { status: 503 },
    );
  }
}
