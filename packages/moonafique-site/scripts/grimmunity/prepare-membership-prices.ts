import type Stripe from "stripe";
import {
  membershipBilling,
  billingMonths,
} from "../../lib/grimmunity/billing-options";
import { membershipTiers, type Tier } from "../../lib/grimmunity/tiers";

// Catalog preparation only: this helper never creates customers or subscriptions.
export async function prepareMembershipPrices(stripe: Stripe): Promise<Tier[]> {
  const tiers: Tier[] = [];
  for (const offer of membershipTiers) {
    const productId = `prod_moonafique_live_${offer.id}_v2`;
    let product: Stripe.Product;
    try {
      product = await stripe.products.retrieve(productId);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        (error as { code?: string }).code !== "resource_missing"
      )
        throw error;
      product = await stripe.products.create(
        {
          id: productId,
          name: offer.name,
          description: offer.description,
          active: false,
          metadata: {
            grim_subscription: "true",
            grim_program: "live",
            moonafique_offer: "collections-v2",
            tier: offer.id,
          },
        },
        { idempotencyKey: `moonafique:collections-v2:product:${offer.id}` },
      );
    }
    if (
      !product.livemode ||
      product.active ||
      product.id !== productId ||
      product.metadata.moonafique_offer !== "collections-v2" ||
      product.metadata.grim_subscription !== "true" ||
      product.metadata.tier !== offer.id
    )
      throw Error("Expected an inactive live draft product");

    const options: NonNullable<Tier["billing_options"]> = [];
    for (const months of billingMonths) {
      const plan = membershipBilling(offer.amount, months);
      // Preserve the existing monthly lookup/idempotency keys.
      const cadence = months === 1 ? "monthly" : `${months}months`;
      const lookupKey = `moonafique_live_${offer.id}_${plan.amount}_${cadence}_v2`;
      const found = await stripe.prices.list({
        product: product.id,
        lookup_keys: [lookupKey],
        active: true,
        limit: 2,
      });
      if (found.data.length > 1) throw Error("Duplicate membership lookup key");
      const price =
        found.data[0] ??
        (await stripe.prices.create(
          {
            product: product.id,
            unit_amount: plan.amount,
            currency: "usd",
            tax_behavior: "exclusive",
            recurring: plan.recurring,
            lookup_key: lookupKey,
            metadata: {
              grim_subscription: "true",
              tier: offer.id,
              membership_months: String(months),
              membership_discount: String(plan.discount),
            },
          },
          {
            idempotencyKey:
              months === 1
                ? `moonafique:collections-v2:price:${offer.id}:${offer.amount}`
                : `moonafique:collections-v2:price:${offer.id}:${months}:${plan.amount}`,
          },
        ));
      if (
        !price.livemode ||
        !price.active ||
        price.unit_amount !== plan.amount ||
        price.currency !== "usd" ||
        price.tax_behavior !== "exclusive" ||
        price.recurring?.interval !== plan.recurring.interval ||
        price.recurring.interval_count !== plan.recurring.interval_count ||
        price.recurring.usage_type !== "licensed" ||
        price.product !== product.id ||
        price.billing_scheme !== "per_unit" ||
        price.transform_quantity ||
        price.custom_unit_amount
      )
        throw Error("Draft membership price mismatch");
      options.push({
        months,
        discount: plan.discount,
        amount: plan.amount,
        price_id: price.id,
      });
    }
    tiers.push({
      ...offer,
      price_id: options[0].price_id,
      product_id: product.id,
      billing_options: options,
    });
  }
  return tiers;
}
