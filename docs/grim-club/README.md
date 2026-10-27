# Grimmunity implementation and review

Updated October 26, 2026. The approved two Grimm tiers and two ACEO tiers are now described on separate production pages, with shipping charged separately when billing opens. The owner approved the [production deployment and migrations](deployment-20261026.md). Paid enrollment remains closed and live Shippo remains disconnected. See [the current offer and Shippo setup](collections-and-shipping.md) and [the operating guide](operations.md).

All twelve monthly, six-month, and annual Stripe Prices are prepared with inactive products. The owner approved 5% off six months and 10% off twelve months, on membership only. The prepaid and monthly shipping notice workflow is implemented for closed review; see [billing and notice setup](prepaid-billing-and-notices.md) for its safeguards and verification. The earlier [catalog setup receipt](live-setup-and-prepaid-proposal.md) remains historical evidence.

| Membership | Monthly price before shipping | Member limit | Included each month |
| --- | --- | --- | --- |
| Grimm Starter | $15 | No fixed cap | Mystery gradient or dual-extrusion Grimm; a different ear option; all six emotion faces; two pairs of pants; two boots; two matching pets |
| Grimm Keeper | $30 | 12 | Custom Grimm with subscription-exclusive paint job and accessories on the Grimm itself |
| ACEO Prints | $10 | 24 | Two physical ink prints of original ACEO art |
| ACEO Originals | $20 | 12 | One original piece from the new monthly collection |

Starter includes six preferred colors and colors to avoid. Its stated value is at least $24. Keeper production is 13 copies: 12 for subscribers and one for the Moonafique collection. When all 12 Keeper memberships are taken, its public status is **Vaulted for now**. No stand or separate Keeper accessory pack is promised.

Shipping is quoted through Shippo for the delivery address each month and itemized in a notice delivered at least seven days before automatic payment. Grimm uses an 8 × 8 × 8-inch, 8 oz box; ACEO uses a 7 × 5 × 1-inch, 6 oz bubble mailer. Ship-from ZIP is 83442. The full return address is server-only configuration.

The sections below describe the original implementation and historical Collector rollout. Their $25/$9.21 pricing, shared 24-member cap, and two-month public-release policy are historical. Use the current offer document for new configuration. Preserve saved promises on existing paid orders.

## Review and launch

