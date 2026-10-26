// Sandbox billing fixtures use approved offer prices, perks, and capacity;
// exact dates, retained copies, tax, and recovery policy remain test-only.
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { launchPlan } from "./launch-plan";
import { sandboxTiers, tierAllocations } from "./tiers";
import { transaction } from "./db";
export async function seedSandbox(pool: Pool) {
  await transaction(pool, async (db) => {
    await db.query(
      `INSERT INTO grim.program(id,enabled,price_id,product_id,currency,amount,member_cap,retained_copies,countries,shipping_text,tax_mode,terms_version,cancellation_text,recovery_text,support_email,portal_configuration_id,tiers)
      VALUES('sandbox',false,'price_legacy_fixture','prod_legacy_fixture','usd',$2,$3,1,ARRAY['US'],'Shipping is quoted through Shippo for your address and renews monthly with each membership.','not_collecting','sandbox-review-v1','Cancel future renewals in your account before the next payment. Already-paid editions remain due unless refunded.','Test policy: payment recovered before the edition cutoff may be packed; later recovery requires staff review.','support@example.invalid','bpc_grim_fixture',$1) ON CONFLICT(id) DO NOTHING`,
      [
        JSON.stringify(sandboxTiers),
        sandboxTiers[0].amount,
        launchPlan.memberCap,
      ],
    );
    for (const month of [launchPlan.firstShipmentMonth, "2026-12", "2027-01"]) {
      await db.query(
        `INSERT INTO grim.editions(id,program_id,month,title,capacity,retained_copies,enrollment_open,enrollment_close,period_open,period_close,payment_cutoff,address_cutoff,dispatch_start,dispatch_end,state)
      VALUES($1,'sandbox',$2,$3,$4,1,($2||'-01')::timestamp AT TIME ZONE 'America/Boise',($2||'-06')::timestamp AT TIME ZONE 'America/Boise',($2||'-01')::timestamp AT TIME ZONE 'America/Boise',(($2||'-01')::timestamp+interval '1 month') AT TIME ZONE 'America/Boise',($2||'-11')::timestamp AT TIME ZONE 'America/Boise',($2||'-12')::timestamp AT TIME ZONE 'America/Boise',($2||'-12')::timestamp AT TIME ZONE 'America/Boise',($2||'-19')::timestamp AT TIME ZONE 'America/Boise','open') ON CONFLICT(program_id,month) DO NOTHING`,
        [
          randomUUID(),
          month,
          `Subscriber design · ${month} (fixture)`,
          launchPlan.memberCap,
        ],
      );
      await db.query(
        "UPDATE grim.editions SET tier_allocations=$2 WHERE program_id='sandbox' AND month=$1 AND NOT EXISTS(SELECT 1 FROM grim.reservations r WHERE r.edition_id=grim.editions.id) AND NOT EXISTS(SELECT 1 FROM grim.entitlements i WHERE i.edition_id=grim.editions.id)",
        [month, tierAllocations(sandboxTiers)],
      );
    }
  });
}
