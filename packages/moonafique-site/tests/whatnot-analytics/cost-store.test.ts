import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrateAnalytics } from "../../lib/whatnot-analytics/store";
import { readCosts, saveCostJob, saveReferences } from "../../lib/whatnot-analytics/cost-store";
import { importCostReference } from "../../lib/whatnot-analytics/cost-import";
import { newCostJob } from "../../lib/whatnot-analytics/costs";
import { snapshot, ledger } from "./fixtures";

const connection = process.env.WHATNOT_TEST_DATABASE_URL;
if (connection) { const url = new URL(connection); if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/grim_test") throw Error("Disposable local grim_test required"); }
describe.skipIf(!connection)("private job costing storage", () => {
  const pool = new Pool({ connectionString: connection, max: 5 });
  beforeAll(async () => { await migrateAnalytics(pool); });
  beforeEach(async () => {
    await pool.query("TRUNCATE whatnot_private.cost_job_history,whatnot_private.cost_order_links,whatnot_private.cost_jobs,whatnot_private.cost_references,whatnot_private.snapshot,whatnot_private.refreshes");
    const id = randomUUID();
    await pool.query("INSERT INTO whatnot_private.refreshes(id,status,seller_id,currency,coverage_start,coverage_end,requested_by) VALUES($1,'ready','fixture','USD','2026-01-01','2026-11-07','test')", [id]);
    await pool.query("INSERT INTO whatnot_private.snapshot(singleton,refresh_id,data) VALUES(true,$1,$2)", [id, JSON.stringify(snapshot({ ledger: [ledger()] }))]);
  });
  afterAll(() => pool.end());
  function input() { return { ...newCostJob("2026-11-07").data, title: "Test job", revenue: "whatnot" as const, orderIds: ["order-1"] }; }
  it("allows only one concurrent assignment and protects stale writes and retries", async () => {
    const results = await Promise.allSettled([saveCostJob(pool, randomUUID(), 0, input(), "staff"), saveCostJob(pool, randomUUID(), 0, input(), "staff")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const job = (await readCosts(pool)).jobs[0];
    await expect(saveCostJob(pool, job.id, 0, input(), "staff")).rejects.toMatchObject({ code: "conflict" });
    await saveCostJob(pool, job.id, 1, { ...input(), archived: true }, "staff");
    expect((await readCosts(pool)).jobs[0].revision).toBe(2);
    await expect(saveCostJob(pool, randomUUID(), 0, input(), "staff")).rejects.toMatchObject({ code: "order_link" });
    expect(Number((await pool.query("SELECT count(*) FROM whatnot_private.cost_job_history")).rows[0].count)).toBe(2);
  });
  it("rejects unknown orders and quantity mismatch without partial writes", async () => {
    for (const bad of [{ ...input(), units: 0 }, { ...input(), orderIds: ["missing"] }]) await expect(saveCostJob(pool, randomUUID(), 0, bad, "staff")).rejects.toMatchObject({ code: "order_link" });
    expect((await readCosts(pool)).jobs).toHaveLength(0);
  });
  it("stores partially sold batches and allocates rerun revenue without another physical unit", async () => {
    const partial = await saveCostJob(pool, randomUUID(), 0, { ...input(), units: 3, vaultUnits: 1, soldUnits: 1, soldAsOf: "2026-11-07", targetPrice: 2500 }, "staff");
    expect(partial.data).toMatchObject({ units: 3, vaultUnits: 1, soldUnits: 1 });
    await saveCostJob(pool, partial.id, 1, { ...partial.data, unitAllocations: [{ orderId: "order-1", units: 0, reason: "Buyer paid and donated this copy to be rerun" }] }, "staff");
    await expect(saveCostJob(pool, partial.id, 2, { ...partial.data, unitAllocations: [{ orderId: "order-1", units: 2, reason: "Invalid extra copy" }] }, "staff")).rejects.toMatchObject({ code: "order_link" });
  });
  it("reads old records with batch defaults", async () => {
    const job = await saveCostJob(pool, randomUUID(), 0, input(), "staff");
    await pool.query("UPDATE whatnot_private.cost_jobs SET data=data-'vaultUnits'-'targetPrice'-'soldUnits'-'soldAsOf'-'recordedGross'-'unitAllocations' WHERE id=$1", [job.id]);
    expect((await readCosts(pool)).jobs[0].data).toMatchObject({ vaultUnits: 0, targetPrice: null, soldUnits: null, recordedGross: null, unitAllocations: [] });
  });
  it("preserves the recipe snapshot and historical costs when references change", async () => {
    const csv = 'Inventory,Filament,Filament Used (g),Filament Cost ($/kg),Estimated Time (hrs),Hourly Machine Rate ($/hr),Number on Plate,Packaging Cost,"Post-processing Cost (Paint, Sand, etc.)",Total Cost (Per Print)\nExample,PLA,100,.025,2,.48,1,.5,0,3.96\n';
    const source = importCostReference(csv, "gram");
    await saveReferences(pool, source, 0, "staff");
    const draft = newCostJob("2026-11-07", source.rows[0], source.importedAt);
    const saved = await saveCostJob(pool, draft.id, 0, draft.data, "staff");
    await saveReferences(pool, { ...source, rows: source.rows.map(r => ({ ...r, kgCents: 9000 })) }, 1, "staff");
    const job = (await readCosts(pool)).jobs[0];
    expect(job.reference?.kgCents).toBe(2500); expect(job.data.materials[0].pricePerKg).toBe(2500);
    await expect(saveCostJob(pool, job.id, saved.revision, { ...job.data, referenceId: null }, "staff")).rejects.toMatchObject({ code: "invalid" });
    await expect(saveReferences(pool, source, 1, "staff")).rejects.toMatchObject({ code: "conflict" });
  });
});