Use the protected [Vercel sandbox](https://moonafique-grimmunity-sandbox.vercel.app/grimmunity) for current signup review. The older local preview at `http://127.0.0.1:3047/grimmunity` requires its development server to be running. The [Grimmunity preview](screenshots/grimmunity-preview.jpg) shows the renamed page. The current [desktop offer](screenshots/single-membership-desktop.jpg) and [mobile offer](screenshots/single-membership-mobile.jpg) show the single membership. Earlier three-tier images are historical.

- `/grimmunity`: offer and enrollment status.
- `/grimmunity/confirmation`: authenticated, server-verified checkout result; it does not create an order.
- `/account/grimmunity`: membership, renewals, paid editions, addresses, and billing portal.
- `/admin/grimmunity`: authenticated staff fulfillment, packing export, tracking, and edition setup.
- `/grimmunity/review`: development fixtures when `GRIM_REVIEW_UI=true`; unavailable in production.

The local seed has one membership, a $9.21 recurring shipping fixture, and capacity for 24 subscribers. The sandbox uses verified Stripe test IDs. The separate production draft uses live IDs, one retained copy for Jess, November 1 enrollment, exclusive tax, and seven-day rolling dispatch. Older batch dates remain sandbox fixtures. A single membership option does not mean a one-person subscriber cap.

See the [launch checklist](launch-checklist.md), [verification record](verification.md), and [monthly operating guide](operations.md).

## Grimmunity naming

Grimmunity is the public name and canonical URL. The feature source, tests, migrations directory, and CI workflow use `grimmunity`. Existing `/grim-club`, `/account/grim-club`, and `/admin/grim-club` links redirect permanently to their equivalents and preserve query parameters. Existing `/api/grim-club` requests are rewritten internally so webhook POST bodies continue to reach the same signed handler.

The `GRIM_*` environment variables, database schema, saved billing identifiers, and applied SQL migration contents are unchanged. This documentation stays under `docs/grim-club` to preserve earlier review links and evidence.

## Storage and deployment

The existing Vercel `moonafique-site` project serves `https://www.moonafique.com`, with `packages/moonafique-site` as its root. The free Neon `grimmunity-sandbox` database is connected only to Preview, with sensitive `GRIM_*` credentials. Migrations 001–005 ran from Vercel. A separate free production database is connected only to Production. See the production record for its IDs and disabled-enrollment controls. See [Vercel sandbox setup](vercel-sandbox.md) before redeploying or enabling test enrollment.

The implementation uses a dedicated `GRIM_DATABASE_URL`; it never falls back to the existing `DATABASE_URL` or `POSTGRES_URL`. Use separate sandbox and production databases, each with TLS according to the provider's verified connection instructions. Do not disable certificate verification. `pg` uses a small connection pool. A pooled PostgreSQL endpoint is suitable if it supports ordinary transactions and row locks.

All business timestamps use `timestamptz`. Edition setup converts America/Boise local times through PostgreSQL, including daylight-saving transitions. Closing timestamps are exclusive. The last 31 minutes of an enrollment window do not accept new checkouts, because Stripe requires at least 30 minutes for a new Checkout Session.

The database contains configuration, editions, WorkOS-to-Stripe membership mapping, reservations, webhook receipts, invoice entitlements, fulfillment snapshots, exceptions, audit history, and a notification outbox. Unique constraints prevent duplicate sessions, invoices, and membership/edition fulfillment. A program row lock serializes capacity changes across app instances. No capacity or order state is held in browser storage or process memory.

## Local setup and migrations

Commands below run from the repository root. Use Node 22.12+ or the tested Node 25.9.0 and pnpm 10.33.2. The default local Node 20.16 cannot load the existing Vite configuration reliably.

1. Create an empty local database for sandbox use.
2. Set the server-only settings listed in `packages/moonafique-site/.env.example` through your environment or secret manager.
3. Set `GRIM_MODE=sandbox` and `GRIM_DATABASE_URL` to that dedicated database.
4. Run `pnpm --filter moonafique-site grim migrate`.
5. For fictional review configuration, run `pnpm --filter moonafique-site grim seed-sandbox`.

Each numbered migration runs transactionally, records a checksum, and can be run again. Migration 002 adds tier configuration and saves a tier snapshot on memberships, reservations, and paid entitlements. It maps existing single-plan records to the entry tier and disables new enrollment pending tier configuration. It preserves paid orders, prices, and audit history. An existing program with members needs a reviewed configuration migration before changing its membership offer; the CLI does not rewrite it. Do not edit an applied migration. Add a numbered migration for future schema changes. Fixture seeding leaves enrollment disabled and does not contact Stripe.

For deterministic integration tests, create a disposable local database named `grim_test`, set `GRIM_TEST_DATABASE_URL`, and run:

```sh
pnpm --filter moonafique-site test:grim
pnpm --filter moonafique-site exec tsc --noEmit
```

Tests refuse nonlocal databases and databases with any other name, because they truncate the Grim schema's business tables. CI supplies PostgreSQL 16. The test gateway simulates Stripe; PostgreSQL transactions and constraints are real.

## Stripe sandbox configuration

Use `GRIM_STRIPE_SECRET_KEY` with a test key. A live key is rejected in sandbox mode. Keep the existing storefront Stripe settings separate.

Create an active sandbox Grim product with metadata `grim_subscription=true` and a fixed $25 USD monthly recurring Price. Create a separate shipping product with metadata `grim_shipping=true` and a fixed monthly recurring Price for the approved $9.21 flat fee. Both Prices must be active, licensed, and use quantity one. They appear on the same monthly invoice, including renewals.

Set the Collector tier’s `shipping` to an object with `price_id`, `product_id`, and `amount` in cents. Leave it `null` until the recurring shipping Price is configured; configuration checks and checkout then reject enrollment. Omitted shipping is supported only to preserve historical bundled-price snapshots. No schema migration is needed for this optional field in existing JSON snapshots. Do not remove the field to bypass shipping setup.

This version supports exclusive Stripe automatic tax, inclusive tax, or an approved no-additional-tax configuration. The live draft uses exclusive tax. Both recurring Prices must use the chosen tax behavior. Exclusive invoices require a completed Stripe calculation, the exact approved subtotal, and verified payment of the subtotal plus authoritative tax. Discounts, trials, and quantity changes remain unsupported.

Create the dedicated portal with `pnpm --filter moonafique-site grim portal-sandbox`. It enables payment methods, invoices, shipping-address changes, and cancellation at period end without prorations. It disables subscription updates. The application checks these settings before opening the portal; archived product prices do not prevent portal access.

Copy `program.sandbox.example.json`, replace its Stripe IDs with sandbox IDs, then run:

```sh
pnpm --filter moonafique-site grim configure /absolute/path/program.json
pnpm --filter moonafique-site grim check
pnpm --filter moonafique-site grim enable-sandbox
```

Configuration is immutable once membership records exist. Use a fresh sandbox database for a new fixture program. For live configuration changes, prepare a reviewed migration that preserves historical prices and edition promises; do not rewrite the existing program in place.

Set up dated editions before invoices can arrive. The fixture seed supplies November, December, and January. Staff can save future schedules at `/admin/grimmunity`. Used schedules cannot be rewritten. Availability can be closed separately; vaulting is permanent and requires existing paid orders to be shipped.

Use `/api/grimmunity/webhook` with `GRIM_STRIPE_WEBHOOK_SECRET`. Configure the endpoint for API version `2026-04-22.dahlia`, matching installed Stripe 22.1.0 types. Subscribe to the event list in `lib/grimmunity/service.ts`: checkout completion/expiry, paid and failed/authentication-required invoices, subscription lifecycle, customer updates, refunds, disputes, and credit notes. The existing `/api/stripe-webhook` can also dispatch Grim events only when `GRIM_USE_SHARED_WEBHOOK=true` and both integrations deliberately use the same account and mode. Do not enable that switch on the current live endpoint for a separate sandbox.

WorkOS customer identity comes from the server session. Staff access requires exact WorkOS IDs in `GRIM_STAFF_USER_IDS`. Every staff API and export checks authorization independently. The browser submits an allowlisted tier ID (`entry`, `mid`, or `high`). The server resolves its Price and stores the full offer on the reservation. Browser requests cannot supply a Stripe customer, subscription, price, amount, perks, or quantity. An unfinished checkout for a different tier returns an explicit conflict; it never silently opens the old tier. Resume the original tier, or choose again after Stripe confirms expiry.

## Membership and shipping behavior

Only Grim Collector is offered at launch. The configuration accepts one to three distinct memberships to preserve earlier multi-plan regression coverage. Membership IDs remain stable for saved history. A request for an unconfigured membership fails before reservation or Stripe session creation.

The membership snapshot includes the separate recurring shipping Price and amount. Each invoice must contain exactly one membership line and one shipping line, each with the saved Price, product, currency, amount, quantity, and matching monthly period. Shipping never creates a second shipment or consumes another subscriber place. Missing, duplicate, adjusted, or unexpected shipping charges hold the invoice for review.

Account history and packing exports preserve saved perks. Cards are packed manually. The two-month public-sale hold is an operating rule that staff must check before listing a release. The catalog does not automatically publish or unlock subscriber designs.

Changing membership or shipping prices for existing members requires a reviewed migration and customer communication. Do not change the Stripe items manually. New enrollment configuration cannot rewrite historical paid obligations.

## Processing and recovery

A reservation is committed before creating Checkout. Stripe receives a stable idempotency key and an absolute expiration. A durable customer mapping is committed before a session can exist. A lost response resumes the same session. Time passing alone never releases a potentially payable session: expiration checks Stripe first, including a completion/expiry race. A missing session can be released only after its absolute creation deadline and the bounded request grace period.

A signed event is recorded before processing. Order creation, notification intent, audit entries, and event completion commit together. A storage or Stripe failure returns a retryable response and leaves a pending receipt. Current Stripe objects are retrieved inside the program lock, so old event payloads do not overwrite current membership state.

Only an eligible paid invoice creates fulfillment. Validation checks its identity, customer, subscription, full amount, currency, actual payment, recurring Price/product, quantity, billing period, and edition. Prorations, free invoices, extra lines, credits, unusual adjustments, and late recovery cannot enter packing. Historic billing-period start determines the edition; event arrival time does not. Cancellation never deletes a paid obligation. Its current billing-period seat stays committed even if cancellation arrives before the paid event. Future members do not consume an earlier edition’s capacity. A second paid invoice for one member/edition becomes an exception.

Run these from a reliable scheduled worker with the same server secrets:

```sh
pnpm --filter moonafique-site grim expire
pnpm --filter moonafique-site grim retry-events
pnpm --filter moonafique-site grim reconcile
pnpm --filter moonafique-site grim outbox
```

Schedule reservation expiry and receipt retry every five minutes. Reconcile daily and before packing. Reconciliation reads paid invoices for each stored customer, including canceled subscriptions and test-clock customers. It does not create charges or buy postage. Pass an invoice ID to reconcile one invoice. For an invoice previously held because its edition was missing, save the edition and use the staff re-evaluation control; all original eligibility checks still apply.

Outbox without `--send` only lists pending work. Sending requires Resend credentials and a sender. Sandbox delivery additionally requires `GRIM_TEST_EMAIL` and always uses that test destination. Live delivery requires `GRIM_SEND_EMAILS=approved`. Notifications use stable Resend idempotency keys. Ambiguous work older than 23 hours goes to manual review rather than risking a duplicate outside the provider's 24-hour window. Confirm provider delivery before resolving such messages. A protected Vercel worker runs daily at 12:00 UTC, with manual staff execution and a saved result. Webhooks remain the primary path. The worker uses a transaction-scoped advisory lock compatible with Neon pooling.

## Rollback

For an existing paid program, disable new enrollment with `grim disable` and remove the live-enrollment switch. Keep webhooks, the database, reconciliation, and customer cancellation available. Expire outstanding payable Checkout Sessions in Stripe when stopping enrollment urgently; disabling the page alone cannot retract an already-issued Stripe URL. Preserve all paid orders and audit records.

Before deploying a schema change, take a provider backup and test restoration. If application rollback is needed, retain a compatible webhook worker until pending events and paid invoices are reconciled. Never drop the Grim schema from a paid program. A disposable, unpaid local database can be discarded and recreated; this is the only destructive schema rollback used for testing. Reverting this code does not cancel Stripe subscriptions. Do not restore the single-plan billing worker while mid/high subscriptions exist; it cannot validate their Prices. Keep a compatible tier-aware worker and cancellation flow running.

## Decisions required before live enrollment

The approved offer, owner decisions, and remaining launch checks are kept in [the launch checklist](launch-checklist.md). The live draft is saved disabled; Jess’s final copy review does not automatically enable billing.

After approval and a successful real sandbox lifecycle, an explicit launch instruction is still required. Production additionally needs a live-mode configuration with an approval timestamp, `enabled=true`, and `GRIM_LIVE_ENROLLMENT=approved`. The configured membership must have `benefits_confirmed=true` and a defined shipping Price and amount. There is intentionally no command that enables live enrollment. This work did not set any of those live controls.

## Custom creation requests

The homepage carp showcase keeps its “Have an idea? Let’s talk.” link. It opens `/customs`, a separate public form with no account requirement.

Visitors provide a name, an email address or Whatnot username, their idea, and optional details. They can add a requested date and occasion. The date is for information only; it does not change queue order or create a completion or delivery commitment. A successful save shows a reference number, schedules a staff notification, and schedules a customer confirmation when an email was provided. It does not take payment or join a mailing list.

Authorized staff can open `/admin/customs` directly or follow the link from `/admin/grimmunity`. Requests sort by received time, oldest first, including requests with a date. Staff can add internal notes and change a request to New, Reviewing, In progress, Completed, or Declined. Completed and declined requests remain in the closed filter. Staff must contact the customer separately to agree on scope, pricing, and timing.

Migration 007 adds the separate `customs` schema to the existing environment-specific database. It does not change membership tables or billing approval. The request form uses `GRIM_DATABASE_URL`, `GRIM_MODE`, and `GRIM_SITE_URL`; staff access uses the existing exact-ID allowlist. Abuse control uses `GRIM_INTEREST_SECRET` with a separate keyed digest and a five-attempt hourly limit. Raw IP addresses are not stored in the custom request tables. Preview and Production remain isolated.

Migration 008 records pending staff and customer emails in the same transaction as a new request. Historical requests are not backfilled. Production uses `CUSTOM_REQUEST_SEND_EMAILS=approved`, `CUSTOM_REQUEST_STAFF_EMAIL=hello@moonafique.com`, and the existing Resend credentials and sender. Sandbox delivery remains disabled unless explicitly approved and requires `CUSTOM_REQUEST_TEST_EMAIL`; both message types then go only to that inbox.

The submission response triggers delivery immediately. Failed messages stay saved and retry without changing their original recipient, content, or provider idempotency key. The existing 12:00 UTC worker and a separate 00:00 UTC email worker provide backup checks. Each schedule runs once daily, consistent with [Vercel’s scheduling limits](https://vercel.com/docs/cron-jobs/usage-and-pricing). Staff can retry pending emails from the queue. Messages with an ambiguous delivery attempt older than 23 hours move to Needs review; check Resend before sending another copy. Sent means accepted by Resend, not confirmed inbox delivery.

The staff-only sample-email action sends two messages marked TEST to the configured staff inbox. The browser cannot choose a different recipient. The sample request is stored as completed and remains outside the open queue. A stable request key prevents duplicate sample sends on a retry.

Client submission keys prevent duplicate retries. Staff edits require the current revision, so a stale page cannot overwrite a newer change. Queue pages contain up to 50 records. There is no public request lookup or public queue endpoint.

## Payment integration references

The Stripe adapter follows the current [invoice-line parent and pricing fields](https://docs.stripe.com/api/invoice-line-item/object) and [InvoicePayment lookup](https://docs.stripe.com/api/invoice-payment/list). Refund/dispute handling uses [Stripe's current subscription webhook guidance](https://docs.stripe.com/billing/subscriptions/webhooks). The portal explicitly enables [shipping-address updates](https://docs.stripe.com/customer-management/configure-portal), which are off by default. Signup keeps the natural [monthly billing anniversary](https://docs.stripe.com/billing/subscriptions/billing-cycle). Notification retry limits follow [Resend's idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).
