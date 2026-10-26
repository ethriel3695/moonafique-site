import {
  createHash,
  createPublicKey,
  publicEncrypt,
  randomUUID,
} from "node:crypto";
import type { Pool } from "pg";
import type Stripe from "stripe";
import { lockedProgram, one, transaction } from "../../lib/grimmunity/db";
import { saveEdition } from "../../lib/grimmunity/editions";
import type { Program, Reservation } from "../../lib/grimmunity/model";
import { Grimmunity, handledEvents } from "../../lib/grimmunity/service";
import {
  grimStripe,
  STRIPE_API_VERSION,
  StripeGateway,
} from "../../lib/grimmunity/stripe-gateway";
import { membershipTiers, type Tier } from "../../lib/grimmunity/tiers";
import { quoteMembership } from "../../lib/grimmunity/shipping";
import { shippoGateway, shippoConfigured } from "../../lib/shippo";

const origin = "https://moonafique-grimmunity-sandbox.vercel.app";
const setupTag = "grimmunity-preview-v1";

export function assertPreviewSetup() {
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env.GRIM_MODE !== "sandbox" ||
    process.env.GRIM_LIVE_ENROLLMENT === "approved" ||
    !process.env.GRIM_EXPECTED_NEON_PROJECT_ID ||
    process.env.GRIM_NEON_PROJECT_ID !==
      process.env.GRIM_EXPECTED_NEON_PROJECT_ID ||
    process.env.SERVER_URL !== origin
  )
    throw Error("Preview setup guard failed");
}

