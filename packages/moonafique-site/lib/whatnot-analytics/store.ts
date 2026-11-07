import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { transaction } from "../grimmunity/db";
import { AnalyticsError, WhatnotReports } from "./api";
import { normalizeDaily, normalizeLedger, normalizeShows, reportTypes, type AnalyticsSnapshot, type ReportType, type ReportSource } from "./model";

export type Refresh = { id: string; status: "requesting" | "pending" | "ready" | "failed"; seller_id: string; currency: string; coverage_start: Date; coverage_end: Date; requested_at: Date; finished_at: Date | null; report_ids: Partial<Record<ReportType, string>>; error_code: string | null };
export async function migrateAnalytics(pool: Pool) {
  const migrations = await Promise.all(["001_private_reports.sql", "002_job_costs.sql"].map(file => readFile(path.join(process.cwd(), "db/whatnot-analytics", file), "utf8")));
  await transaction(pool, async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('whatnot:analytics-migration'))");
    await db.query("CREATE SCHEMA IF NOT EXISTS whatnot_private");
    await db.query("CREATE TABLE IF NOT EXISTS whatnot_private.schema_migrations(version integer PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())");
    for (const [index, sql] of migrations.entries()) {
      const version = index + 1;
      const checksum = createHash("sha256").update(sql).digest("hex");
      const applied = (await db.query<{ checksum: string }>("SELECT checksum FROM whatnot_private.schema_migrations WHERE version=$1", [version])).rows[0];
      if (applied && applied.checksum !== checksum) throw Error("Analytics migration checksum changed.");
      if (!applied) { await db.query(sql); await db.query("INSERT INTO whatnot_private.schema_migrations(version,checksum) VALUES($1,$2)", [version, checksum]); }
    }
  });
}
export async function readAnalytics(pool: Pool) {
  const [snapshot, refresh] = await Promise.all([
    pool.query<{ data: AnalyticsSnapshot }>("SELECT data FROM whatnot_private.snapshot WHERE singleton=true"),
    pool.query<Refresh>("SELECT * FROM whatnot_private.refreshes ORDER BY requested_at DESC LIMIT 1"),
  ]);
  return { snapshot: snapshot.rows[0]?.data ?? null, refresh: refresh.rows[0] ?? null };
}
export function publicRefresh(refresh: Refresh | null) {
  return refresh ? { id: refresh.id, status: refresh.status, requestedAt: refresh.requested_at.toISOString(), errorCode: refresh.error_code, reportsRequested: Object.keys(refresh.report_ids).length } : null;
}

