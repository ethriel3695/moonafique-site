import type Stripe from "stripe";

export async function shopPaymentStatus(
  sessionId: string | undefined,
  retrieve: (id: string) => Promise<Pick<Stripe.Checkout.Session, "mode" | "status" | "payment_status">>,
): Promise<"paid" | "pending" | "unavailable"> {
  if (!sessionId || !/^cs_(?:live|test)_[A-Za-z0-9]{16,200}$/.test(sessionId)) return "unavailable";
  try {
    const session = await retrieve(sessionId);
    if (session.mode !== "payment" || session.status !== "complete") return "unavailable";
    return session.payment_status === "paid" ? "paid" : "pending";
  } catch { return "unavailable"; }
}
