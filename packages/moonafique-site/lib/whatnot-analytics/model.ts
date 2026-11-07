import { createHash } from "node:crypto";
import { z } from "zod";
import { parseCsv } from "./csv";

export const reportTypes = ["seller_financial_report", "analytics_overview_report", "analytics_livestreams_report"] as const;
export type ReportType = (typeof reportTypes)[number];
export type LedgerRow = {
  id: string; at: string; orderAt: string | null; type: string; orderId: string; title: string; sku: string;
  category: string; format: string; quantity: number; unitCost: number | null; showId: string; showTitle: string;
  buyer: string; state: string; country: string; shipmentId: string; currency: string; amount: number; buyerPaid: number | null;
  originalPrice: number | null; coupon: number | null; sales: number | null; shipping: number | null;
  commission: number | null; commissionTax: number | null; processing: number | null; processingTax: number | null;
};
export type DailyRow = { day: string; currency: string; sales: number | null; earnings: number | null; liveSales: number | null; marketplaceSales: number | null; orders: number | null; buyers: number | null; newBuyers: number | null; returningBuyers: number | null; follows: number | null; shows: number | null; minutes: number | null };
export type ShowRow = { id: string; title: string; start: string; currency: string | null; sales: number | null; earnings: number | null; orders: number | null; buyers: number | null; newBuyers: number | null; returningBuyers: number | null; viewers: number | null; peak: number | null; impressions: number | null; ctr: number | null; minutes: number | null; giveawayOrders: number | null; giveawaySpend: number | null; rating: number | null };
export type ReportSource = { id: string; type: ReportType; rowCount: number; sha256: string; generatedAt: string };
export type AnalyticsSnapshot = { sellerId: string; currency: string; start: string; end: string; importedAt: string; ledger: LedgerRow[]; daily: DailyRow[]; shows: ShowRow[]; sources: ReportSource[] };

export function timestamp(value: string): string {
  // Whatnot CSVs use UTC timestamps without a suffix, sometimes with microseconds.
  let normalized = value.trim().replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?$/.test(normalized)) throw Error("invalid_timestamp");
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(normalized)) normalized += "Z";
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) throw Error("invalid_timestamp");
  return date.toISOString();
}
export function cents(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^-?\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw Error("invalid_amount");
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > 100_000_000_000) throw Error("invalid_amount");
  return amount;
}
function count(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000) throw Error("invalid_count");
  return n;
}
function numeric(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw Error("invalid_number");
  return n;
}
function required(row: Record<string, string>, keys: string[]) {
  if (keys.some(key => !(key in row))) throw Error("missing_report_columns");
}
const currency = (value: string) => z.string().regex(/^[A-Z]{3}$/).parse(value);
const text = (value: string, max = 2000) => z.string().max(max).parse(value);

