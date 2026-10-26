import { readFile } from "node:fs/promises";
import { z } from "zod";
import { database, one, transaction } from "../../lib/grimmunity/db";
import { migrate } from "../../lib/grimmunity/migrations";
import { seedSandbox } from "../../lib/grimmunity/fixtures";
import { club, grimMode } from "../../lib/grimmunity/runtime";
import { grimStripe, StripeGateway } from "../../lib/grimmunity/stripe-gateway";
import { drainOutbox } from "../../lib/grimmunity/outbox";
import { saveEdition } from "../../lib/grimmunity/editions";
import { tiersSchema } from "../../lib/grimmunity/tiers";
import type { Program } from "../../lib/grimmunity/model";

const configSchema = z
  .object({
    tiers: tiersSchema,
    currency: z.string().regex(/^[a-z]{3}$/),
    member_cap: z.number().int().positive(),
    retained_copies: z.number().int().nonnegative(),
    countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
    shipping_text: z.string().min(10),
    tax_mode: z.enum(["inclusive", "exclusive", "not_collecting"]),
    fulfillment_lead_days: z
      .number()
      .int()
      .min(1)
      .max(30)
      .nullable()
      .default(null),
    terms_version: z.string().min(1),
    cancellation_text: z.string().min(10),
    recovery_text: z.string().min(10),
    support_email: z.email(),
    portal_configuration_id: z.string().startsWith("bpc_"),
  })
  .strict()
  .refine(
    (value) =>
      value.tiers.every(
        (tier) => tier.shipping !== undefined || tier.shipping_included,
      ),
    "New offers must include shipping: null while undecided, or a configured recurring shipping fee.",
  );
async function main() {
  const [command, arg] = process.argv.slice(2);
  const pool = database();
  const mode = grimMode();
  try {
    if (command === "migrate") {
      await migrate(pool);
      console.log("Grim migration applied. Enrollment remains disabled.");
    } else if (command === "seed-sandbox") {
      if (mode !== "sandbox") throw Error("Sandbox mode required");
      await seedSandbox(pool);
      console.log("Sandbox fixtures saved. Enrollment remains disabled.");
    } else if (command === "configure") {
      const v = configSchema.parse(JSON.parse(await readFile(arg, "utf8")));
      await transaction(pool, async (db) => {
        await db.query(
          "SELECT pg_advisory_xact_lock(hashtext('grim:configuration'))",
        );
        const prior = await one(
          db,
          "SELECT id FROM grim.program WHERE id=$1 FOR UPDATE",
          [mode],
        );
        if (
          prior &&
          (await one(
            db,
            "SELECT id FROM grim.memberships WHERE program_id=$1 LIMIT 1",
            [mode],
          ))
        )
          throw Error(
            "Configuration is immutable once members exist. Use a reviewed migration for changes.",
          );
        const keys = Object.keys(v),
          values = Object.entries(v).map(([key, value]) =>
            key === "tiers" ? JSON.stringify(value) : value,
          );
        await db.query(
          `INSERT INTO grim.program(id,${keys.join(",")}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(",")}) ON CONFLICT(id) DO UPDATE SET ${keys.map((k) => `${k}=EXCLUDED.${k}`).join(",")},enabled=false,approved_at=NULL`,
          [mode, ...values],
        );
        await db.query(
          "INSERT INTO grim.audit(program_id,actor,action,entity_id) VALUES($1,$2,$3,$1)",
          [mode, "operator", "configuration_saved"],
        );
      });
      console.log(
        "Configuration saved disabled. Validate Stripe and edition schedules before enrollment.",
      );
    } else if (command === "check") {
      const p = await one<Program>(
        pool,
        "SELECT * FROM grim.program WHERE id=$1",
        [mode],
      );
      if (!p) throw Error("Configure first");
      await new StripeGateway(grimStripe(mode)).checkConfiguration(p);
      console.log(
        "Configured membership and recurring shipping Prices, products, mode, and portal configuration verified.",
      );
    } else if (command === "enable-sandbox") {
      if (mode !== "sandbox")
        throw Error("This command cannot enable live enrollment");
      const p = await one<Program>(
        pool,
        "SELECT * FROM grim.program WHERE id='sandbox'",
      );
      if (!p) throw Error("Configure first");
      await new StripeGateway(grimStripe(mode)).checkConfiguration(p);
      await pool.query(
        "UPDATE grim.program SET enabled=true WHERE id='sandbox'",
      );
      console.log("Sandbox enrollment enabled within configured windows.");
    } else if (command === "disable") {
      await pool.query("UPDATE grim.program SET enabled=false WHERE id=$1", [
        mode,
      ]);
      console.log("New enrollment disabled. Keep webhook processing active.");
    } else if (command === "edition") {
      await saveEdition(
        club(),
        "operator",
        JSON.parse(await readFile(arg, "utf8")),
      );
      console.log("Edition saved.");
    } else if (command === "expire") {
      await club().expireReservations();
      console.log("Expired reservations reconciled with Stripe.");
    } else if (command === "retry-events") {
      const rows = (
        await pool.query<{ id: string; type: string; object_id: string }>(
          "SELECT id,type,object_id FROM grim.events WHERE program_id=$1 AND state='pending' ORDER BY received_at LIMIT 100",
          [mode],
        )
      ).rows;
      for (const row of rows)
        await club().process({ ...row, livemode: mode === "live" });
      console.log(`Reprocessed ${rows.length} pending receipts.`);
    } else if (command === "reconcile") {
      const service = club();
      let count = 0;
      if (arg) {
        if (!arg.startsWith("in_")) throw Error("Expected invoice ID");
        await service.reconcileInvoice(arg);
        count = 1;
      } else {
        // Scope to known customers, including test clocks, instead of an account-wide clock-filtered invoice list.
        const members = (
          await pool.query<{ customer_id: string }>(
            "SELECT customer_id FROM grim.memberships WHERE program_id=$1 AND customer_id IS NOT NULL",
            [mode],
          )
        ).rows;
        const stripe = grimStripe(mode);
        for (const m of members)
          for await (const invoice of stripe.invoices.list({
            customer: m.customer_id,
            status: "paid",
            limit: 100,
          })) {
            await service.reconcileInvoice(invoice.id);
            count++;
          }
      }
      console.log(
        `Reconciled ${count} paid invoices without creating charges or postage.`,
      );
    } else if (command === "outbox") {
      console.log(await drainOutbox(pool, mode, arg === "--send"));
    } else if (command === "portal-sandbox") {
      if (mode !== "sandbox") throw Error("Sandbox mode required");
      const config = await grimStripe(mode).billingPortal.configurations.create(
        {
          business_profile: {
            headline: "Manage your Moonafique Grimmunity membership",
          },
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
          metadata: { grim_program: "sandbox" },
        },
      );
      console.log(
        `Sandbox portal configuration: ${config.id}. Save this ID in program configuration.`,
      );
    } else
      throw Error(
        "Use migrate, seed-sandbox, configure <json>, check, enable-sandbox, disable, edition <json>, expire, retry-events, reconcile [invoice], outbox [--send], or portal-sandbox.",
      );
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    error instanceof z.ZodError
      ? "Invalid configuration fields."
      : error instanceof Error
        ? error.message
        : "Command failed",
  );
  process.exitCode = 1;
});
