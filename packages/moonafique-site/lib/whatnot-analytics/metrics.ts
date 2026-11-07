import { z } from "zod";
import { productKey, type AnalyticsSnapshot, type LedgerRow, type ShowRow } from "./model";

export const zone = "America/Boise";
export const shopDay = (at: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
export const shiftDay = (day: string, count: number) => new Date(Date.parse(day + "T12:00:00Z") + count * 86_400_000).toISOString().slice(0, 10);
export const money = (amount: number | null, currency = "USD") => amount === null ? "Not available" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
export const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
export const ratio = (a: number, b: number) => b > 0 ? a / b : null;
export type DateRange = { start: string; end: string };
export type DashboardFilters = DateRange & { range: string; view: "overview" | "shows" | "products" | "records"; currency: string; search: string; page: number };
export function dashboardFilters(params: Record<string, string | string[] | undefined>, snapshot: AnalyticsSnapshot, now = new Date()): DashboardFilters {
  const availableEnd = shiftDay(shopDay(snapshot.end), -1);
  const yesterday = shiftDay(shopDay(now), -1);
  const end = availableEnd < yesterday ? availableEnd : yesterday;
  const option = typeof params.range === "string" && ["28d", "month", "ytd", "all", "custom"].includes(params.range) ? params.range : "28d";
  let window: DateRange = { start: shiftDay(end, -27), end };
  if (option === "ytd") window.start = end.slice(0, 4) + "-01-01";
  if (option === "all") window.start = snapshot.start.slice(0, 10);
  if (option === "month") {
    const last = shiftDay(shopDay(now).slice(0, 7) + "-01", -1);
    window = { start: last.slice(0, 7) + "-01", end: last };
  }
  if (option === "custom") {
    const start = z.iso.date().safeParse(params.start), finish = z.iso.date().safeParse(params.end);
    if (start.success && finish.success && start.data <= finish.data && start.data >= "2020-01-01" && finish.data <= shopDay(now)) window = { start: start.data, end: finish.data };
  }
  const currencies = currenciesIn(snapshot);
  return { ...window, range: option, view: params.view === "shows" || params.view === "products" || params.view === "records" ? params.view : "overview", currency: typeof params.currency === "string" && currencies.includes(params.currency) ? params.currency : snapshot.currency, search: typeof params.search === "string" ? params.search.slice(0, 100) : "", page: Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1))) };
}
export function currenciesIn(snapshot: AnalyticsSnapshot) { return [...new Set([snapshot.currency, ...snapshot.ledger.map(r => r.currency), ...snapshot.daily.map(r => r.currency), ...snapshot.shows.flatMap(r => r.currency ? [r.currency] : [])])].sort(); }
export const inRange = (day: string, range: DateRange) => day >= range.start && day <= range.end;
export function previousRange(range: DateRange): DateRange {
  const days = Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86_400_000) + 1;
  return { start: shiftDay(range.start, -days), end: shiftDay(range.start, -1) };
}
export function covered(snapshot: AnalyticsSnapshot, range: DateRange) { return range.start >= snapshot.start.slice(0, 10) && range.end <= shiftDay(shopDay(snapshot.end), -1); }
const sum = <T>(rows: T[], value: (row: T) => number | null) => rows.reduce((total, row) => total + (value(row) ?? 0), 0);
const countIds = (rows: LedgerRow[]) => new Set(rows.map(row => row.orderId).filter(Boolean)).size;
export const feeTotal = (row: LedgerRow) => (row.commission ?? 0) + (row.commissionTax ?? 0) + (row.processing ?? 0) + (row.processingTax ?? 0);
export function financialSummary(rows: LedgerRow[]) {
  const earnings = rows.filter(row => row.type === "ORDER_EARNINGS");
  const paid = earnings.filter(row => (row.sales ?? 0) > 0);
  const zeroPrice = earnings.filter(row => row.sales === 0);
  const sales = sum(earnings, row => row.sales), net = sum(rows, row => row.amount);
  const orders = countIds(paid), fees = sum(earnings, feeTotal);
  const knownCostRows = earnings.filter(row => row.unitCost !== null && row.unitCost > 0);
  const knownCosts = sum(knownCostRows, row => row.unitCost! * row.quantity);
  const low = paid.filter(row => (row.sales ?? 0) < 500);
  const refunds = rows.filter(row => /REFUND/.test(row.type));
  const reconciliationGap = sum(earnings, row => (row.sales ?? 0) - feeTotal(row) - (row.shipping ?? 0) - row.amount);
  return { sales, net, fees, orders, units: sum(paid, row => row.quantity), averageOrder: orders ? Math.round(sales / orders) : null,
    commission: sum(earnings, row => (row.commission ?? 0) + (row.commissionTax ?? 0)), processing: sum(earnings, row => (row.processing ?? 0) + (row.processingTax ?? 0)),
    shipping: sum(earnings, row => row.shipping), coupons: sum(earnings, row => row.coupon), tips: sum(rows.filter(row => row.type === "TIP"), row => row.amount),
    other: sum(rows.filter(row => row.type !== "ORDER_EARNINGS" && row.type !== "TIP"), row => row.amount), refunds: sum(refunds, row => row.amount), refundTransactions: refunds.length,
    zeroPriceOrders: countIds(zeroPrice), zeroPriceShipping: sum(zeroPrice, row => row.shipping), knownCosts, costCoverage: ratio(knownCostRows.length, earnings.length),
    // A zero recorded cost is not evidence that a physical product was free.
    contribution: earnings.length && knownCostRows.length === earnings.length ? net - knownCosts : null,
    skuCoverage: ratio(earnings.filter(row => row.sku).length, earnings.length), reconciliationGap,
    lowPrice: { orders: countIds(low), sales: sum(low, row => row.sales), fees: sum(low, feeTotal), earnings: sum(low, row => row.amount) },
  };
}
export function showSeries(title: string) {
  if (/print[\s-]*wars/i.test(title)) return "Print Wars";
  if (/grimm?[\s-]*fest/i.test(title)) return "Grimmfest";
  if (/\baceos?\b|art cards?/i.test(title)) return "Art / ACEO";
  return "Other shows";
}
export function showSummary(shows: ShowRow[]) {
  const measured = shows.filter(row => row.sales !== null && row.earnings !== null && row.minutes !== null && row.minutes > 0);
  const minutes = sum(measured, row => row.minutes), earnings = sum(measured, row => row.earnings);
  return { measured: measured.length, missing: shows.length - measured.length, minutes, sales: sum(measured, row => row.sales), earnings,
    earningsPerHour: minutes ? Math.round(earnings / (minutes / 60)) : null,
    giveawaySpend: sum(measured, row => row.giveawaySpend), giveawayOrders: sum(measured, row => row.giveawayOrders),
    // These are appearances across shows, not deduplicated people.
    buyerAppearances: sum(measured, row => row.buyers), newBuyerAppearances: sum(measured, row => row.newBuyers), returningBuyerAppearances: sum(measured, row => row.returningBuyers),
    peak: measured.length ? Math.max(...measured.map(row => row.peak ?? 0)) : null };
}
export function buildDashboard(snapshot: AnalyticsSnapshot, filters: DashboardFilters) {
  const previous = previousRange(filters);
  const allLedger = snapshot.ledger.filter(row => row.currency === filters.currency);
  const ledger = allLedger.filter(row => inRange(shopDay(row.at), filters)).sort((a, b) => b.at.localeCompare(a.at));
  const priorLedger = allLedger.filter(row => inRange(shopDay(row.at), previous));
  const totals = financialSummary(ledger), prior = financialSummary(priorLedger);
  const shows = snapshot.shows.filter(row => (row.currency === filters.currency || (!row.currency && filters.currency === snapshot.currency)) && inRange(shopDay(row.start), filters)).sort((a, b) => b.start.localeCompare(a.start));
  const showTotals = showSummary(shows);
  const daily = snapshot.daily.filter(row => row.currency === filters.currency && inRange(row.day, filters));
  const canCompare = covered(snapshot, filters) && covered(snapshot, previous);
  const delta = (current: number, old: number) => canCompare && old > 0 ? (current - old) / old : null;
  const months = new Map<string, { month: string; sales: number; net: number }>();
  for (const row of ledger) {
    const key = shopDay(row.at).slice(0, 7), month = months.get(key) ?? { month: key, sales: 0, net: 0 };
    if (row.type === "ORDER_EARNINGS") month.sales += row.sales ?? 0;
    month.net += row.amount; months.set(key, month);
  }
  const products = new Map<string, { key: string; title: string; sku: string; rows: LedgerRow[] }>();
  for (const row of ledger.filter(row => row.type === "ORDER_EARNINGS")) {
    const key = productKey(row), product = products.get(key) ?? { key, title: row.title || "Untitled listing", sku: row.sku, rows: [] };
    product.rows.push(row); products.set(key, product);
  }
  const productRows = [...products.values()].map(product => ({ ...product, rows: undefined, totals: financialSummary(product.rows), quantity: sum(product.rows, row => row.quantity) })).sort((a, b) => b.totals.sales - a.totals.sales);
  const firstPurchase = new Map<string, string>();
  for (const row of allLedger.filter(row => row.type === "ORDER_EARNINGS" && (row.sales ?? 0) > 0 && row.buyer)) {
    const at = row.orderAt ?? row.at;
    if (!firstPurchase.has(row.buyer) || at < firstPurchase.get(row.buyer)!) firstPurchase.set(row.buyer, at);
  }
  const buyers = new Map<string, { name: string; orders: Set<string>; sales: number; firstPurchase: string }>();
  for (const row of ledger.filter(row => row.type === "ORDER_EARNINGS" && (row.sales ?? 0) > 0 && row.buyer)) {
    const buyer = buyers.get(row.buyer) ?? { name: row.buyer, orders: new Set<string>(), sales: 0, firstPurchase: firstPurchase.get(row.buyer)! };
    buyer.orders.add(row.orderId); buyer.sales += row.sales ?? 0; buyers.set(row.buyer, buyer);
  }
  const buyerRows = [...buyers.values()].map(buyer => ({ ...buyer, orders: buyer.orders.size, returning: shopDay(buyer.firstPurchase) < filters.start })).sort((a, b) => b.sales - a.sales);
  const returning = buyerRows.filter(buyer => buyer.returning).length;
  const concentration = ratio(sum(buyerRows.slice(0, 5), buyer => buyer.sales), totals.sales);
  const series = [...new Set(shows.map(show => showSeries(show.title)))].map(name => ({ name, ...showSummary(shows.filter(show => showSeries(show.title) === name)) })).sort((a, b) => b.earnings - a.earnings);
  const insights: { title: string; body: string; tone: "neutral" | "attention" }[] = [];
  const change = delta(totals.sales, prior.sales);
  if (change !== null) insights.push({ title: `Settled sales are ${change >= 0 ? "up" : "down"} ${percent(Math.abs(change))}`, body: `${money(totals.sales, filters.currency)} versus ${money(prior.sales, filters.currency)} in the preceding equal-length period. This compares transaction completion dates, not bank deposits.`, tone: change < 0 ? "attention" : "neutral" });
  if (totals.sales > 0) insights.push({ title: "What it costs to sell", body: `Platform fees were ${money(totals.fees, filters.currency)} (${percent(ratio(totals.fees, totals.sales))} of settled item sales). Seller-paid shipping on those orders added ${money(totals.shipping, filters.currency)}. Both are already deducted from ledger earnings.`, tone: "neutral" });
  if (totals.lowPrice.orders >= 5) insights.push({ title: "Check the economics of small sales", body: `${totals.lowPrice.orders} paid orders below ${money(500, filters.currency)} generated ${money(totals.lowPrice.sales, filters.currency)} in item sales, with ${percent(ratio(totals.lowPrice.fees, totals.lowPrice.sales))} going to platform fees before shipping or product costs. Test bundles against single-item starts.`, tone: "attention" });
  if (totals.zeroPriceOrders) insights.push({ title: "Giveaways have a cash cost", body: `${totals.zeroPriceOrders} zero-price orders carried ${money(totals.zeroPriceShipping, filters.currency)} of seller-paid shipping. These can include giveaways and fully discounted orders. Compare that spend with new paid buyers; it does not prove giveaway ROI.`, tone: "attention" });
  if (totals.contribution === null) insights.push({ title: "Profit is not established yet", body: `Only ${percent(totals.costCoverage)} of order-earnings rows have a positive recorded product cost. Materials, printing, painting time, packaging, and overhead still need to be accounted for. Net Whatnot activity is not profit.`, tone: "attention" });
  if (showTotals.earningsPerHour !== null) insights.push({ title: "Value of time on air", body: `Reported show earnings average ${money(showTotals.earningsPerHour, filters.currency)} per live hour across ${showTotals.measured} shows. Preparation, making, packing, and product costs are not included.`, tone: "neutral" });
  if (buyerRows.length) insights.push({ title: "Customer concentration", body: `Your five largest buyers account for ${percent(concentration)} of settled item sales in this period. ${returning} of ${buyerRows.length} identified paid buyers had a purchase before the period in the imported history.`, tone: concentration !== null && concentration > .4 ? "attention" : "neutral" });
  return { ledger, totals, previous, prior, canCompare, salesChange: change, netChange: delta(totals.net, prior.net), months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)), shows, showTotals, series, daily, products: productRows, buyers: buyerRows, returning, concentration, insights,
    channel: { live: sum(daily, row => row.liveSales), marketplace: sum(daily, row => row.marketplaceSales), follows: sum(daily, row => row.follows) },
    currencies: currenciesIn(snapshot), complete: covered(snapshot, filters), missingBuyerRows: ledger.filter(row => row.type === "ORDER_EARNINGS" && (row.sales ?? 0) > 0 && !row.buyer).length };
}
export type DashboardData = ReturnType<typeof buildDashboard>;
