import type { Pool } from "pg";
import { transaction } from "../grimmunity/db";
import { costInput, costOrders, type CostJob, type CostReference, type ReferenceImport } from "./costs";
import type { AnalyticsSnapshot } from "./model";

export class CostError extends Error {
  constructor(public code: "conflict" | "order_link" | "reference_missing" | "invalid" | "limit", public status = 400) { super(code); }
}
type JobRow = { id: string; revision: number; data: CostJob["data"]; reference: CostJob["reference"]; updated_at: Date };
const asJob = (row: JobRow): CostJob => ({ id: row.id, revision: row.revision, data: row.data, reference: row.reference, updatedAt: row.updated_at.toISOString() });
export async function readCosts(pool: Pool) {
  const [jobs, references, snapshots, links] = await Promise.all([
    pool.query<JobRow>("SELECT * FROM whatnot_private.cost_jobs ORDER BY updated_at DESC LIMIT 5000"),
    pool.query<{ data: ReferenceImport; revision: number }>("SELECT * FROM whatnot_private.cost_references WHERE singleton=true"),
    pool.query<{ data: AnalyticsSnapshot }>("SELECT data FROM whatnot_private.snapshot WHERE singleton=true"),
    pool.query<{ order_id: string; currency: string; job_id: string }>("SELECT * FROM whatnot_private.cost_order_links"),
  ]);
  const snapshot = snapshots.rows[0]?.data ?? null;
  return { jobs: jobs.rows.map(asJob), references: references.rows[0]?.data ?? null, referenceRevision: references.rows[0]?.revision ?? 0, orders: costOrders(snapshot, links.rows), reportsAt: snapshot?.importedAt ?? null };
}
export async function saveReferences(pool: Pool, data: ReferenceImport, revision: number, staffId: string) {
  await transaction(pool, async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('whatnot:cost-writes'))");
    const current = (await db.query<{ revision: number }>("SELECT revision FROM whatnot_private.cost_references WHERE singleton=true")).rows[0];
    if ((current?.revision ?? 0) !== revision) throw new CostError("conflict", 409);
    await db.query("INSERT INTO whatnot_private.cost_references(singleton,revision,data,updated_by) VALUES(true,$1,$2,$3) ON CONFLICT(singleton) DO UPDATE SET revision=excluded.revision,data=excluded.data,updated_by=excluded.updated_by,updated_at=now()", [revision + 1, JSON.stringify(data), staffId]);
  });
}
export async function saveCostJob(pool: Pool, id: string, revision: number, raw: unknown, staffId: string) {
  const parsed = costInput.safeParse(raw);
  if (!parsed.success) throw new CostError("invalid");
  const data = parsed.data;
  return transaction(pool, async db => {
    // Serializes assignments across different jobs, not just edits to one job.
    await db.query("SELECT pg_advisory_xact_lock(hashtext('whatnot:cost-writes'))");
    const old = (await db.query<JobRow>("SELECT * FROM whatnot_private.cost_jobs WHERE id=$1", [id])).rows[0];
    if ((old?.revision ?? 0) !== revision) throw new CostError("conflict", 409);
    if (!old && Number((await db.query("SELECT count(*) FROM whatnot_private.cost_jobs")).rows[0].count) >= 5000) throw new CostError("limit");
    let reference = old?.reference ?? null;
    if (old && old.data.referenceId !== data.referenceId) throw new CostError("invalid");
    if (!old && data.referenceId) {
      const source = (await db.query<{ data: ReferenceImport }>("SELECT data FROM whatnot_private.cost_references WHERE singleton=true")).rows[0]?.data;
      const entry: CostReference | undefined = source?.rows.find(r => r.id === data.referenceId);
      if (!entry) throw new CostError("reference_missing", 409);
      reference = { ...entry, importedAt: source!.importedAt };
    }
    if (data.revenue === "whatnot") {
      const snapshot = (await db.query<{ data: AnalyticsSnapshot }>("SELECT data FROM whatnot_private.snapshot WHERE singleton=true")).rows[0]?.data ?? null;
      const orders = costOrders(snapshot);
      const selected = data.orderIds.map(id => orders.find(o => o.id === id && o.currency === data.currency));
      if (selected.some(o => !o) || selected.reduce((n, o) => n + (o?.quantity ?? 0), 0) !== data.units) throw new CostError("order_link");
      if ((await db.query("SELECT 1 FROM whatnot_private.cost_order_links WHERE order_id=ANY($1::text[]) AND currency=$2 AND job_id<>$3", [data.orderIds, data.currency, id])).rowCount) throw new CostError("order_link", 409);
    }
    const next = revision + 1;
    const row = (await db.query<JobRow>("INSERT INTO whatnot_private.cost_jobs(id,revision,data,reference,updated_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data,updated_by=excluded.updated_by,updated_at=now() RETURNING *", [id, next, JSON.stringify(data), reference ? JSON.stringify(reference) : null, staffId])).rows[0];
    await db.query("DELETE FROM whatnot_private.cost_order_links WHERE job_id=$1", [id]);
    for (const orderId of data.orderIds) await db.query("INSERT INTO whatnot_private.cost_order_links(order_id,currency,job_id) VALUES($1,$2,$3)", [orderId, data.currency, id]);
    await db.query("INSERT INTO whatnot_private.cost_job_history(job_id,revision,data,updated_by) VALUES($1,$2,$3,$4)", [id, next, JSON.stringify(data), staffId]);
    return asJob(row);
  });
}