export function normalizeLedger(csv: string, sellerId: string): LedgerRow[] {
  const ids = new Set<string>();
  return parseCsv(csv, ["ledger_transaction_id", "seller_id", "transaction_completed_at_utc", "transaction_type", "transaction_currency", "transaction_amount", "order_id", "post_coupon_price", "quantity_sold", "cost_of_goods", "seller_shipping_charge", "commission_fee", "commission_tax", "processing_fee", "processing_fee_tax"]).map(row => {
    required(row, ["ledger_transaction_id", "seller_id", "transaction_completed_at_utc", "transaction_type", "transaction_currency", "transaction_amount", "order_id", "post_coupon_price", "quantity_sold", "cost_of_goods", "seller_shipping_charge", "commission_fee", "processing_fee"]);
    if (row.seller_id !== sellerId || !row.ledger_transaction_id || ids.has(row.ledger_transaction_id)) throw Error("invalid_ledger_identity");
    ids.add(row.ledger_transaction_id);
    const amount = cents(row.transaction_amount);
    if (amount === null) throw Error("missing_transaction_amount");
    const result: LedgerRow = {
      id: text(row.ledger_transaction_id, 100), at: timestamp(row.transaction_completed_at_utc), orderAt: row.order_placed_at_utc ? timestamp(row.order_placed_at_utc) : null,
      type: text(row.transaction_type, 100), orderId: text(row.order_id, 100), title: text(row.listing_title ?? ""), sku: text(row.sku ?? "", 255),
      category: text(row.product_category ?? ""), format: text(row.buy_format ?? "", 100), quantity: count(row.quantity_sold) ?? 0, unitCost: cents(row.cost_of_goods),
      showId: text(row.livestream_id ?? "", 100), showTitle: text(row.livestream_title ?? ""), buyer: text(row.buyer_name ?? "", 200),
      state: text(row.buyer_state ?? "", 200), country: text(row.buyer_country ?? "", 100), shipmentId: text(row.shipment_id ?? "", 100), currency: currency(row.transaction_currency), amount,
      buyerPaid: cents(row.buyer_paid ?? ""), originalPrice: cents(row.original_item_price ?? ""), coupon: cents(row.coupon_cost ?? ""), sales: cents(row.post_coupon_price),
      shipping: cents(row.seller_shipping_charge), commission: cents(row.commission_fee), commissionTax: cents(row.commission_tax ?? ""), processing: cents(row.processing_fee), processingTax: cents(row.processing_fee_tax ?? ""),
    };
    if (result.type === "ORDER_EARNINGS" && (result.sales === null || result.quantity < 1 || !result.orderId)) throw Error("invalid_order_earnings");
    if (result.type === "ORDER_EARNINGS" && [result.shipping, result.commission, result.commissionTax, result.processing, result.processingTax].some(value => value === null)) throw Error("missing_order_fees");
    return result;
  });
}
export function normalizeDaily(csv: string): DailyRow[] {
  const ids = new Set<string>();
  return parseCsv(csv, ["date", "currency", "estimated_sales", "estimated_earnings", "orders_count", "in_show_estimated_sales", "marketplace_estimated_sales"]).map(row => {
    required(row, ["date", "currency", "estimated_sales", "estimated_earnings", "orders_count", "in_show_estimated_sales", "marketplace_estimated_sales"]);
    const day = z.iso.date().parse(row.date), code = currency(row.currency);
    const key = day + code; if (ids.has(key)) throw Error("duplicate_daily_row"); ids.add(key);
    return { day, currency: code, sales: cents(row.estimated_sales), earnings: cents(row.estimated_earnings), liveSales: cents(row.in_show_estimated_sales), marketplaceSales: cents(row.marketplace_estimated_sales), orders: count(row.orders_count), buyers: count(row.buyers_count ?? ""), newBuyers: count(row.new_buyers_count ?? ""), returningBuyers: count(row.returning_buyers_count ?? ""), follows: count(row.follows_count ?? ""), shows: count(row.livestreams_count ?? ""), minutes: count(row.stream_minutes ?? "") };
  });
}
export function normalizeShows(csv: string): ShowRow[] {
  const ids = new Set<string>();
  return parseCsv(csv, ["livestream_id", "livestream_title", "start_time", "currency", "sales", "estimated_earnings", "orders_count", "stream_minutes", "giveaway_spend"]).map(row => {
    required(row, ["livestream_id", "livestream_title", "start_time", "currency", "sales", "estimated_earnings", "orders_count", "stream_minutes", "giveaway_spend"]);
    const id = z.uuid().parse(row.livestream_id); if (ids.has(id)) throw Error("duplicate_show_row"); ids.add(id);
    return { id, title: text(row.livestream_title), start: timestamp(row.start_time), currency: row.currency ? currency(row.currency) : null,
      sales: cents(row.sales), earnings: cents(row.estimated_earnings), orders: count(row.orders_count), buyers: count(row.buyers_count ?? ""), newBuyers: count(row.first_time_buyers_count ?? ""), returningBuyers: count(row.returning_buyers_count ?? ""), viewers: count(row.distinct_viewers_count ?? ""), peak: count(row.max_concurrent_viewers ?? ""), impressions: count(row.livestream_impression_count ?? ""), ctr: numeric(row.livestream_clickthrough_rate ?? ""), minutes: count(row.stream_minutes), giveawayOrders: count(row.giveaway_orders_count ?? ""), giveawaySpend: cents(row.giveaway_spend), rating: numeric(row.average_rating ?? "") };
  });
}
export function productKey(row: Pick<LedgerRow, "sku" | "title" | "currency">) {
  return createHash("sha256").update(`${row.currency}:${row.sku ? "sku:" + row.sku : "title:" + row.title.trim().toLowerCase()}`).digest("hex");
}
