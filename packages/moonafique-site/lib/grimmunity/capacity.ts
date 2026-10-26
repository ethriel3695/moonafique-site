import { one, type DB } from "./db";
import type { Edition, Mode } from "./model";
import type { TierId } from "./tiers";

export async function occupants(
  db: DB,
  mode: Mode,
  edition: Edition,
  exclude?: string,
  tierId?: TierId,
): Promise<number> {
  const row = await one<{ count: string }>(
    db,
    `SELECT count(*) FROM (
      SELECT m.id AS membership_id FROM grim.memberships m WHERE m.program_id=$1 AND (
        (m.seat_held AND EXISTS(SELECT 1 FROM grim.reservations r JOIN grim.editions e ON e.id=r.edition_id WHERE r.membership_id=m.id AND e.period_open<=$4))
        OR (m.subscription_id IS NOT NULL AND m.period_start >= $4 AND m.period_start < $5)
      )
      UNION SELECT r.membership_id FROM grim.reservations r JOIN grim.editions e ON e.id=r.edition_id WHERE r.program_id=$1 AND (
        (r.state IN ('creating','open','review') AND e.period_open<=$4) OR (r.state='converted' AND r.edition_id=$2)
      )
      UNION SELECT membership_id FROM grim.entitlements WHERE edition_id=$2 AND allocated
    ) seats JOIN grim.memberships held ON held.id=seats.membership_id
      WHERE ($3::uuid IS NULL OR membership_id<>$3) AND ($6::text IS NULL OR held.tier_snapshot->>'id'=$6)`,
    [
      mode,
      edition.id,
      exclude ?? null,
      edition.period_open,
      edition.period_close,
      tierId ?? null,
    ],
  );
  return Number(row!.count);
}
