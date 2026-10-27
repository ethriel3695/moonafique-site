import type { Tier, TierAvailability } from "./tiers";
import { tierAvailability } from "./capacity";
import { database, one } from "./db";
import { grimMode } from "./runtime";
import type {
  Address,
  Edition,
  Fulfillment,
  Membership,
  Program,
} from "./model";
export type OrderView = Fulfillment & {
  preferences?: Membership["preferences"];
  shipping_label?: import("./shipping").ShippingLabel | null;
  tier_snapshot: Tier;
  title: string;
  month: string;
  dispatch_start: Date;
  dispatch_end: Date;
  address_cutoff: Date;
  financial_state: string;
  review_reason: string | null;
  amount_paid: number;
  currency: string;
  email: string;
  address: Address | null;
};
export type ExceptionView = {
  id: string;
  invoice_id: string | null;
  reason: string;
  created_at: Date;
  resolution: string | null;
  resolved_at: Date | null;
};
export type AccountView = {
  billingCycles?: (import("./renewals").BillingCycle & {
    notice_delivered_at: Date | null;
    notice_failed_at: Date | null;
  })[];
  coverage?: import("./renewals").Coverage[];
  memberships?: Membership[];
  membership: Membership | undefined;
  orders: OrderView[];
  exceptions: ExceptionView[];
};
export async function publicOffer() {
  if (!process.env.GRIM_DATABASE_URL)
    return {
      program: undefined,
      editions: [] as Edition[],
      unavailable: false,
      availability: {} as TierAvailability,
      availabilityEditionId: null,
    };
  try {
    const db = database(),
      mode = grimMode();
    const program = await one<Program>(
      db,
      "SELECT * FROM grim.program WHERE id=$1",
      [mode],
    );
    const editions = (
      await db.query<Edition>(
        "SELECT * FROM grim.editions WHERE program_id=$1 AND state<>'draft' AND period_close>now() ORDER BY period_open LIMIT 3",
        [mode],
      )
    ).rows;
    const now = new Date();
    if (
      program?.enabled &&
      program.billing_policy === "notice_shipping_v1" &&
      process.env.GRIM_STRIPE_SECRET_KEY
    ) {
      const { expireInitialPayments } = await import("./renewals");
      const { club } = await import("./runtime");
      await expireInitialPayments(club(), 1);
    }
    const edition =
      editions.find(
        (e) =>
          e.state === "open" &&
          e.enrollment_open <= now &&
          e.enrollment_close > now,
      ) ??
      editions.find((e) => e.enrollment_open > now) ??
      editions.find((e) => e.period_open <= now && e.period_close > now) ??
      editions[0];
    const availability =
      program && edition
        ? await tierAvailability(db, mode, program, edition)
        : {};
    return {
      program,
      editions,
      unavailable: false,
      availability,
      availabilityEditionId: edition?.id ?? null,
    };
  } catch {
    return {
      program: undefined,
      editions: [] as Edition[],
      unavailable: true,
      availability: {} as TierAvailability,
      availabilityEditionId: null,
    };
  }
}
const ordersSQL = `SELECT f.*,e.title,e.month,e.dispatch_start,e.dispatch_end,e.address_cutoff,i.financial_state,i.review_reason,i.amount_paid,i.currency,i.tier_snapshot,i.preferences,m.email,m.address,
  (SELECT to_jsonb(s) FROM grim.shipping_labels s WHERE s.fulfillment_id=f.id) AS shipping_label
  FROM grim.fulfillments f JOIN grim.editions e ON e.id=f.edition_id JOIN grim.entitlements i ON i.invoice_id=f.invoice_id JOIN grim.memberships m ON m.id=f.membership_id`;
