import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { notFound } from "next/navigation";
import {
  ClubShell,
  SandboxBanner,
  StaffOrders,
  Status,
} from "@/components/grimmunity/views";
import { ClubAction, EditionForm } from "@/components/grimmunity/actions";
import { assertStaff } from "@/lib/grimmunity/http";
import { adminView } from "@/lib/grimmunity/queries";
import { dateLabel, money } from "@/lib/grimmunity/model";
import { Button } from "@/components/ui/button";
import { shippoConfigured } from "@/lib/shippo";
import { grimMode } from "@/lib/grimmunity/runtime";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  try {
    assertStaff(user.id);
  } catch {
    notFound();
  }
  let data;
  try {
    data = await adminView((await searchParams).month);
  } catch {
    return (
      <ClubShell>
        <h1 className="text-4xl">Grimmunity fulfillment</h1>
        <p role="alert" className="mt-5">
          Storage is not available. Check the Grim database configuration and
          migrations.
        </p>
      </ClubShell>
    );
  }
  const { program, editions, edition, orders, exceptions, members } = data;
  return (
    <ClubShell>
      {program?.id === "sandbox" && <SandboxBanner />}
      <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
        Moonafique staff
      </p>
      <h1 className="text-4xl sm:text-5xl">Grimmunity fulfillment</h1>
      <p className="mt-4 text-sm font-bold">
        <Link className="underline underline-offset-4" href="/admin/customs">
          Open custom request queue
        </Link>
      </p>
      <p className="mt-4 max-w-3xl leading-7">
        Check exceptions, lock each paid order’s address, export the packing
        list, and add tracking after dispatch. Get Shippo rates and purchase a
        label for each ready order, then mark it dispatched after shipping.
      </p>
      <div className="my-7 flex flex-wrap gap-3">
        <Status>
          {shippoConfigured(grimMode())
            ? "Shippo connected"
            : "Shippo API key needed"}
        </Status>
        <Status>{data.interestCount} on the interest list</Status>
        <Status>
          {data.interestMail?.pending ?? 0} waiting-list confirmations pending
        </Status>
        <Status>
          {data.interestMail?.review ?? 0} waiting-list confirmations need
          review
        </Status>
        <Status>{orders.length} paid obligations</Status>
        <Status>
          {orders.filter((o) => o.state === "ready").length} ready to pack
        </Status>
        <Status>{exceptions.length} exceptions</Status>
        <Status>{data.pendingEvents} pending events</Status>
        <Status>{data.pendingNotifications} pending notifications</Status>
      </div>
      <Button asChild variant="outline">
        <a href="/api/grimmunity/interest/export">
          Export launch interest list
        </a>
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        These contacts requested a Grimmunity launch email only. An interest
        signup does not reserve a membership.
      </p>
      <details className="mt-5 rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-bold">
          Billing checks
        </summary>
        <p className="my-3 text-sm">
          Stripe webhooks update payments as they happen. The daily backup check
          retries pending events and refreshes memberships. Run it here when
          reviewing a billing issue.
        </p>
        <p className="mb-3 text-sm">
          {data.worker?.finished_at
            ? `Last completed: ${dateLabel(data.worker.finished_at)}. ${data.worker.result?.members ?? 0} memberships checked; ${data.worker.result?.failures ?? 0} failures.`
            : "No completed backup check yet."}
        </p>
        <ClubAction
          endpoint="/api/grimmunity/worker"
          submitLabel="Run billing checks"
        >
          <p className="text-xs">
            Reconciles invoices and sends approved notifications. When automatic
            collection is approved, this also collects unchanged invoices whose
            delivered seven-day notice period has ended.
          </p>
        </ClubAction>
      </details>
      <details className="mt-5 rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-bold">
          Remove an email from the interest list
        </summary>
        <ClubAction
          endpoint="/api/grimmunity/interest/remove"
          submitLabel="Remove email from launch list"
        >
          <label className="block text-sm">
            Email address
            <input
              className="mt-2 block w-full rounded-xl border p-3"
              type="email"
              name="email"
              required
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="confirmed" value="yes" required />
            Permanently remove this email from the Grimmunity launch list.
          </label>
        </ClubAction>
      </details>
      <form className="my-7 flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">
          Edition
          <select
            name="month"
            defaultValue={edition?.month}
            className="mt-2 block rounded-xl border bg-card p-3"
          >
            {editions.map((e) => (
              <option key={e.id} value={e.month}>
                {e.month} · {e.title}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" type="submit">
          Show edition
        </Button>
      </form>
      {edition && (
        <div className="mb-6 flex flex-wrap justify-between gap-5 rounded-2xl bg-primary/5 p-5">
          <div>
            <h2 className="text-2xl">{edition.title}</h2>
            <p className="mt-2 text-sm">
              {program?.fulfillment_lead_days ? (
                `Dispatch within ${program.fulfillment_lead_days} days of payment`
              ) : (
                <>
                  Dispatch {dateLabel(edition.dispatch_start)}–
                  {dateLabel(new Date(edition.dispatch_end.getTime() - 1))}
                </>
              )}{" "}
              ·{" "}
              {edition.tier_allocations
                ? "Separate member limits for each tier"
                : `${edition.capacity} subscriber + ${edition.retained_copies} retained copies`}
            </p>
            {edition.state === "draft" && (
              <p className="mt-2 text-sm font-semibold">
                Draft edition. Paid enrollment is closed pending launch
                approval.
              </p>
            )}
          </div>
          <Button asChild variant="outline">
            <a href={`/api/grimmunity/packing?edition=${edition.id}`}>
              Export ready packing list
            </a>
          </Button>
        </div>
      )}
      {edition && (
        <details className="mb-6 rounded-2xl border p-5">
          <summary className="cursor-pointer text-sm font-bold">
            Edition status: {edition.state}
          </summary>
          <ClubAction
            endpoint="/api/grimmunity/editions"
            fields={{ action: "state", id: edition.id }}
          >
            <label className="mt-4 block text-sm">
              Status
              <select
                name="state"
                defaultValue={
                  edition.state === "draft" ? "closed" : edition.state
                }
                className="mt-2 block rounded-xl border bg-card p-3"
              >
                <option value="open">Open during enrollment window</option>
                <option value="closed">Closed to new members</option>
                <option value="vaulted">Vaulted</option>
              </select>
            </label>
            <p className="text-xs">
              Vaulting is permanent and requires all paid orders to be shipped.
              Existing billing continues; contact the operator before retiring
              future editions.
            </p>
          </ClubAction>
        </details>
      )}
      <section
        className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Membership capacity"
      >
        {program?.tiers.map((tier) => (
          <div key={tier.id} className="rounded-xl border p-4">
            <p className="font-bold">{tier.name}</p>
            <p className="mt-2 text-sm">
              {
                members.filter(
                  (m) => m.tier_snapshot.id === tier.id && m.seat_held,
                ).length
              }{" "}
              active
              {tier.member_cap
                ? ` / ${tier.member_cap} places`
                : " · no fixed cap"}
            </p>
            {tier.id === "grimm_keeper" && (
              <p className="mt-2 text-xs">
                12 subscriber copies + 1 for our collection.
              </p>
            )}
          </div>
        ))}
      </section>
      <StaffOrders orders={orders} />
      <section className="mt-10">
        <h2 className="text-3xl">Monthly billing notices</h2>
        <p className="mt-3 text-sm leading-6">
          Automatic payments require an unchanged invoice and a verified email
          delivery at least seven days earlier. A reviewed replacement notice
          starts a fresh notice period. Changed delivery details need a fresh
          quote and a replacement invoice; the old unpaid invoice is voided
          first.
        </p>
        {!data.billingCycles.length && (
          <p className="mt-4">No pending billing cycles.</p>
        )}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {data.billingCycles.map((cycle) => (
            <article key={cycle.invoice_id} className="rounded-2xl border p-5">
              <h3 className="font-bold">
                {cycle.membership_name} · {cycle.email}
              </h3>
              <p className="mt-2 text-sm">
                {cycle.state}
                {cycle.hold_reason
                  ? ` · ${cycle.hold_reason.replaceAll("_", " ")}`
                  : ""}
              </p>
              <p className="mt-2 text-sm">
                {cycle.total === null
                  ? "Quote or invoice pending"
                  : `${money({ amount: cycle.membership_amount ?? 0, currency: "usd" })} membership + ${money({ amount: cycle.shipping_amount ?? 0, currency: "usd" })} shipping + ${money({ amount: cycle.tax_amount ?? 0, currency: "usd" })} tax = ${money({ amount: cycle.total, currency: "usd" })}`}
              </p>
              <p className="mt-2 text-sm">
                {cycle.notice_failed_at
                  ? "Notice delivery failed; payment blocked."
                  : cycle.notice_delivered_at
                    ? `Notice delivered ${dateLabel(cycle.notice_delivered_at)}.`
                    : "Notice delivery has not been verified."}
                {cycle.charge_at && ` Scheduled ${dateLabel(cycle.charge_at)}.`}
              </p>
              {!cycle.initial && ["hold", "noticed"].includes(cycle.state) && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold">
                    Review and send a new notice
                  </summary>
                  <ClubAction
                    endpoint="/api/grimmunity/admin"
                    fields={{ action: "renotice", invoice: cycle.invoice_id }}
                    submitLabel="Queue a fresh seven-day notice"
                  >
                    <label className="block text-sm">
                      Review note
                      <textarea
                        name="note"
                        required
                        minLength={8}
                        maxLength={1000}
                        className="mt-2 block w-full rounded-xl border p-3"
                      />
                    </label>
                    <p className="text-xs">
                      Confirm the provider payment outcome and address first.
                      Refunds, changed totals, changed addresses, and
                      unsupported plans still block collection.
                    </p>
                  </ClubAction>
                  <ClubAction
                    endpoint="/api/grimmunity/admin"
                    fields={{
                      action: "replace_renewal",
                      invoice: cycle.invoice_id,
                    }}
                    submitLabel="Refresh quote and replace unpaid invoice"
                  >
                    <label className="block text-sm">
                      Address and postage review note
                      <textarea
                        name="note"
                        required
                        minLength={8}
                        maxLength={1000}
                        className="mt-2 block w-full rounded-xl border p-3"
                      />
                    </label>
                    <p className="text-xs">
                      Use after confirming new delivery details. This voids the
                      unpaid invoice, recalculates postage and tax, and queues a
                      new seven-day notice. It cannot replace a paid invoice.
                    </p>
                  </ClubAction>
                </details>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="mb-5 text-3xl">Exceptions & payment attention</h2>
        {!exceptions.length ? (
          <p>No unresolved exceptions.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {exceptions.map((x) => (
              <article
                key={x.id}
                className="rounded-2xl border border-amber-400/60 bg-amber-50 p-5"
              >
                <p className="font-bold">{x.reason}</p>
                <p className="my-3 break-all text-xs">
                  {x.invoice_id ?? "Membership review"} ·{" "}
                  {dateLabel(x.created_at)}
                </p>
                <ClubAction
                  endpoint="/api/grimmunity/admin"
                  fields={{ action: "resolve", id: x.id }}
                >
                  <label className="block text-sm">
                    Review note
                    <textarea
                      name="note"
                      required
                      minLength={8}
                      maxLength={1000}
                      className="mt-2 block w-full rounded-xl border bg-white p-3"
                    />
                  </label>
                  <p className="text-xs">
                    A note acknowledges review. It does not release a financial
                    hold or create an order.
                  </p>
                </ClubAction>
                {x.invoice_id && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-bold">
                      Recheck an invoice or financial hold
                    </summary>
                    <ClubAction
                      endpoint="/api/grimmunity/admin"
                      fields={{ action: "release", invoice: x.invoice_id }}
                    >
                      <label className="block text-sm">
                        Reason
                        <textarea
                          name="note"
                          required
                          minLength={8}
                          className="mt-2 w-full rounded-xl border p-3"
                        />
                      </label>
                    </ClubAction>
                    <ClubAction
                      endpoint="/api/grimmunity/admin"
                      fields={{ action: "reconsider", invoice: x.invoice_id }}
                    >
                      <label className="block text-sm">
                        Re-evaluation reason
                        <textarea
                          name="note"
                          required
                          minLength={8}
                          maxLength={1000}
                          className="mt-2 w-full rounded-xl border p-3"
                        />
                      </label>
                      <p className="text-xs">
                        Use after correcting a missing edition. All payment,
                        cutoff, and capacity checks still apply.
                      </p>
                    </ClubAction>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <details className="mt-10 rounded-2xl border p-6">
        <summary className="cursor-pointer text-xl font-bold">
          Memberships ({members.length})
        </summary>
        <ul className="mt-4 space-y-3">
          {members.map((m) => (
            <li className="flex flex-wrap gap-3 text-sm" key={m.id}>
              <span>{m.email}</span>
              <span>{m.tier_snapshot.name}</span>
              <Status>{m.status}</Status>
              {m.cancel_at_period_end && (
                <span>Ends {m.period_end && dateLabel(m.period_end)}</span>
              )}
            </li>
          ))}
        </ul>
      </details>
      <details className="mt-6 rounded-2xl border p-6">
        <summary className="cursor-pointer text-xl font-bold">
          Set up an edition
        </summary>
        <div className="mt-5">
          <EditionForm />
        </div>
      </details>
      <p className="mt-8 text-sm">
        <Link className="underline" href="/account/grimmunity">
          Open your customer account
        </Link>
      </p>
    </ClubShell>
  );
}
