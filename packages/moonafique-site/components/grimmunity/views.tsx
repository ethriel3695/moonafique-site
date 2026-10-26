import Link from "next/link";
import {
  Moon,
  PackageCheck,
  CalendarDays,
  Sparkles,
  Palette,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dateLabel,
  money,
  type Address,
  type Edition,
  type Program,
} from "@/lib/grimmunity/model";
import {
  membershipTiers,
  publicTierCopy,
  shippingLabel,
  tiersSchema,
  tierClub,
  type TierAvailability,
  type ClubId,
} from "@/lib/grimmunity/tiers";
import { collectionPages } from "@/lib/grimmunity/collections";
import { launchPlan } from "@/lib/grimmunity/launch-plan";
import type { AccountView, OrderView } from "@/lib/grimmunity/queries";
import { ClubAction, JoinForm } from "./actions";
import { InterestForm } from "./interest-form";
import { GrimDesignShowcase } from "./design-showcase";
import { ShippingPanel } from "./shipping-panel";
import { AvailabilityBadge, MembershipAvailability } from "./availability";
import { PreferencesForm } from "./preferences-form";

export function ClubShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: ClubId | "communities";
}) {
  return (
    <div className="grimmunity mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <nav
        aria-label="Moonafique communities"
        className="mb-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold"
      >
        {[
          { id: "communities", name: "Communities", href: "/communities" },
          ...Object.entries(collectionPages).map(([id, page]) => ({
            id,
            ...page,
          })),
        ].map((page) => (
          <Link
            key={page.id}
            href={page.href}
            aria-current={active === page.id ? "page" : undefined}
            className={
              active === page.id
                ? "text-primary underline decoration-2 underline-offset-8"
                : "text-muted-foreground hover:text-primary"
            }
          >
            {page.name}
          </Link>
        ))}
        <Link href="/account/grimmunity">My memberships</Link>
        <Link href="/contact">Get help</Link>
      </nav>
      {children}
    </div>
  );
}
export function SandboxBanner({ fixture = false }: { fixture?: boolean }) {
  return (
    <div
      role="note"
      className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-100 p-4 text-sm text-amber-950"
    >
      <strong>
        {fixture
          ? "Fixture preview — no real payment or membership."
          : "Stripe sandbox — test payments only."}
      </strong>{" "}
      Shipping quotes and payments on this screen are for testing.
    </div>
  );
}
export function AddressBlock({ address }: { address: Address | null }) {
  if (!address) return <p>Delivery address needed.</p>;
  return (
    <address className="text-sm not-italic leading-6">
      {address.name}
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      <br />
      {address.city}, {address.state} {address.postal_code}
      <br />
      {address.country}
    </address>
  );
}
export function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-bold capitalize text-primary">
      {children}
    </span>
  );
}
function OfferTerms({
  program,
  edition,
}: {
  program: Program;
  edition: Edition;
}) {
  return (
    <dl className="mb-6 space-y-4 text-sm leading-6">
      <div>
        <dt className="font-bold">Delivery & tax</dt>
        <dd>
          Shipping is shown before you join and added to each monthly payment.{" "}
          {program.tax_mode === "inclusive"
            ? "Applicable tax is included in the displayed total."
            : program.tax_mode === "exclusive"
              ? "Applicable sales tax is calculated at checkout and on each renewal."
              : "No additional sales tax is collected."}
        </dd>
      </div>
      <div>
        <dt className="font-bold">Your first edition</dt>
        <dd>
          {edition.title} · {edition.month}
        </dd>
      </div>
      <div>
        <dt className="font-bold">Billing</dt>
        <dd>
          Pay your monthly total today. Your membership renews on the same date
          each month until you cancel. Your account shows your next payment
          date.
        </dd>
      </div>
      <div>
        <dt className="font-bold">When your collection ships</dt>
        <dd>
          {program.fulfillment_lead_days ? (
            <>
              Allow up to {program.fulfillment_lead_days} days after each
              successful payment for dispatch. Update your address before
              packing begins; contact us for changes after packing.
            </>
          ) : (
            <>
              {dateLabel(edition.dispatch_start)}–
              {dateLabel(new Date(edition.dispatch_end.getTime() - 1))}. Update
              your delivery address before {dateLabel(edition.address_cutoff)};
              later changes need staff help.
            </>
          )}
        </dd>
      </div>
      <div>
        <dt className="font-bold">Canceling your membership</dt>
        <dd>
          {program.cancellation_text} {program.recovery_text}
        </dd>
      </div>
    </dl>
  );
}
export function OfferView({
  program,
  edition,
  nextEdition,
  now = new Date(),
  fixture = false,
  interestEnabled = false,
  availability = {},
  availabilityEditionId = null,
  club = "grimm",
}: {
  program?: Program;
  edition?: Edition;
  nextEdition?: Edition;
  now?: Date;
  fixture?: boolean;
  interestEnabled?: boolean;
  availability?: TierAvailability;
  availabilityEditionId?: string | null;
  club?: ClubId;
}) {
  const current =
    !!program &&
    membershipTiers.every((t) =>
      program.tiers.some(
        (saved) => saved.id === t.id && saved.amount === t.amount,
      ),
    );
  const configured =
    current &&
    tiersSchema.safeParse(program.tiers).success &&
    (program.id === "sandbox" ||
      (!!program.approved_at &&
        program.tiers.every((t) => t.benefits_confirmed)));
  const displayedTiers = (current ? program!.tiers : membershipTiers)
    .map(publicTierCopy)
    .filter((tier) => tierClub(tier) === club);
  const open =
    configured &&
    !!program?.enabled &&
    !!edition &&
    edition.state === "open" &&
    now >= edition.enrollment_open &&
    now.getTime() < edition.enrollment_close.getTime() - 31 * 60000 &&
    program.tiers.every(
      (t) =>
        (t.shipping !== null || t.shipping_mode === "shippo") &&
        (t.member_cap === undefined ||
          (edition.tier_allocations?.[t.id]?.capacity === t.member_cap &&
            edition.tier_allocations[t.id]!.retained_copies ===
              (t.retained_copies ?? 0))),
    );
  const grimm = club === "grimm";
  const other = collectionPages[grimm ? "aceo" : "grimm"];
  const CollectionIcon = grimm ? Moon : Palette;
  return (
    <MembershipAvailability
      key={availabilityEditionId ?? "unconfigured"}
      initial={availability}
      editionId={availabilityEditionId}
      fixture={fixture}
    >
      <ClubShell active={club}>
        {program?.id === "sandbox" && <SandboxBanner fixture={fixture} />}
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-primary">
              <CollectionIcon aria-hidden className="size-4" />{" "}
              {grimm ? "The Moonafique Grimmunity" : "ACEOs by Moonafique"}
            </p>
            <h1 className="max-w-2xl text-5xl leading-[1.08] sm:text-6xl">
              {grimm ? "A little mystery." : "Tiny artwork."}
              <br />
              <span className="text-primary">
                {grimm
                  ? "A collection of your own."
                  : "A collection to treasure."}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {grimm
                ? "Your next little obsession is waiting. Meet a colorful mystery Grimm, dress it for the adventure, or fall for a painted Keeper made just for our members."
                : "More happy mail. More tiny treasures. Discover a fresh pair of prints or a new original artwork, and watch your little gallery grow each month."}
            </p>
            <div className="my-8 rounded-[2rem] border border-primary/20 bg-gradient-to-br from-accent/35 to-surface p-7 sm:p-9">
              <Sparkles aria-hidden className="mb-5 size-8 text-primary" />
              <h2 className="text-2xl">
                {grimm
                  ? "Two ways to meet your next Grimm."
                  : "Prints to collect. Originals to keep."}
              </h2>
              <p className="mt-3 leading-7">
                {grimm
                  ? "Start a colorful adventure with Grimm Starter for $15 a month, complete with accessories and two tiny pets. Or welcome an exclusive painted Keeper into your collection for $30."
                  : "Two prints, twice the little joy: join ACEO Prints for $10 a month. Want an original for your collection? ACEO Originals brings you one new piece each month for $20."}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Shipping is additional and calculated for your delivery address.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <PackageCheck
                  aria-hidden
                  className="mb-3 size-5 text-primary"
                />
                <h2 className="text-xl">
                  {grimm
                    ? "Made for your collection"
                    : "Little pieces. Endless possibilities."}
                </h2>
                <p className="mt-2 text-sm leading-6">
                  {grimm
                    ? "Pick your favorite colors for Starter and let the mystery unfold. Every month brings a fresh personality, a new look, and plenty of little details to love."
                    : "Small art, big personality. Tuck your favorites into a little gallery, brighten a cozy corner, or share a print with someone you love."}
                </p>
              </div>
              <div>
                <CalendarDays
                  aria-hidden
                  className="mb-3 size-5 text-primary"
                />
                <h2 className="text-xl">A little joy to look forward to</h2>
                <p className="mt-2 text-sm leading-6">
                  A new month means something new to fall for. Keep your
                  collection growing, and manage your membership anytime in your
                  account.
                </p>
              </div>
            </div>
          </div>
          <aside
            className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8"
            aria-label="Membership offer"
          >
            <Status>{open ? "Come on in" : "Coming soon"}</Status>
            <h2 className="mt-5 text-3xl">
              {open
                ? "Choose your next little obsession."
                : "Your next collection starts here."}
            </h2>
            <p className="mt-5 leading-7">
              {grimm
                ? "A colorful surprise or a painted treasure? Find your favorite way to collect below."
                : "Make a little room for something lovely. Choose your prints or originals below and start your next collection."}
            </p>
            <p className="mt-4 text-sm leading-6">
              {grimm
                ? "Keeper spots are special: when the last one is claimed, that Grimm goes into the vault."
                : "Every month is a new chance to discover a favorite. Your next tiny treasure could be just around the corner."}
            </p>
            {open ? (
              <Button asChild className="mt-6 w-full">
                <a href="#membership-tiers">Choose your membership</a>
              </Button>
            ) : (
              <>
                <p className="mt-4 text-sm leading-6">
                  {nextEdition && program?.enabled
                    ? `Next planned opening: ${dateLabel(nextEdition.enrollment_open)} (America/Boise).`
                    : `First shipments are planned for ${launchPlan.firstShipmentLabel}. Join the interest list for launch news.`}
                </p>
                {interestEnabled ? (
                  <InterestForm />
                ) : (
                  <Button asChild className="mt-6 w-full">
                    <Link href="/#newsletter-email">
                      Get Moonafique updates
                    </Link>
                  </Button>
                )}
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  An interest signup does not reserve a membership or authorize
                  payment.
                </p>
              </>
            )}
          </aside>
        </div>
        <section
          id="membership-tiers"
          aria-labelledby="tiers-heading"
          className="mt-12 scroll-mt-24 border-t border-border pt-8"
        >
          <h2 id="tiers-heading" className="text-3xl sm:text-4xl">
            {grimm
              ? "Choose your Grimm membership."
              : "Choose your ACEO membership."}
          </h2>
          <p className="mb-7 mt-4 max-w-3xl leading-7 text-muted-foreground">
            Pick your monthly dose of happy mail. Shipping is added at checkout.
          </p>
          {open && program && edition ? (
            <JoinForm
              tiers={program.tiers.filter((tier) => tierClub(tier) === club)}
              availability={availability}
              currency={program.currency}
              taxAdded={program.tax_mode === "exclusive"}
              termsVersion={program.terms_version}
              countries={program.countries}
              sandbox={program.id === "sandbox"}
              fixture={fixture}
            >
              <OfferTerms program={program} edition={edition} />
            </JoinForm>
          ) : (
            <>
              <p className="mb-5 text-sm font-semibold">
                We’re putting the finishing touches on our first collection.
                Take a peek below and find your favorite.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                {displayedTiers.map((tier) => (
                  <article
                    key={tier.id}
                    className="rounded-3xl border bg-card p-7"
                  >
                    <div className="mb-4">
                      <AvailabilityBadge
                        tier={tier}
                        availability={availability}
                      />
                    </div>
                    <h3 className="text-2xl">{tier.name}</h3>
                    <p className="mt-3 text-sm leading-6">{tier.description}</p>
                    <p className="mt-6 text-3xl font-bold">
                      {money({ amount: tier.amount, currency: "usd" })}
                      <span className="text-sm font-normal"> / month</span>
                    </p>
                    <p className="mt-2 text-sm font-semibold text-primary">
                      {shippingLabel(tier, "usd")}
                    </p>
                    <ul className="mt-6 space-y-3 text-sm leading-6">
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex gap-3">
                          <span aria-hidden className="text-primary">
                            ✓
                          </span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
        <section
          className="mt-12 rounded-3xl border border-primary/15 bg-surface p-7 sm:p-9"
          aria-labelledby="delivery-heading"
        >
          <h2 id="delivery-heading" className="text-2xl">
            {grimm
              ? "A little Grimm, carefully boxed."
              : "Tiny art, carefully packed."}
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            {grimm
              ? "Your Grimm ships in a box with its included pieces."
              : "Your prints or original artwork ship in a bubble mailer."}{" "}
            Shipping is quoted for your U.S. delivery address before checkout.
            The accepted shipping fee is added to your monthly membership
            payment. Applicable sales tax is shown at checkout.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            If you join both collections, each membership has its own shipment
            and shipping charge.
          </p>
        </section>
        {grimm && <GrimDesignShowcase />}
        <section className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-8">
          <div>
            <h2 className="text-2xl">
              {grimm
                ? "More of an art collector?"
                : "Curious about our little creatures?"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {grimm
                ? "Explore monthly ACEO prints and original artwork."
                : "Meet the mystery and custom Grimms in Grimmunity."}
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href={other.href}>
              Explore {other.name}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </section>
      </ClubShell>
    </MembershipAvailability>
  );
}
function orderStatus(o: OrderView) {
  return o.financial_state !== "paid"
    ? o.financial_state
    : o.review_reason
      ? "review required"
      : o.state === "ready"
        ? "ready to pack"
        : o.state.replaceAll("_", " ");
}
export function AccountContent({
  view,
  fixture = false,
}: {
  view: AccountView;
  fixture?: boolean;
}) {
  const members =
    view.memberships ?? (view.membership ? [view.membership] : []);
  if (members.length < 2)
    return <SingleAccountContent view={view} fixture={fixture} />;
  return (
    <div className="space-y-12">
      {members.map((m) => (
        <section key={m.id} className="border-b pb-10">
          <SingleAccountContent
            fixture={fixture}
            view={{
              membership: m,
              orders: view.orders.filter((o) => o.membership_id === m.id),
              exceptions: view.exceptions,
            }}
          />
        </section>
      ))}
    </div>
  );
}
function SingleAccountContent({
  view,
  fixture = false,
}: {
  view: AccountView;
  fixture?: boolean;
}) {
  const m = view.membership;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            Your collection
          </p>
          <h1 className="text-4xl sm:text-5xl">
            {m?.tier_snapshot.name ?? "My memberships"}
          </h1>
        </div>
        {m && (
          <ClubAction
            endpoint="/api/grimmunity/portal"
            fields={{ membershipId: m.id }}
            disabled={fixture}
          >
            <p className="max-w-xs text-sm">
              Update payment or delivery details, view invoices, or cancel
              future renewals.
            </p>
          </ClubAction>
        )}
      </div>
      {!m ? (
        <div className="rounded-3xl border bg-card p-8">
          <h2 className="text-2xl">Your collection starts here.</h2>
          <p className="my-4">You do not have a Moonafique membership yet.</p>
          <Button asChild>
            <Link href="/communities">Explore memberships</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-5 md:grid-cols-3">
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="mb-4 text-xl">{m.tier_snapshot.name}</h2>
              <Status>
                {m.cancel_at_period_end ? "Canceling at period end" : m.status}
              </Status>
              <p className="mt-4 text-sm leading-6">
                {m.status === "canceled"
                  ? "Future renewals have stopped. Your already-paid editions stay on this page."
                  : m.period_end
                    ? `${m.cancel_at_period_end ? "Membership ends" : "Next monthly payment"}: ${dateLabel(m.period_end)}`
                    : "Checkout or payment confirmation is still pending."}
              </p>
            </section>
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="mb-4 text-xl">Delivery details</h2>
              <AddressBlock address={m.address} />
              {!m.address_valid && (
                <p className="mt-3 font-bold text-red-800">
                  A complete address in the delivery region is needed.
                </p>
              )}
            </section>
            <section className="rounded-3xl border bg-primary/5 p-6">
              <h2 className="mb-4 text-xl">Already paid? Still yours.</h2>
              <p className="text-sm leading-6">
                Canceling stops future renewals. It does not remove a paid
                edition. After a packing address is locked, contact Moonafique
                for delivery changes.
              </p>
            </section>
          </div>
          {m.tier_snapshot.id === "grimm_starter" && !fixture && (
            <PreferencesForm id={m.id} preferences={m.preferences} />
          )}
          {view.exceptions.length > 0 && (
            <div
              role="status"
              className="mb-6 rounded-2xl border border-amber-400 bg-amber-50 p-5"
            >
              <h2 className="text-xl">Your membership needs attention</h2>
              <p className="mt-2">
                A payment or delivery detail needs review. Check billing &
                delivery, or contact Moonafique before making another payment.
              </p>
            </div>
          )}
          <h2 className="mb-5 text-3xl">Your paid editions</h2>
          {!view.orders.length && (
            <p className="rounded-2xl border p-6">
              No edition has been confirmed for fulfillment yet. Checkout
              completion alone does not confirm a paid edition.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {view.orders.map((o) => (
              <article key={o.id} className="rounded-3xl border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {o.month} subscriber edition · {o.tier_snapshot.name}
                    </p>
                    <h3 className="text-2xl">{o.title}</h3>
                  </div>
                  <Status>{orderStatus(o)}</Status>
                </div>
                <p className="my-4 text-sm">
                  Paid {money({ amount: o.amount_paid, currency: o.currency })}{" "}
                  {o.ship_by ? (
                    `· Ships by ${dateLabel(o.ship_by)}`
                  ) : (
                    <>
                      · Dispatch {dateLabel(o.dispatch_start)}–
                      {dateLabel(new Date(o.dispatch_end.getTime() - 1))}
                    </>
                  )}
                </p>
                {o.tier_snapshot.perks.length > 0 && (
                  <p className="mb-4 text-sm">
                    Included perks: {o.tier_snapshot.perks.join("; ")}
                  </p>
                )}
                {o.address_snapshot && (
                  <>
                    <p className="mb-2 text-sm font-bold">
                      Packing address · locked {dateLabel(o.locked_at!)}
                    </p>
                    <AddressBlock address={o.address_snapshot} />
                  </>
                )}
                {o.tracking_number && (
                  <p className="mt-4 text-sm font-bold">
                    Tracking:{" "}
                    {o.tracking_url ? (
                      <a
                        className="underline"
                        href={o.tracking_url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {o.tracking_number}
                      </a>
                    ) : (
                      o.tracking_number
                    )}
                  </p>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
export function StaffOrders({
  orders,
  fixture = false,
}: {
  orders: OrderView[];
  fixture?: boolean;
}) {
  return (
    <div className="space-y-4">
      {!orders.length && (
        <p className="rounded-2xl border p-6">
          No paid fulfillment obligations for this edition.
        </p>
      )}
      {orders.map((o) => (
        <article
          key={o.id}
          className="grid gap-5 rounded-3xl border bg-card p-6 lg:grid-cols-[1fr_1fr_1fr]"
        >
          <div>
            <Status>{orderStatus(o)}</Status>
            <p className="mt-3 text-sm font-bold">{o.tier_snapshot.name}</p>
            {o.tier_snapshot.perks.length > 0 && (
              <p className="mt-2 text-sm">
                Included perks: {o.tier_snapshot.perks.join("; ")}
              </p>
            )}
            {o.preferences && (
              <p className="mt-3 text-sm">
                <strong>Preferred colors:</strong>{" "}
                {o.preferences.preferred_colors.join(", ")}
                <br />
                <strong>Avoid:</strong>{" "}
                {o.preferences.avoided_colors.join(", ") || "None listed"}
              </p>
            )}
            <h3 className="mt-4 break-all font-sans text-base font-bold">
              {o.email}
            </h3>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              Invoice {o.invoice_id}
            </p>
            <p className="mt-2 text-sm">
              {money({ amount: o.amount_paid, currency: o.currency })} paid ·{" "}
              {o.title}
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">
              {o.locked_at
                ? "Locked packing address"
                : "Current delivery address"}
            </p>
            <AddressBlock address={o.address_snapshot ?? o.address} />
          </div>
          <div>
            {o.state === "paid" ? (
              <ClubAction
                endpoint="/api/grimmunity/admin"
                fields={{ action: "lock", id: o.id }}
                disabled={fixture}
              >
                <p className="text-sm">
                  {o.ship_by
                    ? `Ships by ${dateLabel(o.ship_by)}. Lock the address when packing begins.`
                    : `Lock after ${dateLabel(o.address_cutoff)}.`}{" "}
                  Payment and delivery will be checked again.
                </p>
              </ClubAction>
            ) : o.state === "ready" ? (
              <ShippingPanel
                id={o.id}
                label={o.shipping_label}
                fixture={fixture}
              />
            ) : (
              <p className="text-sm">
                {o.state === "shipped"
                  ? `Tracking: ${o.tracking_number}`
                  : o.state === "ready"
                    ? "Ready for tracking entry."
                    : "Resolve payment or delivery exceptions before packing."}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
