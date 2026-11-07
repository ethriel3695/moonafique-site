import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatnotReports, type ProviderReport } from "../../lib/whatnot-analytics/api";
import { collectRefresh, migrateAnalytics, readAnalytics, seedRefresh, startRefresh } from "../../lib/whatnot-analytics/store";
import { reportTypes, type ReportType } from "../../lib/whatnot-analytics/model";
import { dailyCsv, end, financialCsv, seller, showsCsv, start } from "./fixtures";
const connection = process.env.WHATNOT_TEST_DATABASE_URL;
// Integration tests refuse a remote or non-test database.
if (connection) { const url = new URL(connection); if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/grim_test") throw Error("A disposable local grim_test database is required."); }
describe.skipIf(!connection)("atomic private report store", () => {
  const pool = new Pool({ connectionString: connection, max: 5 });
  const ids = Object.fromEntries(reportTypes.map((type, i) => [type, `${i + 1}1111111-1111-4111-8111-111111111111`])) as Record<ReportType, string>;
  const reports = Object.fromEntries(reportTypes.map(type => [type, { id: ids[type], report_type: type, status: "completed", report_url: "https://seller-reports-prod.s3.amazonaws.com/fixture", report_parameters: type === "seller_financial_report" ? { start_date: start, end_date: end } : type === "analytics_overview_report" ? { start_at: start, end_at: end } : { all_matching: {} }, created_at: end, updated_at: end }])) as unknown as Record<ReportType, ProviderReport>;
  const api = new WhatnotReports("fixture");
  beforeAll(async () => { await migrateAnalytics(pool); await migrateAnalytics(pool); });
  beforeEach(async () => {
    vi.restoreAllMocks(); await pool.query("TRUNCATE whatnot_private.snapshot,whatnot_private.refreshes");
    vi.spyOn(api, "account").mockResolvedValue({ id: seller, currency: "USD" });
    vi.spyOn(api, "generate").mockImplementation(async type => reports[type]);
    vi.spyOn(api, "report").mockImplementation(async (_id, type) => reports[type]);
    vi.spyOn(api, "download").mockImplementation(async report => report.report_type === "seller_financial_report" ? financialCsv() : report.report_type === "analytics_overview_report" ? dailyCsv : showsCsv);
  });
  afterAll(async () => { vi.restoreAllMocks(); await pool.end(); });
  it("imports all three reports atomically, records hashes, and makes seeding idempotent", async () => {
    expect((await seedRefresh(pool, api, ids))?.status).toBe("ready");
    const saved = await readAnalytics(pool);
    expect(saved.snapshot?.ledger[0].sales).toBe(1000); expect(saved.snapshot?.sources).toHaveLength(3);
    expect(JSON.stringify(saved)).not.toContain("amazonaws");
    await seedRefresh(pool, api, ids);
    expect((await pool.query("SELECT count(*)::int AS n FROM whatnot_private.refreshes")).rows[0].n).toBe(1);
  });
  it("only generates one report set for concurrent refresh requests", async () => {
    const jobs = await Promise.all([startRefresh(pool, api, "staff", new Date(end)), startRefresh(pool, api, "staff", new Date(end))]);
    expect(jobs[0].id).toBe(jobs[1].id); expect(api.generate).toHaveBeenCalledTimes(3);
    expect((await collectRefresh(pool, api, jobs[0].id))?.status).toBe("ready");
    expect((await collectRefresh(pool, api, jobs[0].id))?.status).toBe("ready");
    expect(api.download).toHaveBeenCalledTimes(3);
  });
  it("preserves the last successful snapshot when new reports fail validation", async () => {
    await seedRefresh(pool, api, ids); const saved = (await readAnalytics(pool)).snapshot;
    await pool.query("UPDATE whatnot_private.snapshot SET data=jsonb_set(data,'{importedAt}','\"2026-01-01T00:00:00.000Z\"')");
    const job = await startRefresh(pool, api, "staff", new Date(end));
    vi.mocked(api.download).mockResolvedValueOnce(financialCsv({ seller_id: "another-seller" }));
    await expect(collectRefresh(pool, api, job.id)).rejects.toMatchObject({ code: "response" });
    const after = await readAnalytics(pool);
    expect(after.snapshot?.ledger).toEqual(saved?.ledger); expect(after.refresh?.status).toBe("failed");
  });
  it("rejects reports for a different requested period", async () => {
    const job = await startRefresh(pool, api, "staff", new Date(end));
    vi.mocked(api.report).mockResolvedValueOnce({ ...reports.seller_financial_report, report_parameters: { start_date: "2025-01-01T00:00:00Z", end_date: end } });
    await expect(collectRefresh(pool, api, job.id)).rejects.toMatchObject({ code: "response" });
    expect((await readAnalytics(pool)).snapshot).toBeNull();
  });
  it("retains pending reports without replacing the saved snapshot", async () => {
    const job = await startRefresh(pool, api, "staff", new Date(end));
    vi.mocked(api.report).mockResolvedValueOnce({ ...reports.seller_financial_report, status: "in_progress" });
    expect((await collectRefresh(pool, api, job.id))?.status).toBe("pending");
    expect(api.download).not.toHaveBeenCalled(); expect((await readAnalytics(pool)).snapshot).toBeNull();
  });
});
