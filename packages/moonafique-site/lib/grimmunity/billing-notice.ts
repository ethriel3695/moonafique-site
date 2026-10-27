import { dateLabel, money, type Membership, type Program } from "./model";
import type { BillingCycle } from "./renewals";

export function plannedChargeDate(now: Date) {
  const at = new Date(now.getTime() + 8 * 86400000);
  at.setUTCHours(12, 0, 0, 0);
  return at;
}
export function noticeBody(
  p: Program,
  m: Membership,
  cycle: BillingCycle,
  at: Date,
) {
  const price = (amount: number) => money({ amount, currency: p.currency });
  return `${m.tier_snapshot.name} · your next delivery\nDelivery cycle: ${dateLabel(cycle.period_start)}\n\nMembership: ${price(cycle.membership_amount ?? 0)}${cycle.membership_amount === 0 ? " (already prepaid)" : ""}\nShipping: ${price(cycle.shipping_amount!)} · ${cycle.rate!.carrier} ${cycle.rate!.service}\nSales tax: ${price(cycle.tax_amount!)}\nTotal: ${price(cycle.total!)}\n\nScheduled automatic payment: ${dateLabel(at)} (America/Boise). We will not charge before this date or less than seven days after this notice is delivered.\nDelivery: ${cycle.address_snapshot.name}, ${cycle.address_snapshot.line1}${cycle.address_snapshot.line2 ? ", " + cycle.address_snapshot.line2 : ""}, ${cycle.address_snapshot.city}, ${cycle.address_snapshot.state} ${cycle.address_snapshot.postal_code}.\n\nShipping uses this month's quoted carrier price. This total is fixed for this invoice. Review the same itemized total in your membership account. If delivery details change, payment is held until the revised details have been reviewed and a new notice has been delivered. Cancel renewal in your account before the next charge to stop renewing membership; prepaid memberships keep monthly shipping charges for deliveries during their paid term. Contact ${p.support_email} if you need to pause a prepaid delivery.`;
}
