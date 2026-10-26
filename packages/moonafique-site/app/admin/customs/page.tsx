import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { notFound } from "next/navigation";
import { assertStaff } from "@/lib/grimmunity/http";
import { database } from "@/lib/grimmunity/db";
import { grimMode } from "@/lib/grimmunity/runtime";
import { requestQueue, type QueueFilter } from "@/lib/customs/store";
import { shopToday, statusLabels } from "@/lib/customs/model";
import { StaffRequest } from "@/components/customs/staff-request";
import { RetryCustomEmails } from "@/components/customs/retry-emails";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom request queue | Moonafique staff", robots: { index: false, follow: false } };
const date = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const received = (at: Date) => at.toLocaleString("en-US", { timeZone: "America/Boise", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function CustomQueuePage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  try { assertStaff(user.id); } catch { notFound(); }
  const params = await searchParams;
  const filter: QueueFilter = params.filter === "closed" || params.filter === "all" ? params.filter : "open";
  const mode = grimMode();
  let data;
  try { data = await requestQueue(database(), mode, filter, Number(params.page ?? 1)); }
  catch { return <div className="mx-auto max-w-6xl px-5 py-12"><h1 className="font-display text-4xl">Custom request queue</h1><p role="alert" className="mt-5">The queue is temporarily unavailable. Please reload shortly.</p></div>; }
  const today = shopToday();
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <nav aria-label="Staff tools" className="mb-8 flex flex-wrap gap-5 text-sm font-semibold"><Link className="underline" href="/admin/grimmunity">Grimmunity fulfillment</Link><Link className="underline" href="/customs">Open customer form</Link></nav>
      {mode === "sandbox" && <p role="note" className="mb-6 rounded-xl bg-amber-100 p-4 text-sm text-amber-950">Test queue — separate from real customer requests.</p>}
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Moonafique staff</p>
      <h1 className="font-display text-4xl sm:text-5xl">Custom request queue</h1>
      <p className="mt-5 max-w-3xl leading-7 text-muted-foreground">Requests appear in the order received, oldest first. A requested date is for information only: it does not change the queue order or commit us to completion or delivery by that date.</p>
      <p className="mt-3 text-sm text-muted-foreground">Contact the customer using the details below to discuss scope, pricing, and timing. New requests trigger a staff email and, when an email is provided, a customer confirmation. Status changes do not send messages or take payment.</p>
      <nav aria-label="Filter requests" className="my-7 flex flex-wrap gap-3">
        {([['open', 'Open'], ['closed', 'Completed / declined'], ['all', 'All']] as const).map(([value, label]) => <Link key={value} href={`/admin/customs?filter=${value}`} aria-current={value === filter ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm font-semibold ${value === filter ? "bg-primary text-primary-foreground" : "bg-white"}`}>{label}</Link>)}
      </nav>
      <p className="mb-5 text-sm font-semibold">{data.total} {filter === "all" ? "total" : filter} request{data.total === 1 ? "" : "s"}</p>
      <RetryCustomEmails />
      {!data.rows.length && <p className="rounded-2xl border border-dashed p-8 text-muted-foreground">No requests on this page. New submissions from the custom form will appear in the open queue.</p>}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {data.rows.map((request) => <article key={request.id} className="min-w-0 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="break-words font-display text-2xl">{request.name}</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{statusLabels[request.status]}</span></div>
          <p className="text-xs text-muted-foreground">Received {received(request.created_at)} (shop time)</p>
          <div className="my-4 space-y-2 break-words text-sm">
            {request.email && <p><strong>Email:</strong> <a className="underline" href={`mailto:${request.email}`}>{request.email}</a></p>}
            {request.whatnot_username && <p><strong>Whatnot:</strong> @{request.whatnot_username}</p>}
          </div>
          {request.needed_by ? <div className="my-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Requested date: {date(request.needed_by)} · For information only{request.needed_by < today && ["new", "reviewing", "in_progress"].includes(request.status) ? " · Date has passed" : ""}</p>{request.occasion && <p className="mt-2 whitespace-pre-wrap break-words">{request.occasion}</p>}</div> : <p className="my-5 text-sm text-muted-foreground">No requested date.</p>}
          <h3 className="text-sm font-bold">The idea</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{request.request}</p>
          {request.details && <><h3 className="mt-4 text-sm font-bold">Additional details</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{request.details}</p></>}
          <p className="mt-5 break-all text-xs text-muted-foreground">Reference: {request.id}</p>
          {request.notifications.length > 0 && <ul className="mt-3 space-y-1 text-xs text-muted-foreground" aria-label="Email notifications">
            {request.notifications.map((notification) => <li key={notification.kind}>{notification.kind === "staff" ? "Staff notification" : "Customer confirmation"}: {notification.state === "review" ? "Needs review" : notification.state === "sent" ? "Sent" : "Pending"}</li>)}
          </ul>}
          <StaffRequest key={`${request.id}:${request.revision}`} id={request.id} revision={request.revision} status={request.status} notes={request.staff_notes} />
        </article>)}
      </div>
      <nav aria-label="Queue pages" className="mt-8 flex gap-6 text-sm font-semibold">
        {data.page > 1 && <Link className="underline" href={`/admin/customs?filter=${filter}&page=${data.page - 1}`}>Previous page</Link>}
        {data.page * 50 < data.total && <Link className="underline" href={`/admin/customs?filter=${filter}&page=${data.page + 1}`}>Next page</Link>}
      </nav>
    </div>
  );
}
