import { exportCsv } from "../../lib/whatnot-analytics/csv";
import type { AnalyticsSnapshot, LedgerRow, ShowRow } from "../../lib/whatnot-analytics/model";
export const seller = "123456";
export const start = "2026-01-01T00:00:00.000Z", end = "2026-11-07T15:00:00.000Z";
export function ledger(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return { id: "ledger-1", at: "2026-10-20T19:00:00.000Z", orderAt: "2026-10-20T18:00:00.000Z", type: "ORDER_EARNINGS", orderId: "order-1", title: "Test Grimm", sku: "", category: "Art", format: "AUCTION", quantity: 1, unitCost: 0, showId: "11111111-1111-4111-8111-111111111111", showTitle: "Grimmfest", buyer: "fixture-buyer", state: "ID", country: "US", shipmentId: "fixture-shipment", currency: "USD", amount: 790, buyerPaid: 1500, originalPrice: 1200, coupon: -200, sales: 1000, shipping: 100, commission: 80, commissionTax: 0, processing: 30, processingTax: 0, ...overrides };
}
export function show(overrides: Partial<ShowRow> = {}): ShowRow {
  return { id: "11111111-1111-4111-8111-111111111111", title: "Grimmfest", start: "2026-10-20T18:00:00.000Z", currency: "USD", sales: 1000, earnings: 790, orders: 1, buyers: 1, newBuyers: 1, returningBuyers: 0, viewers: 10, peak: 5, impressions: 20, ctr: .5, minutes: 60, giveawayOrders: 1, giveawaySpend: -100, rating: 5, ...overrides };
}
export function snapshot(overrides: Partial<AnalyticsSnapshot> = {}): AnalyticsSnapshot {
  return { sellerId: seller, currency: "USD", start, end, importedAt: end, ledger: [ledger()], daily: [{ day: "2026-10-20", currency: "USD", sales: 1000, earnings: 790, liveSales: 1000, marketplaceSales: 0, orders: 1, buyers: 1, newBuyers: 1, returningBuyers: 0, follows: 2, shows: 1, minutes: 60 }], shows: [show()], sources: [], ...overrides };
}
export function financialCsv(overrides: Record<string, unknown> = {}) {
  const row = { ledger_transaction_id: "ledger-1", seller_id: seller, transaction_completed_at_utc: "2026-10-20 19:00:00.123456", order_placed_at_utc: "2026-10-20 18:00:00", transaction_type: "ORDER_EARNINGS", transaction_currency: "USD", transaction_amount: 7.90, order_id: "order-1", listing_title: 'Test Grimm, "purple"', quantity_sold: 1, cost_of_goods: 0, post_coupon_price: 10, original_item_price: 12, coupon_cost: -2, seller_shipping_charge: 1, commission_fee: .8, commission_tax: 0, processing_fee: .3, processing_fee_tax: 0, ...overrides };
  return exportCsv(Object.keys(row), [row]);
}
export const dailyCsv = "date,currency,estimated_sales,estimated_earnings,orders_count,in_show_estimated_sales,marketplace_estimated_sales\n2026-10-20,USD,10,7.90,1,10,0\n";
export const showsCsv = "livestream_id,livestream_title,start_time,currency,sales,estimated_earnings,orders_count,stream_minutes,giveaway_spend\n11111111-1111-4111-8111-111111111111,Grimmfest,2026-10-20 18:00:00.123456+00:00,USD,10,7.90,1,60,-1\n";
