import { randomUUID } from "node:crypto";
import { z } from "zod";
import { lockedProgram, one, transaction } from "./db";
import { ClubError } from "./model";
import type { Grimmunity } from "./service";
import { tierAllocations } from "./tiers";
const local = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
export const editionInput = z
  .object({
    action: z.literal("edition"),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    title: z.string().trim().min(1).max(120),
    enrollment_open: local,
    enrollment_close: local,
    payment_cutoff: local,
    address_cutoff: local,
    dispatch_start: local,
    dispatch_end: local,
    state: z.enum(["draft", "open", "closed", "vaulted"]),
  })
  .strict();
export async function saveEdition(c: Grimmunity, actor: string, raw: unknown) {
  const v = editionInput.parse(raw);
  await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    const prior = await one<{ id: string }>(
      db,
      "SELECT id FROM grim.editions WHERE program_id=$1 AND month=$2",
      [c.mode, v.month],
    );
    if (
      prior &&
      (await one(
        db,
        "SELECT id FROM grim.reservations WHERE edition_id=$1 UNION SELECT id FROM grim.fulfillments WHERE edition_id=$1 LIMIT 1",
        [prior.id],
      ))
    )
      throw new ClubError("edition_schedule_locked");
    if (
      prior &&
      (await one(
        db,
        "SELECT invoice_id FROM grim.entitlements WHERE edition_id=$1 LIMIT 1",
        [prior.id],
      ))
    )
      throw new ClubError("edition_schedule_locked");
    const id = prior?.id ?? randomUUID();
    await db.query(
      `INSERT INTO grim.editions(id,program_id,month,title,capacity,retained_copies,enrollment_open,enrollment_close,period_open,period_close,payment_cutoff,address_cutoff,dispatch_start,dispatch_end,state)
      VALUES($1,$2,$3,$4,$5,$6,$7::timestamp AT TIME ZONE 'America/Boise',$8::timestamp AT TIME ZONE 'America/Boise',($3||'-01')::timestamp AT TIME ZONE 'America/Boise',(($3||'-01')::timestamp + interval '1 month') AT TIME ZONE 'America/Boise',$9::timestamp AT TIME ZONE 'America/Boise',$10::timestamp AT TIME ZONE 'America/Boise',$11::timestamp AT TIME ZONE 'America/Boise',$12::timestamp AT TIME ZONE 'America/Boise',$13)
      ON CONFLICT(program_id,month) DO UPDATE SET title=EXCLUDED.title,capacity=EXCLUDED.capacity,retained_copies=EXCLUDED.retained_copies,enrollment_open=EXCLUDED.enrollment_open,enrollment_close=EXCLUDED.enrollment_close,payment_cutoff=EXCLUDED.payment_cutoff,address_cutoff=EXCLUDED.address_cutoff,dispatch_start=EXCLUDED.dispatch_start,dispatch_end=EXCLUDED.dispatch_end,state=EXCLUDED.state`,
      [
        id,
        c.mode,
        v.month,
        v.title,
        p.member_cap,
        p.retained_copies,
        v.enrollment_open,
        v.enrollment_close,
        v.payment_cutoff,
        v.address_cutoff,
        v.dispatch_start,
        v.dispatch_end,
        v.state,
      ],
    );
    await db.query("UPDATE grim.editions SET tier_allocations=$2 WHERE id=$1", [
      id,
      tierAllocations(p.tiers),
    ]);
    await c.audit(db, actor, "edition_saved", id, v);
  });
}

export async function setEditionState(
  c: Grimmunity,
  actor: string,
  raw: unknown,
) {
  const v = z
    .object({
      id: z.string().uuid(),
      state: z.enum(["open", "closed", "vaulted"]),
    })
    .strict()
    .parse(raw);
  await transaction(c.pool, async (db) => {
    const p = await lockedProgram(db, c.mode);
    const e = await one<import("./model").Edition>(
      db,
      "SELECT * FROM grim.editions WHERE id=$1 AND program_id=$2",
      [v.id, c.mode],
    );
    if (!e) throw new ClubError("edition_not_found", 404);
    if (e.state === "vaulted" && v.state !== "vaulted")
      throw new ClubError("edition_vaulted");
    if (
      v.state === "open" &&
      (e.enrollment_close <= c.now() ||
        e.capacity !== p.member_cap ||
        e.retained_copies !== p.retained_copies)
    )
      throw new ClubError("enrollment_closed");
    if (
      v.state === "vaulted" &&
      (await one(
        db,
        "SELECT f.id FROM grim.fulfillments f JOIN grim.entitlements i ON i.invoice_id=f.invoice_id WHERE f.edition_id=$1 AND f.state<>'shipped' AND (i.financial_state<>'refunded' OR EXISTS(SELECT 1 FROM grim.exceptions x WHERE x.membership_id=f.membership_id AND x.resolved_at IS NULL AND (x.invoice_id=f.invoice_id OR x.invoice_id IS NULL))) LIMIT 1",
        [e.id],
      ))
    )
      throw new ClubError("unfulfilled_paid_editions");
    await db.query("UPDATE grim.editions SET state=$2 WHERE id=$1", [
      e.id,
      v.state,
    ]);
    await c.audit(db, actor, "edition_state_changed", e.id, {
      before: e.state,
      after: v.state,
    });
  });
}
