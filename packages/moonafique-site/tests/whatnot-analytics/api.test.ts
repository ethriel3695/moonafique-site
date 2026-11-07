import { describe, expect, it, vi } from "vitest";
import { WhatnotReports, type ProviderReport } from "../../lib/whatnot-analytics/api";
const id = "11111111-1111-4111-8111-111111111111";
const report: ProviderReport = { id, report_type: "seller_financial_report", status: "completed", report_parameters: {}, report_url: "https://seller-reports-prod.s3.amazonaws.com/test?signature=private", created_at: "2026-11-07T00:00:00Z", updated_at: "2026-11-07T00:00:00Z" };
describe("private Whatnot report client", () => {
  it("uses report-only writes and a bearer token only on the API origin", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(report)).mockResolvedValueOnce(new Response("csv"));
    const api = new WhatnotReports("fixture-token", fetcher);
    await api.generate("seller_financial_report", "start", "end");
    expect(fetcher.mock.calls[0][0]).toBe("https://api.whatnot.com/seller-api/rest/v2/reports");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ report_parameters: { report_type: "seller_financial_report", start_date: "start", end_date: "end" } });
    await expect(api.download(report)).resolves.toBe("csv");
    expect(fetcher.mock.calls[1][1]).not.toHaveProperty("headers");
    expect(fetcher.mock.calls[1][1].redirect).toBe("error");
  });
  it("refuses unrelated download origins, oversized files, wrong reports and seller accounts", async () => {
    const fetcher = vi.fn(); const api = new WhatnotReports("fixture", fetcher);
    await expect(api.download({ ...report, report_url: "https://evil.invalid/private" })).rejects.toMatchObject({ code: "download" });
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(new Response("bad", { headers: { "content-length": "25000001" } }));
    await expect(api.download(report)).rejects.toMatchObject({ code: "download" });
    fetcher.mockResolvedValueOnce(Response.json({ ...report, id: "22222222-2222-4222-8222-222222222222" }));
    await expect(api.report(id, report.report_type)).rejects.toMatchObject({ code: "response" });
    fetcher.mockResolvedValueOnce(Response.json({ id: "123", username: "unrelated", seller_currency: "USD" }));
    await expect(api.account()).rejects.toMatchObject({ code: "account" });
  });
  it("does not expose provider error bodies or signed download URLs", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("private-token-error", { status: 403 })).mockRejectedValueOnce(Error("private-signed-url"));
    const api = new WhatnotReports("fixture", fetcher);
    await expect(api.account()).rejects.toThrow("Whatnot analytics: authorization.");
    await expect(api.download(report)).rejects.toThrow("Whatnot analytics: download.");
  });
});