export async function accountView(owner: string): Promise<AccountView> {
  const db = database();
  const memberships = (
    await db.query<Membership>(
      "SELECT * FROM grim.memberships WHERE program_id=$1 AND owner_id=$2 ORDER BY created_at",
      [grimMode(), owner],
    )
  ).rows;
  const membership = memberships[0];
  if (!membership) return { membership, orders: [], exceptions: [] };
  return {
    membership,
    memberships,
    billingCycles: (
      await db.query(
        `SELECT b.*,o.delivered_at AS notice_delivered_at,o.delivery_failed_at AS notice_failed_at FROM grim.billing_cycles b JOIN grim.memberships m ON m.id=b.membership_id LEFT JOIN grim.outbox o ON o.id=b.notice_id WHERE m.owner_id=$1 AND m.program_id=$2 ORDER BY b.period_start DESC LIMIT 24`,
        [owner, grimMode()],
      )
    ).rows,
    coverage: (
      await db.query(
        `SELECT p.* FROM grim.prepaid_periods p JOIN grim.memberships m ON m.id=p.membership_id WHERE m.owner_id=$1 AND m.program_id=$2 ORDER BY p.period_start DESC`,
        [owner, grimMode()],
      )
    ).rows,
    orders: (
      await db.query<OrderView>(
        `${ordersSQL} WHERE m.program_id=$1 AND m.owner_id=$2 ORDER BY e.month DESC,m.created_at`,
        [grimMode(), owner],
      )
    ).rows,
    exceptions: (
      await db.query<ExceptionView>(
        "SELECT x.* FROM grim.exceptions x JOIN grim.memberships m ON m.id=x.membership_id WHERE m.program_id=$1 AND m.owner_id=$2 AND x.resolved_at IS NULL ORDER BY x.created_at DESC",
        [grimMode(), owner],
      )
    ).rows,
  };
}
export async function adminView(month?: string) {
  const db = database(),
    mode = grimMode();
  const program = await one<Program>(
    db,
    "SELECT * FROM grim.program WHERE id=$1",
    [mode],
  );
  const editions = (
    await db.query<Edition>(
      "SELECT * FROM grim.editions WHERE program_id=$1 ORDER BY month DESC",
      [mode],
    )
  ).rows;
  const edition =
    editions.find((e) => e.month === month) ??
    editions.find(
      (e) => e.period_open <= new Date() && e.period_close > new Date(),
    ) ??
    editions.filter((e) => e.period_open > new Date()).at(-1) ??
    editions[0];
  return {
    billingCycles: (
      await db.query(
        `SELECT b.*,m.email,m.tier_snapshot->>'name' AS membership_name,o.delivered_at AS notice_delivered_at,o.delivery_failed_at AS notice_failed_at FROM grim.billing_cycles b JOIN grim.memberships m ON m.id=b.membership_id LEFT JOIN grim.outbox o ON o.id=b.notice_id WHERE m.program_id=$1 AND b.state NOT IN ('paid','canceled') ORDER BY b.period_start LIMIT 100`,
        [mode],
      )
    ).rows as (import("./renewals").BillingCycle & {
      email: string;
      membership_name: string;
      notice_delivered_at: Date | null;
      notice_failed_at: Date | null;
    })[],
    program,
    editions,
    edition,
    interestCount: Number(
      (await one<{ count: string }>(
        db,
        "SELECT count(*) FROM grim.interest WHERE mode=$1",
        [mode],
      ))!.count,
    ),
    interestMail: await one<{ pending: string; review: string }>(
      db,
      `SELECT count(*) FILTER (WHERE n.state='pending') AS pending,count(*) FILTER (WHERE n.state='review') AS review
       FROM grim.interest_notifications n JOIN grim.interest i ON i.id=n.interest_id WHERE i.mode=$1`,
      [mode],
    ),
    worker: await one<{
      started_at: Date;
      finished_at: Date | null;
      result: { events: number; members: number; failures: number } | null;
    }>(
      db,
      "SELECT started_at,finished_at,result FROM grim.worker_status WHERE mode=$1",
      [mode],
    ),
    orders: edition
      ? (
          await db.query<OrderView>(
            `${ordersSQL} WHERE e.id=$1 ORDER BY f.state,m.email`,
            [edition.id],
          )
        ).rows
      : [],
    exceptions: (
      await db.query<ExceptionView>(
        "SELECT * FROM grim.exceptions WHERE program_id=$1 AND resolved_at IS NULL ORDER BY created_at DESC",
        [mode],
      )
    ).rows,
    members: (
      await db.query<Membership>(
        "SELECT * FROM grim.memberships WHERE program_id=$1 ORDER BY created_at DESC",
        [mode],
      )
    ).rows,
    pendingEvents: Number(
      (await one<{ count: string }>(
        db,
        "SELECT count(*) FROM grim.events WHERE program_id=$1 AND state='pending'",
        [mode],
      ))!.count,
    ),
    pendingNotifications: Number(
      (await one<{ count: string }>(
        db,
        "SELECT count(*) FROM grim.outbox WHERE program_id=$1 AND state<>'sent'",
        [mode],
      ))!.count,
    ),
  };
}
