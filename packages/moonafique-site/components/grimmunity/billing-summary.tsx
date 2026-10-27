import { dateLabel, money, type Membership } from "@/lib/grimmunity/model";
import type { AccountView } from "@/lib/grimmunity/queries";
import { ClubAction } from "./actions";

export function BillingSummary({
  member,
  view,
  fixture = false,
}: {
  member: Membership;
  view: AccountView;
  fixture?: boolean;
}) {
  const billing = member.tier_snapshot.billing;
  if (!billing) return null;
  const price = (amount: number) => money({ amount, currency: "usd" });
  const coverage = view.coverage?.find(
    (period) => period.membership_id === member.id,
  );
  const cycles =
    view.billingCycles
      ?.filter((cycle) => cycle.membership_id === member.id)
      .slice(0, 4) ?? [];
  return (
    <section className="mb-8 rounded-3xl border bg-card p-6">
      <h2 className="text-2xl">Your billing & monthly deliveries</h2>
      <p className="mt-3 leading-7">
        {price(billing.amount)} for{" "}
        {billing.months === 1 ? "one month" : `${billing.months} months`} of
        membership
        {billing.discount ? ` · ${billing.discount}% membership savings` : ""}.
        Shipping is quoted and billed separately for each monthly delivery.
      </p>
      {coverage && (
        <p className="mt-3 font-semibold">
          {coverage.financial_state === "paid"
            ? `Membership paid through ${dateLabel(new Date(coverage.period_end.getTime() - 1))}.`
            : "Your prepaid membership payment needs review. Remaining deliveries and automatic charges are on hold."}
        </p>
      )}
      {member.cancel_at_period_end && (
        <p className="mt-3">
          Membership renewal is canceled. Deliveries during your paid term still
          have monthly shipping charges.
        </p>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {cycles.map((cycle) => (
          <article key={cycle.invoice_id} className="rounded-2xl border p-5">
            <h3 className="font-bold">
              Delivery cycle · {dateLabel(cycle.period_start)}
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt>
                  Membership
                  {cycle.membership_amount === 0 ? " · already prepaid" : ""}
                </dt>
                <dd>
                  {cycle.membership_amount === null
                    ? "Pending"
                    : price(cycle.membership_amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>
                  Shipping
                  {cycle.rate
                    ? ` · ${cycle.rate.carrier} ${cycle.rate.service}`
                    : ""}
                </dt>
                <dd>
                  {cycle.shipping_amount === null
                    ? "Pending quote"
                    : price(cycle.shipping_amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Sales tax</dt>
                <dd>
                  {cycle.tax_amount === null
                    ? "Pending"
                    : price(cycle.tax_amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 font-bold">
                <dt>Total</dt>
                <dd>{cycle.total === null ? "Pending" : price(cycle.total)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-6" role="status">
              {cycle.state === "paid"
                ? "Paid · this monthly delivery is confirmed."
                : cycle.state === "canceled"
                  ? "Canceled · no further payment will be requested for this invoice."
                  : cycle.state === "initial"
                    ? "Review and pay your first itemized invoice to confirm this delivery."
                    : cycle.state === "hold"
                      ? "Payment is on hold for review. Contact Moonafique before paying or changing this invoice."
                      : cycle.state === "paying"
                        ? "Payment is being confirmed. Please do not pay again."
                        : cycle.notice_delivered_at && cycle.charge_at
                          ? `Notice delivered ${dateLabel(cycle.notice_delivered_at)}. Scheduled payment: ${dateLabel(cycle.charge_at)}. We never charge less than seven days after delivery of the notice.`
                          : "Waiting for the shipping quote or delivery of your billing notice. Automatic payment is blocked."}
            </p>
            {cycle.invoice_url &&
              (cycle.state === "initial" ||
                (cycle.state === "hold" &&
                  cycle.hold_reason === "payment_needs_attention")) && (
                <a
                  className="mt-4 inline-block font-bold underline"
                  href={fixture ? undefined : cycle.invoice_url}
                  aria-disabled={fixture}
                >
                  {cycle.initial
                    ? "Review and pay first invoice"
                    : "Review payment and authentication"}
                </a>
              )}
          </article>
        ))}
      </div>
      {!member.cancel_at_period_end && member.status !== "canceled" && (
        <div className="mt-6">
          <ClubAction
            endpoint="/api/grimmunity/cancel-renewal"
            fields={{ membershipId: member.id }}
            submitLabel="Cancel membership renewal"
            disabled={fixture}
          >
            <p className="text-sm leading-6">
              Stop renewing your membership. Paid membership coverage remains
              yours, with shipping billed monthly during that term. Contact
              Moonafique to pause a delivery or request a refund review.
            </p>
          </ClubAction>
        </div>
      )}
    </section>
  );
}