export async function startRefresh(pool: Pool, api: WhatnotReports, staffId: string, now = new Date()) {
  const account = await api.account();
  const claimed = await transaction(pool, async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('whatnot:analytics-refresh'))");
    // A stopped browser can resume report collection for two hours. An old
    // generation failure cannot keep the only active slot locked indefinitely.
    await db.query("UPDATE whatnot_private.refreshes SET status='failed',error_code='expired',finished_at=now(),lease_id=null,lease_until=null WHERE status IN ('requesting','pending') AND requested_at < now()-interval '2 hours'");
    const active = (await db.query<Refresh>("SELECT * FROM whatnot_private.refreshes WHERE status IN ('requesting','pending') LIMIT 1")).rows[0];
    if (active) return { refresh: active, lease: null };
    const saved = (await db.query<{ data: AnalyticsSnapshot }>("SELECT data FROM whatnot_private.snapshot WHERE singleton=true")).rows[0]?.data;
    if (saved && saved.sellerId !== account.id) throw new AnalyticsError("account");
    if (saved && now.getTime() - Date.parse(saved.importedAt) < 120_000) {
      const recent = (await db.query<Refresh>("SELECT * FROM whatnot_private.refreshes WHERE status='ready' ORDER BY requested_at DESC LIMIT 1")).rows[0];
      if (recent) return { refresh: recent, lease: null };
    }
    const id = randomUUID(), lease = randomUUID();
    const refresh = (await db.query<Refresh>(`INSERT INTO whatnot_private.refreshes(id,status,seller_id,currency,coverage_start,coverage_end,requested_by,lease_id,lease_until)
      VALUES($1,'requesting',$2,$3,$4,$5,$6,$7,now()+interval '90 seconds') RETURNING *`, [id, account.id, account.currency, saved?.start ?? "2026-01-01T00:00:00.000Z", now, staffId, lease])).rows[0];
    return { refresh, lease };
  });
  if (!claimed.lease) return claimed.refresh;
  return requestReports(pool, api, claimed.refresh, claimed.lease);
}
async function requestReports(pool: Pool, api: WhatnotReports, refresh: Refresh, lease: string) {
  try {
    const ids = { ...refresh.report_ids };
    for (const type of reportTypes) {
      if (ids[type]) continue;
      const report = await api.generate(type, refresh.coverage_start.toISOString(), refresh.coverage_end.toISOString());
      ids[type] = report.id;
      const result = await pool.query("UPDATE whatnot_private.refreshes SET report_ids=$1 WHERE id=$2 AND lease_id=$3", [JSON.stringify(ids), refresh.id, lease]);
      if (!result.rowCount) throw new AnalyticsError("busy");
    }
    return (await pool.query<Refresh>("UPDATE whatnot_private.refreshes SET status='pending',lease_id=null,lease_until=null WHERE id=$1 AND lease_id=$2 RETURNING *", [refresh.id, lease])).rows[0];
  } catch (error) { await failRefresh(pool, refresh.id, lease, error); throw safeError(error); }
}
function safeError(error: unknown) { return error instanceof AnalyticsError ? error : new AnalyticsError("response"); }
async function failRefresh(pool: Pool, id: string, lease: string, error: unknown) {
  await pool.query("UPDATE whatnot_private.refreshes SET status='failed',finished_at=now(),error_code=$1,lease_id=null,lease_until=null WHERE id=$2 AND lease_id=$3", [safeError(error).code, id, lease]);
}
export async function collectRefresh(pool: Pool, api: WhatnotReports, id: string) {
  const lease = randomUUID();
  const refresh = (await pool.query<Refresh>(`UPDATE whatnot_private.refreshes SET lease_id=$2,lease_until=now()+interval '90 seconds'
    WHERE id=$1 AND status IN ('pending','requesting') AND (lease_until IS NULL OR lease_until < now()) RETURNING *`, [id, lease])).rows[0];
  if (!refresh) return (await pool.query<Refresh>("SELECT * FROM whatnot_private.refreshes WHERE id=$1", [id])).rows[0] ?? null;
  if (refresh.status === "requesting") return requestReports(pool, api, refresh, lease);
  try {
    const account = await api.account();
    if (account.id !== refresh.seller_id) throw new AnalyticsError("account");
    const reports = await Promise.all(reportTypes.map(type => api.report(refresh.report_ids[type]!, type)));
    if (reports.some(report => report.status !== "completed")) {
      return (await pool.query<Refresh>("UPDATE whatnot_private.refreshes SET lease_id=null,lease_until=null WHERE id=$1 AND lease_id=$2 RETURNING *", [id, lease])).rows[0];
    }
    const csvs = await Promise.all(reports.map(report => api.download(report)));
    const start = refresh.coverage_start.toISOString(), end = refresh.coverage_end.toISOString();
    for (const report of reports.filter(report => report.report_type !== "analytics_livestreams_report")) {
      const params = report.report_parameters;
      const from = params?.start_date ?? params?.start_at, to = params?.end_date ?? params?.end_at;
      if (typeof from !== "string" || typeof to !== "string" || Date.parse(from) !== Date.parse(start) || Date.parse(to) !== Date.parse(end)) throw new AnalyticsError("response");
    }
    const ledger = normalizeLedger(csvs[0], account.id), daily = normalizeDaily(csvs[1]), shows = normalizeShows(csvs[2]);
    if (ledger.some(row => row.at < start || row.at >= end)) throw new AnalyticsError("response");
    const counts = [ledger.length, daily.length, shows.length];
    const sources: ReportSource[] = reports.map((report, i) => ({ id: report.id, type: report.report_type, generatedAt: report.updated_at, rowCount: counts[i], sha256: createHash("sha256").update(csvs[i]).digest("hex") }));
    const snapshot: AnalyticsSnapshot = { sellerId: account.id, currency: account.currency, start, end, importedAt: new Date().toISOString(), ledger, daily, shows, sources };
    await transaction(pool, async db => {
      const locked = await db.query("SELECT id FROM whatnot_private.refreshes WHERE id=$1 AND lease_id=$2 FOR UPDATE", [id, lease]);
      if (!locked.rowCount) throw new AnalyticsError("busy");
      await db.query("INSERT INTO whatnot_private.snapshot(singleton,refresh_id,data) VALUES(true,$1,$2) ON CONFLICT(singleton) DO UPDATE SET refresh_id=excluded.refresh_id,data=excluded.data,updated_at=now()", [id, JSON.stringify(snapshot)]);
      await db.query("UPDATE whatnot_private.refreshes SET status='ready',finished_at=now(),lease_id=null,lease_until=null,error_code=null WHERE id=$1", [id]);
    });
    return (await pool.query<Refresh>("SELECT * FROM whatnot_private.refreshes WHERE id=$1", [id])).rows[0];
  } catch (error) { await failRefresh(pool, id, lease, error); throw safeError(error); }
}

// Deployment bootstrap may reuse reports already generated in the authorized
// setup session. The normal collection path still verifies account and ranges.
export async function seedRefresh(pool: Pool, api: WhatnotReports, ids: Record<ReportType, string>) {
  const account = await api.account();
  const reports = await Promise.all(reportTypes.map(type => api.report(ids[type], type)));
  const start = reports[0].report_parameters?.start_date, end = reports[0].report_parameters?.end_date;
  if (typeof start !== "string" || typeof end !== "string") throw new AnalyticsError("response");
  const existing = await readAnalytics(pool);
  if (existing.snapshot) return existing.refresh;
  const id = await transaction(pool, async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('whatnot:analytics-refresh'))");
    const active = (await db.query<Refresh>("SELECT * FROM whatnot_private.refreshes WHERE status IN ('requesting','pending') LIMIT 1")).rows[0];
    if (active) {
      if (active.seller_id !== account.id) throw new AnalyticsError("account");
      return active.id;
    }
    const id = randomUUID();
    await db.query("INSERT INTO whatnot_private.refreshes(id,status,seller_id,currency,coverage_start,coverage_end,requested_by,report_ids) VALUES($1,'pending',$2,$3,$4,$5,'initial-setup',$6)", [id, account.id, account.currency, start, end, JSON.stringify(ids)]);
    return id;
  });
  return collectRefresh(pool, api, id);
}
