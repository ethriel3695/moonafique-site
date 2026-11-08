import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stripe } from "@/lib/stripe";
import { shopPaymentStatus } from "@/lib/shop-confirmation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order | Moonafique", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const status = await shopPaymentStatus(typeof session_id === "string" ? session_id : undefined, id => stripe.checkout.sessions.retrieve(id));
  return <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:py-24">
    <Sparkles aria-hidden="true" className="mx-auto mb-6 size-10 text-primary" />
    <h1 className="text-4xl sm:text-5xl">{status === "paid" ? "A little magic is coming your way." : status === "pending" ? "Your payment is processing." : "Let’s check your order."}</h1>
    <p className="mt-6 text-lg leading-8 text-muted-foreground">{status === "paid" ? "Your payment is confirmed. Thank you for bringing a little Moonafique into your world!" : status === "pending" ? "Checkout is complete, but payment has not been confirmed yet. Please check again before placing another order." : "We couldn’t confirm a payment from this link. If you’ve already paid, check your receipt or contact us before trying again."}</p>
    <div className="mt-8 flex flex-wrap justify-center gap-4"><Button asChild><Link href="/#shop">Back to the shop</Link></Button><Button variant="outline" asChild><Link href="/contact">Get help with an order</Link></Button></div>
  </div>;
}
