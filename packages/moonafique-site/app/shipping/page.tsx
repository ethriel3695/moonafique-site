import Link from "next/link";
import { shopShipping } from "@/lib/shop-shipping";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Shipping | Moonafique", description: "U.S. shipping options for Moonafique shop orders and monthly memberships." };
export default function ShippingPolicyPage() {
  return <div className="mx-auto max-w-3xl space-y-8 px-5 py-16">
    <h1 className="text-4xl">Shipping your little piece of Moonafique.</h1>
    <p className="text-sm text-muted-foreground">Updated November 8, 2026</p>
    <section className="space-y-4"><h2 className="text-2xl">One-time shop orders</h2>
      <p>We currently ship website orders within the United States. Enter your delivery address at checkout and review shipping before you pay.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Standard shipping: {formatCurrency(shopShipping.standard.amount)}, with an estimated {shopShipping.standard.estimate} in transit.</li>
        <li>Express shipping: {formatCurrency(shopShipping.express.amount)}, with an estimated {shopShipping.express.estimate} in transit.</li>
        <li>Free standard shipping on shop orders with an item subtotal of {formatCurrency(shopShipping.freeThreshold)} or more, before shipping and tax.</li>
      </ul>
      <p className="text-muted-foreground">Transit estimates begin after dispatch and are not guaranteed delivery dates. The shipping options available for your order are shown at checkout.</p>
    </section>
    <section className="space-y-4"><h2 className="text-2xl">Time to make and pack</h2>
      <p>In-stock pieces typically ship within 1–2 business days. Made-to-order pieces typically ship within 2–3 weeks. For a custom request, we’ll discuss timing with you before you order.</p>
      <p>Making and packing time is separate from transit time. Check the product page for any item-specific details.</p>
    </section>
    <section className="space-y-4"><h2 className="text-2xl">Monthly memberships</h2>
      <p>Grimmunity and ACEO memberships have their own delivery terms. Shipping is quoted for your U.S. address and charged for each monthly shipment, including prepaid memberships. The shop’s free-shipping offer does not apply to memberships.</p>
      <p>Allow up to 14 days after each successful membership payment for dispatch. Review your membership page and account for billing, shipping, and address-change details.</p>
      <Link href="/communities" className="inline-block font-semibold text-primary underline underline-offset-4">Explore membership delivery details</Link>
    </section>
    <section className="space-y-4"><h2 className="text-2xl">Whatnot purchases</h2><p>Orders placed on Whatnot use the shipping options and tracking shown in your Whatnot account.</p></section>
    <section className="space-y-4"><h2 className="text-2xl">Need a hand?</h2><p>For shipping questions or an address correction, <Link href="/contact" className="font-semibold text-primary underline underline-offset-4">contact Moonafique</Link>. Reach out before your order is packed so we can help.</p></section>
  </div>;
}
