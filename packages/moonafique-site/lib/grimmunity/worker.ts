import { timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { one } from "./db";
import type { Mode, Receipt } from "./model";
import type { Grimmunity } from "./service";
import { drainOutbox } from "./outbox";
import { deliverInterestConfirmations } from "./interest-mail";
import { runManagedMember } from "./renewals";
import { shippoConfigured, shippoGateway } from "../shippo";

export function workerAuthorized(
  header: string | null,
  secret = process.env.CRON_SECRET,
): boolean {
  if (!secret || secret.length < 32 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`),
    actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function runWorker(
  pool: Pool,
  mode: Mode,
  service: Grimmunity,
  recentPaidInvoices: (customer: string) => Promise<string[]>,
  budgetMs = 35_000,
) {
  const deadline = Date.now() + budgetMs;
  const lease = await pool.connect();
  const lockKey = `grim:worker:${mode}`;
  const result = {
    events: 0,
    members: 0,
    failures: 0,
    emailDeliveryEnabled: process.env.GRIM_SEND_EMAILS === "approved",
  };
  try {
    // Pin one backend for the lease even behind a transaction-pooling proxy.
    // Session advisory locks are unsafe on Neon's pooled connections.
    await lease.query("BEGIN");
    const locked = !!(
      await one<{ locked: boolean }>(
        lease,
        "SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked",
        [lockKey],
      )
    )?.locked;
    if (!locked) return { skipped: "already_running" };
    if (!(await one(lease, "SELECT id FROM grim.program WHERE id=$1", [mode])))
      return { skipped: "billing_not_configured" };
    await pool.query(
      "INSERT INTO grim.worker_status(mode,started_at) VALUES($1,now()) ON CONFLICT(mode) DO UPDATE SET started_at=now(),finished_at=NULL,result=NULL",
      [mode],
    );
    if (Date.now() < deadline) {
      try {
        const delivery = await deliverInterestConfirmations(pool, mode, {
          limit: 5,
          deadline,
        });
        result.failures += delivery.failures ?? 0;
      } catch {
        result.failures++;
      }
    }
    const events = (
      await pool.query<Receipt>(
        "SELECT id,type,object_id FROM grim.events WHERE program_id=$1 AND state='pending' ORDER BY attempts,received_at LIMIT 5",
        [mode],
      )
    ).rows;
    for (const event of events) {
      if (Date.now() >= deadline) break;
      try {
        await service.process({ ...event, livemode: mode === "live" });
        result.events++;
      } catch {
        result.failures++;
      }
    }
    if (Date.now() < deadline) {
      try {
        await service.expireReservations(3, deadline);
      } catch {
        result.failures++;
      }
    }
    const members = (
      await pool.query<import("./model").Membership>(
        `SELECT * FROM grim.memberships WHERE program_id=$1 AND customer_id IS NOT NULL
       ORDER BY last_reconciled_at NULLS FIRST,created_at LIMIT 100`,
        [mode],
      )
    ).rows;
    for (const member of members) {
      if (Date.now() >= deadline) break;
      try {
        await service.refreshMember(member.owner_id, member.id);
        if (member.tier_snapshot.billing && Date.now() < deadline)
          await runManagedMember(
            service,
            shippoConfigured(mode) ? shippoGateway(mode) : null,
            member,
            process.env.GRIM_MANAGED_COLLECTION === "approved",
            deadline,
          );
        for (const id of (await recentPaidInvoices(member.customer_id!)).slice(
          0,
          2,
        )) {
          if (Date.now() >= deadline) break;
          await service.reconcileInvoice(id);
        }
        result.members++;
      } catch {
        result.failures++;
      }
      // Rotate attempted members so one provider failure cannot starve the others.
      await pool.query(
        "UPDATE grim.memberships SET last_reconciled_at=now() WHERE id=$1",
        [member.id],
      );
    }
    if (result.emailDeliveryEnabled && Date.now() < deadline) {
      try {
        await drainOutbox(pool, mode, true, { limit: 100, deadline });
      } catch {
        result.failures++;
      }
    }
    await pool.query(
      "UPDATE grim.worker_status SET finished_at=now(),result=$2 WHERE mode=$1",
      [mode, result],
    );
    return result;
  } finally {
    try {
      await lease.query("ROLLBACK");
    } finally {
      lease.release();
    }
  }
}
