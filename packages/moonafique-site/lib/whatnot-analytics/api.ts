import { z } from "zod";
import { reportTypes, type ReportType } from "./model";

const base = "https://api.whatnot.com/seller-api/rest/v2";
const reportSchema = z.object({
  id: z.uuid(), report_type: z.enum(reportTypes), status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]),
  report_parameters: z.record(z.string(), z.unknown()).nullable(), report_url: z.string().nullable(), created_at: z.iso.datetime(), updated_at: z.iso.datetime(),
});
export type ProviderReport = z.infer<typeof reportSchema>;
export class AnalyticsError extends Error {
  constructor(public readonly code: "configuration" | "authorization" | "account" | "connection" | "rate_limit" | "response" | "download" | "report_failed" | "busy" | "invalid_request") {
    super(`Whatnot analytics: ${code}.`);
    this.name = "AnalyticsError";
  }
}
export class WhatnotReports {
  constructor(private readonly token: string, private readonly fetcher: typeof fetch = fetch) {
    if (!token || /\s/.test(token)) throw new AnalyticsError("configuration");
  }
  private async request(path: string, body?: unknown): Promise<unknown> {
    try {
      const response = await this.fetcher(base + path, {
        method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 401 || response.status === 403) throw new AnalyticsError("authorization");
      if (response.status === 429) throw new AnalyticsError("rate_limit");
      if (!response.ok) throw new AnalyticsError("connection");
      return await response.json();
    } catch (error) { throw error instanceof AnalyticsError ? error : new AnalyticsError("connection"); }
  }
  async account() {
    const result = z.object({ id: z.string().regex(/^\d+$/), username: z.string(), seller_currency: z.string().regex(/^[A-Z]{3}$/) }).safeParse(await this.request("/users/me"));
    if (!result.success) throw new AnalyticsError("response");
    if (result.data.username.toLowerCase() !== "moonafique") throw new AnalyticsError("account");
    return { id: result.data.id, currency: result.data.seller_currency };
  }
  async generate(type: ReportType, start: string, end: string) {
    const parameters = type === "seller_financial_report" ? { report_type: type, start_date: start, end_date: end }
      : type === "analytics_overview_report" ? { report_type: type, start_at: start, end_at: end }
      : { report_type: type, all_matching: {} };
    return this.validate(await this.request("/reports", { report_parameters: parameters }), type);
  }
  async report(id: string, type: ReportType) {
    if (!z.uuid().safeParse(id).success) throw new AnalyticsError("invalid_request");
    const report = this.validate(await this.request(`/reports/${id}`), type);
    if (report.id !== id) throw new AnalyticsError("response");
    return report;
  }
  private validate(value: unknown, type: ReportType) {
    const result = reportSchema.safeParse(value);
    if (!result.success || result.data.report_type !== type) throw new AnalyticsError("response");
    if (["failed", "cancelled"].includes(result.data.status)) throw new AnalyticsError("report_failed");
    return result.data;
  }
  async download(report: ProviderReport): Promise<string> {
    if (report.status !== "completed" || !report.report_url) throw new AnalyticsError("download");
    try {
      const url = new URL(report.report_url);
      // Observed official report bucket. No bearer token goes to the download host.
      if (url.protocol !== "https:" || url.hostname !== "seller-reports-prod.s3.amazonaws.com" || url.port || url.username || url.password) throw new AnalyticsError("download");
      const response = await this.fetcher(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(25_000) });
      if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 25_000_000 || !response.body) throw new AnalyticsError("download");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 25_000_000) { await reader.cancel(); throw new AnalyticsError("download"); }
        chunks.push(value);
      }
      return Buffer.concat(chunks).toString("utf8");
    } catch (error) { throw error instanceof AnalyticsError ? error : new AnalyticsError("download"); }
  }
}
