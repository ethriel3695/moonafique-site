import type { Pool } from "pg";
import { one, transaction } from "../../lib/grimmunity/db";
import { saveEdition } from "../../lib/grimmunity/editions";
import { Grimmunity } from "../../lib/grimmunity/service";
import { prepareMembershipPrices } from "./prepare-membership-prices";
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
  const tiers = await prepareMembershipPrices(stripe);
  const portal =
    prior?.portal_configuration_id ?? "bpc_1UU7A8DuU4RwQbePVn4QPqJ9";
  const managedPortal =
    prior?.managed_portal_configuration_id ??
    (
      await stripe.billingPortal.configurations.create(
        {
          features: {
            payment_method_update: { enabled: true },
            invoice_history: { enabled: true },
            customer_update: { enabled: true, allowed_updates: ["shipping"] },
            subscription_update: { enabled: false },
            subscription_cancel: { enabled: false },
          },
          metadata: { grim_billing: "notice_shipping_v1" },
        },
        { idempotencyKey: "grim:live:managed-portal:v3" },
      )
    ).id;
  await transaction(pool, async (db) => {
    await db.query(
      "SELECT pg_advisory_xact_lock(hashtext('grim:configuration'))",
    );
    const locked = await one<Program>(
      db,
      "SELECT * FROM grim.program WHERE id='live' FOR UPDATE",
    );
    if (locked?.enabled || locked?.approved_at)
      throw Error("Program was approved during setup");
    if (
      await one(
        db,
        "SELECT id FROM grim.memberships WHERE program_id='live' LIMIT 1",
      )
    )
      throw Error("Members appeared during setup");
    await db.query(
      `INSERT INTO grim.program(id,enabled,currency,member_cap,retained_copies,countries,shipping_text,tax_mode,terms_version,cancellation_text,recovery_text,support_email,portal_configuration_id,tiers,fulfillment_lead_days,billing_policy,managed_portal_configuration_id)
      VALUES('live',false,'usd',24,1,ARRAY['US'],$1,'exclusive','moonafique-notified-shipping-v3-2026-10-26',$2,$3,'hello@moonafique.com',$4,$5,7,'notice_shipping_v1',$6)
      ON CONFLICT(id) DO UPDATE SET tiers=EXCLUDED.tiers,enabled=false,approved_at=NULL,shipping_text=EXCLUDED.shipping_text,
        terms_version=EXCLUDED.terms_version,cancellation_text=EXCLUDED.cancellation_text,recovery_text=EXCLUDED.recovery_text,billing_policy=EXCLUDED.billing_policy,managed_portal_configuration_id=EXCLUDED.managed_portal_configuration_id`,
      [
        "Shipping is quoted through Shippo each month. Membership, shipping, tax, total, and scheduled payment date are itemized in a notice delivered at least seven days before automatic renewal payment. The first invoice is reviewed and paid separately after saving a card.",
        "Cancel membership renewal in your account. Prepaid membership remains covered through the paid term, with monthly postage still due for each delivery. Contact Moonafique to pause a delivery or request a refund review.",
        "A monthly delivery needs paid membership coverage and paid postage. Failed notices, changed details, and uncertain payments block automatic collection. Payments recovered after the edition cutoff require staff review.",
        portal,
        JSON.stringify(tiers),
        managedPortal,
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
  await gateway.checkPortal(p, true);
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
    "Four live draft memberships prepared with monthly, six-month (5% off), and annual (10% off) Prices. Shipping remains separate. Products inactive; enrollment closed.",
  );
  console.log(
    JSON.stringify({
      membership_prices: tiers.map((tier) => ({
        tier: tier.id,
        options: tier.billing_options,
      })),
      enabled: p.enabled,
      approved: !!p.approved_at,
    }),
  );
}
