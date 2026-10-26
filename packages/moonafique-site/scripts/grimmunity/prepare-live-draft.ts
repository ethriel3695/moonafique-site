import type { Pool } from "pg";
import type Stripe from "stripe";
import { one, transaction } from "../../lib/grimmunity/db";
import { saveEdition } from "../../lib/grimmunity/editions";
import { Grimmunity } from "../../lib/grimmunity/service";
import { membershipTiers, type Tier } from "../../lib/grimmunity/tiers";
import { grimStripe, StripeGateway } from "../../lib/grimmunity/stripe-gateway";
import type { Program } from "../../lib/grimmunity/model";

// Explicit production-build setup only. Makes reviewed draft products; never
// activates products, approves a program, enables enrollment, or creates charges.
export async function prepareLiveDraft(pool: Pool) {
  if (
    process.env.VERCEL_ENV !== "production" ||
    process.env.GRIM_MODE !== "live" ||
    process.env.GRIM_NEON_PROJECT_ID !== "aged-cherry-13270058" ||
    process.env.GRIM_PRODUCTION_SETUP !== "draft" ||
    process.env.GRIM_LIVE_ENROLLMENT !== "disabled"
  )
    throw Error("Live draft setup guard failed");
  const stripe = grimStripe("live");
  const prior = await one<Program>(
    pool,
    "SELECT * FROM grim.program WHERE id='live'",
  );
  if (
    prior?.enabled ||
    prior?.approved_at ||
    (await one(
      pool,
      "SELECT id FROM grim.memberships WHERE program_id='live' LIMIT 1",
    ))
  )
    throw Error("Refusing to replace an approved or used live program");
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
      product.metadata.moonafique_offer !== "collections-v2"
    )
      throw Error("Expected an inactive live draft product");
    const lookupKey = `moonafique_live_${offer.id}_${offer.amount}_monthly_v2`;
    const found = await stripe.prices.list({
      product: product.id,
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    const price =
      found.data[0] ??
      (await stripe.prices.create(
        {
          product: product.id,
          unit_amount: offer.amount,
          currency: "usd",
          tax_behavior: "exclusive",
          recurring: { interval: "month" },
          lookup_key: lookupKey,
          metadata: { grim_subscription: "true", tier: offer.id },
        },
        {
          idempotencyKey: `moonafique:collections-v2:price:${offer.id}:${offer.amount}`,
        },
      ));
    if (
      !price.livemode ||
      price.unit_amount !== offer.amount ||
      price.currency !== "usd" ||
      price.tax_behavior !== "exclusive" ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1 ||
      price.product !== product.id
    )
      throw Error("Draft membership price mismatch");
    tiers.push({ ...offer, price_id: price.id, product_id: product.id });
  }
  const portal =
    prior?.portal_configuration_id ?? "bpc_1UU7A8DuU4RwQbePVn4QPqJ9";
  await transaction(pool, async (db) => {
    await db.query(
      "SELECT pg_advisory_xact_lock(hashtext('grim:configuration'))",
    );
    await one(db, "SELECT id FROM grim.program WHERE id='live' FOR UPDATE");
    if (
      await one(
        db,
        "SELECT id FROM grim.memberships WHERE program_id='live' LIMIT 1",
      )
    )
      throw Error("Members appeared during setup");
    await db.query(
      `INSERT INTO grim.program(id,enabled,currency,member_cap,retained_copies,countries,shipping_text,tax_mode,terms_version,cancellation_text,recovery_text,support_email,portal_configuration_id,tiers,fulfillment_lead_days)
      VALUES('live',false,'usd',24,1,ARRAY['US'],$1,'exclusive','moonafique-collections-v2-2026-10-25',$2,$3,'hello@moonafique.com',$4,$5,7)
      ON CONFLICT(id) DO UPDATE SET tiers=EXCLUDED.tiers,enabled=false,approved_at=NULL,shipping_text=EXCLUDED.shipping_text,
        terms_version=EXCLUDED.terms_version,cancellation_text=EXCLUDED.cancellation_text,recovery_text=EXCLUDED.recovery_text`,
      [
        "Shipping is calculated through Shippo for your address. The accepted shipping amount renews monthly with each subscription. Applicable sales tax is added at checkout.",
        "Cancel in your account before the next renewal to stop future charges. Already-paid editions still ship unless refunded.",
        "Unpaid editions do not ship. Payments recovered after the edition cutoff require staff review before fulfillment.",
        portal,
        JSON.stringify(tiers),
      ],
    );
    await db.query(
      "INSERT INTO grim.audit(program_id,actor,action,entity_id,detail) VALUES('live','operator','collections_draft_prepared','live',$1)",
      [
        {
          tiers: tiers.map((t) => ({
            id: t.id,
            amount: t.amount,
            member_cap: t.member_cap,
          })),
          enrollment_enabled: false,
        },
      ],
    );
  });
  const gateway = new StripeGateway(stripe);
  const p = (await one<Program>(
    pool,
    "SELECT * FROM grim.program WHERE id='live'",
  ))!;
  await gateway.checkPortal(p);
  const c = new Grimmunity(pool, gateway, "live");
  for (const [month, next] of [
    ["2026-11", "2026-12"],
    ["2026-12", "2027-01"],
    ["2027-01", "2027-02"],
  ]) {
    const existing = await one<{ id: string }>(
      pool,
      "SELECT id FROM grim.editions WHERE program_id='live' AND month=$1",
      [month],
    );
    if (
      existing &&
      (await one(
        pool,
        "SELECT id FROM grim.reservations WHERE edition_id=$1 UNION SELECT id FROM grim.fulfillments WHERE edition_id=$1 LIMIT 1",
        [existing.id],
      ))
    )
      throw Error("Refusing to replace a used edition");
    await saveEdition(c, "operator", {
      action: "edition",
      month,
      title: `Moonafique collections · ${month}`,
      enrollment_open: `${month}-01T00:00`,
      enrollment_close: `${next}-01T00:00`,
      payment_cutoff: `${next}-08T00:00`,
      address_cutoff: `${next}-08T00:00`,
      dispatch_start: `${next}-08T00:00`,
      dispatch_end: `${next}-15T00:00`,
      state: "draft",
    });
  }
  console.log(
    "Four live draft memberships prepared: Grimm $15/$30 and ACEO $10/$20, plus destination-rated shipping. Products inactive; enrollment closed.",
  );
}
