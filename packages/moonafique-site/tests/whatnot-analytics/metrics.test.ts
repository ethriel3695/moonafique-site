import { describe, expect, it } from "vitest";
import { parseCsv, exportCsv } from "../../lib/whatnot-analytics/csv";
import { cents, normalizeLedger, normalizeShows, timestamp } from "../../lib/whatnot-analytics/model";
import { buildDashboard, dashboardFilters, financialSummary, previousRange, shopDay, showSummary } from "../../lib/whatnot-analytics/metrics";
import { analyticsCsv } from "../../lib/whatnot-analytics/exports";
import { financialCsv, ledger, seller, show, showsCsv, snapshot } from "./fixtures";

describe("report validation and exports", () => {
  it("handles BOM, quoted commas, escaped quotes, multiline fields and CRLF", () => {
    expect(parseCsv('\uFEFFname,title\r\nA,"one, two\n""three"""\r\n')).toEqual([{ name: "A", title: 'one, two\n"three"' }]);
    expect(() => parseCsv('a,b\n1,"bad')).toThrow();
    expect(() => parseCsv('a,a\n1,2')).toThrow();
    expect(() => parseCsv('a,b\n1')).toThrow();
    expect(() => parseCsv('a,b\n', ["missing"])).toThrow();
  });
  it("requires account identity, unique transactions, and explicit fee fields", () => {
    expect(normalizeLedger(financialCsv(), seller)[0]).toMatchObject({ amount: 790, sales: 1000, coupon: -200, at: "2026-10-20T19:00:00.123Z" });
    expect(() => normalizeLedger(financialCsv(), "different-account")).toThrow();
    expect(() => normalizeLedger(financialCsv() + financialCsv().split("\r\n")[1] + "\r\n", seller)).toThrow();
    expect(() => normalizeLedger(financialCsv({ processing_fee: "" }), seller)).toThrow();
    expect(() => normalizeLedger(financialCsv({ transaction_amount: "not a number" }), seller)).toThrow();
  });
  it("normalizes UTC microseconds and signed major currency values", () => {
    expect(timestamp("2026-11-01 07:30:00.123456")).toBe("2026-11-01T07:30:00.123Z");
    expect(cents("-12.34")).toBe(-1234); expect(cents("")).toBeNull();
    expect(normalizeShows(showsCsv)[0].giveawaySpend).toBe(-100);
  });
  it("escapes formulas in text while preserving negative numeric amounts", () => {
    const csv = exportCsv(["name", "amount"], [{ name: '=HYPERLINK("bad")', amount: -123.45 }, { name: " \t+SUM(1,2)", amount: 2 }]);
    expect(parseCsv(csv)).toEqual([{ name: '\'=HYPERLINK("bad")', amount: "-123.45" }, { name: "' \t+SUM(1,2)", amount: "2" }]);
    const s = snapshot({ ledger: [ledger({ title: "=formula" })] });
    const records = parseCsv(analyticsCsv(s, dashboardFilters({}, s, new Date(s.end)), "ledger"));
    expect(Object.values(records[0])).toContain("'=formula");
  });
});
describe("financial meaning", () => {
  it("uses line prices once, preserves signed adjustments, and never double-deducts fees", () => {
    const totals = financialSummary([ledger({ quantity: 5, unitCost: 20 }), ledger({ id: "tip", type: "TIP", amount: 100 }), ledger({ id: "refund", type: "REFUND", amount: -200 }), ledger({ id: "free", orderId: "free", sales: 0, amount: -100, shipping: 100, commission: 0, processing: 0, unitCost: 10 })]);
    expect(totals).toMatchObject({ sales: 1000, net: 590, fees: 110, shipping: 200, orders: 1, units: 5, zeroPriceOrders: 1, zeroPriceShipping: 100, tips: 100, other: -200, refunds: -200, reconciliationGap: 0, knownCosts: 110, contribution: 480 });
    expect(financialSummary([ledger()]).contribution).toBeNull();
    expect(financialSummary([]).averageOrder).toBeNull();
  });
  it("keeps currencies separate and identifies returning buyers from earlier history", () => {
    const s = snapshot({ ledger: [ledger(), ledger({ id: "earlier", at: "2026-09-01T18:00:00Z", orderAt: "2026-09-01T18:00:00Z" }), ledger({ id: "foreign", currency: "EUR", amount: 999999 })] });
    const data = buildDashboard(s, dashboardFilters({}, s, new Date(s.end)));
    expect(data.totals.sales).toBe(1000); expect(data.totals.net).toBe(790);
    expect(data.returning).toBe(1); expect(data.buyers).toHaveLength(1);
    expect(data.currencies).toEqual(["EUR", "USD"]);
  });
  it("uses complete Mountain days across DST and equal-length preceding windows", () => {
    const s = snapshot(); const filters = dashboardFilters({}, s, new Date(s.end));
    expect(filters).toMatchObject({ start: "2026-10-10", end: "2026-11-06" });
    expect(previousRange(filters)).toEqual({ start: "2026-09-12", end: "2026-10-09" });
    expect(shopDay("2026-11-01T06:30:00Z")).toBe("2026-11-01");
    const partial = dashboardFilters({ range: "custom", start: "2026-11-06", end: "2026-11-07" }, s, new Date(s.end));
    expect(buildDashboard(s, partial).canCompare).toBe(false);
    const invalid = dashboardFilters({ range: "custom", start: "2026-02-30", end: "2026-03-10", currency: "BAD", page: "-8" }, s, new Date(s.end));
    expect(invalid).toMatchObject({ start: "2026-10-10", currency: "USD", page: 1 });
  });
  it("weights show earnings by time, retains giveaway sign, and does not claim unique buyers", () => {
    const summary = showSummary([show(), show({ minutes: 120, earnings: 2000 }), show({ minutes: null, earnings: null })]);
    expect(summary).toMatchObject({ measured: 2, missing: 1, earningsPerHour: 930, giveawaySpend: -200, buyerAppearances: 2, peak: 5 });
  });
});