// Called only by an explicit Preview build override. No HTTP setup endpoint exists.
export async function provisionPreview(
  pool: Pool,
  phase: "provision" | "enable",
) {
  assertPreviewSetup();
  if (await one(pool, "SELECT id FROM grim.program WHERE id='live'"))
    throw Error("Live program present");
  const stripe = grimStripe("sandbox");
  if ((await stripe.balance.retrieve()).livemode)
    throw Error("Live Stripe account");
  const gateway = new StripeGateway(stripe);

  if (phase === "enable") {
    if (!process.env.GRIM_STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))
      throw Error("Webhook signing secret missing");
    const p = (await one<Program>(
      pool,
      "SELECT * FROM grim.program WHERE id='sandbox'",
    ))!;
    await gateway.checkConfiguration(p);
    if (!shippoConfigured("sandbox"))
      throw Error("A Shippo sandbox key is required");
    const endpoint = (
      await stripe.webhookEndpoints.list({ limit: 100 })
    ).data.find((e) => e.metadata.grim_setup === setupTag);
    if (
      !endpoint ||
      endpoint.livemode ||
      endpoint.status !== "enabled" ||
      new URL(endpoint.url).origin !== origin ||
      new URL(endpoint.url).pathname !== "/api/grimmunity/webhook" ||
      endpoint.api_version !== STRIPE_API_VERSION ||
      [...handledEvents].some(
        (event) => !endpoint.enabled_events.includes(event),
      )
    )
      throw Error("Webhook endpoint not ready");
    await pool.query("UPDATE grim.program SET enabled=true WHERE id='sandbox'");
    if (process.env.GRIM_PREVIEW_SMOKE === "checkout") {
      // Exercise the real reservation -> Stripe Checkout path without submitting
      // payment. The test customer cannot receive email and holds no paid seat.
      const c = new Grimmunity(pool, gateway, "sandbox");
      const owner = {
        id: "sandbox-setup-smoke",
        email: "grimmunity-test@example.invalid",
      };
      let sessionId: string | undefined;
      try {
        const quoted = await quoteMembership(
          c,
          shippoGateway("sandbox"),
          owner.id,
          {
            tierId: "grimm_keeper",
            address: {
              name: "Moonafique sandbox",
              line1: "798 N 4000 E",
              line2: "",
              city: "Rigby",
              state: "ID",
              postal_code: "83442",
              country: "US",
            },
          },
        );
        await c.checkout(owner, {
          requestKey: randomUUID(),
          tierId: "grimm_keeper",
          shippingQuoteId: quoted.id,
          termsVersion: p.terms_version,
          country: "US",
          consent: true,
        });
        const reservation = (await one<Reservation>(
          pool,
          "SELECT r.* FROM grim.reservations r JOIN grim.memberships m ON m.id=r.membership_id WHERE m.program_id='sandbox' AND m.owner_id=$1 AND r.state='open' ORDER BY r.created_at DESC LIMIT 1",
          [owner.id],
        ))!;
        sessionId = reservation.session_id!;
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (
          session.livemode ||
          session.mode !== "subscription" ||
          session.amount_total !== 3000 + quoted.rate.amount ||
          session.currency !== "usd" ||
          !!session.shipping_address_collection
        )
          throw Error("Checkout offer mismatch");
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: String(session.customer),
          configuration: p.portal_configuration_id,
        });
        if (!portalSession.url) throw Error("Portal session unavailable");
        const expired = await gateway.expireSession(sessionId);
        await transaction(pool, async (db) => {
          const program = await lockedProgram(db, "sandbox");
          await c.applySession(db, program, reservation, expired);
        });
        console.log(
          "Grimmunity checkout smoke passed:",
          JSON.stringify({
            amount_total: session.amount_total,
            currency: session.currency,
            customer: session.customer,
            session: session.id,
            state: expired.state,
            portal: "verified",
            payment: "not submitted",
          }),
        );
      } catch (error) {
        if (sessionId)
          await stripe.checkout.sessions
            .expire(sessionId)
            .catch(() => undefined);
        await pool.query(
          "UPDATE grim.program SET enabled=false WHERE id='sandbox'",
        );
        throw error;
      }
    }
    console.log(
      "Grimmunity sandbox enrollment enabled; Stripe prices, portal and webhook verified.",
    );
    return;
  }

  // Vercel Secrets stay in Vercel. Only the newly created signing secret is
  // encrypted for the operator's local public key; plaintext never enters logs.
  const publicKey = createPublicKey(
    process.env.GRIM_PREVIEW_HANDOFF_PUBLIC_KEY ?? "",
  );
  if (
    publicKey.asymmetricKeyType !== "rsa" ||
    (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 3072
  )
    throw Error("A 3072-bit or stronger RSA handoff key is required");
  const fingerprint = createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!bypass) throw Error("Protected webhook access missing");
  const month = process.env.GRIM_PREVIEW_TEST_MONTH;
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw Error("Test month missing");
  if (
    await one(
      pool,
      "SELECT id FROM grim.memberships WHERE program_id='sandbox' LIMIT 1",
    )
  )
    throw Error("Cannot replace configuration after members exist");

  const tiers: Tier[] = [];
  for (const offer of membershipTiers) {
    const productId = `prod_moonafique_sandbox_${offer.id}_v2`;
    let product: Stripe.Product;
    try {
      product = await stripe.products.retrieve(productId);
    } catch (error) {
      if ((error as { code?: string }).code !== "resource_missing") throw error;
      product = await stripe.products.create(
        {
          id: productId,
          name: offer.name,
          description: `${offer.description} Sandbox only.`,
          metadata: {
            grim_setup: setupTag,
            grim_program: "sandbox",
            grim_subscription: "true",
          },
        },
        { idempotencyKey: `${setupTag}:collections-v2:product:${offer.id}` },
      );
    }
    if (product.livemode || product.metadata.grim_setup !== setupTag)
      throw Error("Unexpected product");
    const lookupKey = `grimmunity_preview_${offer.id}_${offer.amount}_usd_monthly_v2`;
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
          currency: "usd",
          unit_amount: offer.amount,
          recurring: { interval: "month" },
          lookup_key: lookupKey,
          metadata: { grim_setup: setupTag, grim_program: "sandbox" },
        },
        {
          idempotencyKey: `${setupTag}:collections-v2:price:${offer.id}:${offer.amount}`,
        },
      ));
    if (
      price.unit_amount !== offer.amount ||
      price.livemode ||
      price.product !== product.id
    )
      throw Error("Sandbox price mismatch");
    tiers.push({ ...offer, price_id: price.id, product_id: product.id });
  }
  let portal = (
    await stripe.billingPortal.configurations.list({ limit: 100 })
  ).data.find((p) => p.metadata?.grim_setup === setupTag);
  portal ??= await stripe.billingPortal.configurations.create(
    {
      business_profile: {
        headline: "Manage your Moonafique Grimmunity membership",
      },
      default_return_url: `${origin}/account/grimmunity`,
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ["name", "address", "shipping"],
        },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
          proration_behavior: "none",
        },
        subscription_update: { enabled: false },
      },
      metadata: { grim_setup: setupTag, grim_program: "sandbox" },
    },
    { idempotencyKey: `${setupTag}:portal` },
  );

  await transaction(pool, async (db) => {
    await db.query("SELECT id FROM grim.program WHERE id='sandbox' FOR UPDATE");
    if (
      await one(
        db,
        "SELECT id FROM grim.memberships WHERE program_id='sandbox' LIMIT 1",
      )
    )
      throw Error("Members already exist");
    await db.query(
      "UPDATE grim.program SET tiers=$1,portal_configuration_id=$2,terms_version='moonafique-preview-collections-v2',shipping_text=$3,enabled=false WHERE id='sandbox'",
      [
        JSON.stringify(tiers),
        portal.id,
        "Shipping is quoted through Shippo for your address and renews monthly with each subscription.",
      ],
    );
  });
  const program = (await one<Program>(
    pool,
    "SELECT * FROM grim.program WHERE id='sandbox'",
  ))!;
  await gateway.checkConfiguration(program);

  const c = new Grimmunity(pool, gateway, "sandbox");
  const [year, number] = month.split("-").map(Number);
  const monthAt = (offset: number) =>
    new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
  for (let i = 0; i < 4; i++) {
    const current = monthAt(i),
      next = monthAt(i + 1);
    await saveEdition(c, "preview-setup", {
      action: "edition",
      month: current,
      title: `Sandbox signup test · ${current} (no shipment)`,
      enrollment_open: `${current}-01T00:00`,
      enrollment_close: `${next}-01T00:00`,
      payment_cutoff: `${next}-02T00:00`,
      address_cutoff: `${next}-03T00:00`,
      dispatch_start: `${next}-04T00:00`,
      dispatch_end: `${next}-11T00:00`,
      state: "open",
    });
  }

  const url = new URL("/api/grimmunity/webhook", origin);
  url.searchParams.set("x-vercel-protection-bypass", bypass);
  const previous = (
    await stripe.webhookEndpoints.list({ limit: 100 })
  ).data.find((e) => e.metadata.grim_setup === setupTag);
  // Stripe retains idempotent creation responses for 24 hours. Never silently
  // create a duplicate endpoint if a handoff is resumed after that window.
  if (
    previous &&
    (previous.metadata.handoff !== fingerprint ||
      Date.now() / 1000 - previous.created > 23 * 3600)
  )
    throw Error("Existing endpoint needs operator recovery");
  const endpoint = await stripe.webhookEndpoints.create(
    {
      url: url.toString(),
      api_version: STRIPE_API_VERSION,
      enabled_events: [
        ...handledEvents,
      ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
      description: "Grimmunity protected Vercel Preview — sandbox only",
      metadata: {
        grim_setup: setupTag,
        grim_program: "sandbox",
        handoff: fingerprint,
      },
    },
    { idempotencyKey: `${setupTag}:webhook:${fingerprint}` },
  );
  if (endpoint.livemode || !endpoint.secret)
    throw Error("Test webhook secret missing");
  const encrypted = publicEncrypt(
    { key: publicKey, oaepHash: "sha256" },
    Buffer.from(endpoint.secret),
  ).toString("base64");
  console.log(`GRIM_ENCRYPTED_WEBHOOK_HANDOFF=${encrypted}`);
  console.log(
    "Grimmunity test resources:",
    JSON.stringify({
      memberships: tiers.map((t) => t.price_id),
      shipping: "Shippo destination quotes",
      portal: portal.id,
      webhook: endpoint.id,
      month,
      enabled: false,
    }),
  );
  await c.audit(
    pool,
    "preview-setup",
    "sandbox_stripe_configured",
    endpoint.id,
    { memberships: tiers.map((t) => t.price_id), portal: portal.id },
  );
}
