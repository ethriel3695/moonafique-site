# Subscription readiness — November 3, 2026

Target opening: Thursday, November 5. Grimmfest announcement: Saturday, November 7 at 7:30 p.m. MST. All launch dates and times in this record use America/Boise.

**Paid enrollment is not ready to open yet.** The connected sandbox signup, payment, confirmation, account, portal, and email checks now pass. The live Stripe account, twelve saved prices, managed portal, and webhook configuration also pass their audit. The two internal live shipping products and a $0 monthly delivery-schedule price are prepared; the four membership products remain inactive. Shippo's live key is now securely configured for the next Production deployment, and eight direct live quote checks passed. Production enrollment, automatic collection, and customer email flags remain disabled. No live payment or postage purchase occurred. One clearly labeled sandbox confirmation went only to the owner inbox. The actual first edition, sealed package confirmation, and final operating and reviewed-release checks remain outstanding.

## Shippo and production status

Shippo approved live API access on November 3. The owner explicitly authorized creating one live key, storing it securely in Vercel Production, and checking live shipping rates while keeping enrollment closed and buying no labels. The key was created in the [Shippo API portal](https://portal.goshippo.com/api-config/api), with Moonafique correctly classified as a **Direct shipper**.

`SHIPPO_API_KEY` is saved as a sensitive, Secret variable scoped only to Production in the existing `moonafique-site` Vercel project. Its value was not printed, committed, or added to local development or Preview configuration. The private transfer file was removed after secure storage; the one-time key display was closed. The [sanitized Shippo receipt](readiness-shippo-live-20261103.json) records configuration and quote results without the key or street addresses.

The current application's live shipping gateway returned USPS Ground Advantage rates for both package profiles at all four representative destinations:

| Destination | Grimm quote | ACEO quote | Carrier's estimated transit |
| --- | ---: | ---: | --- |
| California, 94105 | $6.45 | $6.45 | 4 days |
| New York, 10118 | $7.08 | $7.08 | 5 days |
| Alaska, 99503 | $8.95 | $8.95 | 13 days |
| Hawaii, 96813 | $8.95 | $8.95 | 14 days |

These are November 3 sample quotes using the current profiles: Grimm **8 × 8 × 8 inches, 8 oz**; ACEO **7 × 5 × 1 inches, 6 oz**. Actual carrier prices vary. This checks rating availability, not recipient-address deliverability or guaranteed transit. Carrier transit follows dispatch; the separate seven-day dispatch policy starts after successful payment. Confirm the sealed production packages before accepting these measurements as final.

Production remains on deployment `dpl_CzTQ9bSm98WCmz9MSfVoqVWSKqMi`, with status `READY`. No Production deployment was triggered. The later review deployment below targets Preview only. The saved key must be included in the next reviewed Production release before the deployed application can use it; see Vercel's [environment-variable guidance](https://vercel.com/docs/environment-variables). Its current launch controls are:

| Setting | Current value |
| --- | --- |
| `GRIM_MODE` | `live` |
| `GRIM_LIVE_ENROLLMENT` | `disabled` |
| `GRIM_MANAGED_COLLECTION` | `disabled` |
| `GRIM_SEND_EMAILS` | `disabled` |
| `GRIM_REVIEW_UI` | `false` |

Database, Stripe, Stripe webhook, Resend receipt webhook, and cron secrets have sensitive configuration records. Their values were not retrieved or decrypted. These records confirm configuration presence, not provider connectivity or current catalog/edition state.

The public membership overview and Grimmunity page loaded. Grimmunity still offers the launch-interest form with paid enrollment closed. Existing-owner Google sign-in through WorkOS returned successfully to the production member account, which showed no memberships. The public callback is correct. The `hello@moonafique.com` login received a 404 from the staff dashboard, consistent with its exact-account access restriction. The subsequent staff check below resolved which existing login works. No staff permissions changed.

The first provider-backed billing walkthrough below used the verifier's synthetic local owner. The later connected signup check exercised the current branch through a real WorkOS test session, a new Stripe test customer, the browser form, hosted payment, confirmation, account, and portal. Its environment and limits are recorded below.

## Checks completed now

| Check | Result and limit |
| --- | --- |
| Subscription regression suite | 194 passing checks against a new disposable local `grim_test` database. Covers all four tiers, billing options, capacity, payment recovery, cancellation, refunds, shipping, authorization, notices, and fulfillment. Payment and shipping failures in this suite use fixtures. |
| Membership and brand-page browser suite | 82 passing Storybook checks across the reviewed membership and brand stories, including complete Grimmunity, ACEO, overview, and About views. All nine new brand-page stories also passed accessibility checks. |
| Shippo sandbox | Both the Grimm box and ACEO mailer returned USPS Ground Advantage quotes for California and New York. No labels were purchased. |
| Hosted Stripe card setup | Completed with Stripe's test Visa. Verified `livemode=false` and $0 due at setup. Link saving was unchecked. |
| Hosted first invoice | Annual Keeper: $324 membership, $6.28 sandbox shipping, $19.44 test tax, $349.72 total. Paid through Stripe's hosted sandbox invoice. These shipping and tax figures are test results, not advertised customer rates. |
| Subsequent billing | The actual Stripe test clock verified a $6.28 shipping-only renewal, no payment at six days after notice delivery, payment after the scheduled notice interval, and exactly two monthly deliveries across the two paid invoices. |
| Prepaid cancellation | The sandbox subscription's cancellation date matched the end of its paid annual coverage. |
| Cleanup | The verifier's test-clock customer and subscription were removed. Its temporary products and portal were archived. The existing sandbox and production databases were not used. |

The notice timing check signed a fixture delivery receipt for the local outbox; it did not send a customer email. The earlier actual Resend inbox and production-receiver check remains recorded in [prepaid billing and notices](prepaid-billing-and-notices.md). Recheck delivery with the final release before launch.

TypeScript, scoped ESLint, whitespace checks, the local production webpack build, and the static Storybook build passed.

## Worker capacity finding

New tests used real local PostgreSQL rows and simulated one second of provider work per member. The existing forty-second worker budget, including reserved email time, checked at most 32 members per pass. Sixty queued members required two passes; 120 required four. Waiting members were processed before already-checked members repeated.

This verifies queue rotation under the simulated timing. It does not measure real Stripe/Shippo worker throughput. Starter has no fixed enrollment cap, so there is no single full-capacity number for the whole program. Live Shippo quote checks now work; measure the expected launch workload and agree on enough worker runs and staff monitoring. A single daily backup run must not be treated as proof that a busy launch queue will finish in time. The admin **Run billing checks** action is available; no additional production runs or scheduler changes were made here.

## Production staff verification follow-up

After the owner asked to continue, the existing **Jess and Reuben Ellis** Google login, `ellistech0215@gmail.com`, successfully opened the production staff dashboard. This account already had staff access. No allowlist or permissions were changed.

- November 2026, December 2026, and January 2027 all load through the staff edition selector and remain **draft**.
- Each displays dispatch within seven days of payment and separate tier limits. The dashboard shows Starter without a fixed cap, Keeper with 12 places, ACEO Prints with 24, and ACEO Originals with 12.
- There are zero memberships, paid fulfillment obligations, pending billing cycles, unresolved exceptions, pending events, or pending notifications. One person is on the launch-interest list; no contact details were exported.
- The latest completed backup billing check is November 3, with zero memberships checked and zero failures. No manual worker run was triggered during this follow-up.
- At this earlier staff check, the dashboard reported **Shippo API key needed**. The later Shippo setup is saved for the next reviewed deployment.

These screens do not expose the exact enrollment/cutoff timestamps or all twelve saved price options. Automatic approval review initially rejected opening the production Neon console because that access exceeded the staff-dashboard verification scope. The owner then explicitly authorized the limited read-only Neon audit below. It selected only program, membership-price, and edition configuration, excluding customers, addresses, credentials, and staff identities.

## Approved production Neon audit

The owner authorized the audit on November 3 and required enrollment to stay closed. The [approved queries](readiness-config-audit.sql) ran in Neon's SQL Editor against **grimmunity-production → main → neondb**, inside `BEGIN TRANSACTION READ ONLY` and `ROLLBACK`. All five statements succeeded. The three result sets contained one program, twelve price options, and three editions. The [sanitized receipt](readiness-neon-audit-20261103.json) omits product/price identifiers and the portal identifier; no credentials or customer records were retrieved.

**Enrollment remains closed:** `enabled=false`, `approved_at=null`, and all three editions are `draft`. The program uses `notice_shipping_v1`, U.S. delivery, USD, exclusive tax, seven-day rolling dispatch, and terms version `moonafique-notified-shipping-v3-2026-10-26`. A managed billing-portal reference is saved; the subsequent Stripe audit below verified its current controls.

All twelve saved amounts match the approved offer. Six months receive 5% off membership; twelve months receive 10% off membership. Shipping and applicable tax are additional, and shipping remains due for each monthly delivery.

| Membership | Monthly | Six months paid upfront | Twelve months paid upfront |
| --- | ---: | ---: | ---: |
| Grimm Starter | $15.00 | $85.50 | $162.00 |
| Grimm Keeper | $30.00 | $171.00 | $324.00 |
| ACEO Prints | $10.00 | $57.00 | $108.00 |
| ACEO Originals | $20.00 | $114.00 | $216.00 |

There are twelve distinct saved Price IDs across four Product IDs. This verifies the database's saved configuration, not the current status of those objects in Stripe. Each tier has monthly, six-month, and twelve-month options. All four benefits-confirmation flags are true and all four use Shippo shipping. The three edition allocations match Starter's uncapped offer, Keeper's 12 subscriber places plus one retained copy, Prints' 24 places, and Originals' 12 places.

The following are exact saved **draft** dates in America/Boise local time. Every listed time is midnight. Closing and cutoff timestamps are exclusive.

| Edition | Enrollment opens | Enrollment closes | Payment/address cutoff | Stored batch dispatch window |
| --- | --- | --- | --- | --- |
| November 2026 | Nov. 1, 2026 | Dec. 1, 2026 | Dec. 8, 2026 | Dec. 8–15, 2026 |
| December 2026 | Dec. 1, 2026 | Jan. 1, 2027 | Jan. 8, 2027 | Jan. 8–15, 2027 |
| January 2027 | Jan. 1, 2027 | Feb. 1, 2027 | Feb. 8, 2027 | Feb. 8–15, 2027 |

**The November opening is still November 1, not the November 5 target.** Thursday's exact opening time must be agreed and configured before launch. No schedule was changed during the audit. New checkout sessions also stop 31 minutes before an edition's enrollment close under the existing service rule.

The stored batch dispatch windows are draft setup defaults. With `fulfillment_lead_days=7`, the service assigns new paid orders a ship-by time seven days after verified payment; the customer and staff pages use that rolling dispatch policy. The batch dates are not an approved first-shipment commitment. Confirm the actual first edition and Jess's packing capacity before finalizing schedules or opening enrollment.

## Read-only live Stripe audit

At the owner's request, the existing server-side Stripe connection was used for retrieve/list calls only. The account identity matched the expected Moonafique live account. The audit used the twelve Price IDs and managed portal reference read from production Neon. The [sanitized receipt](readiness-stripe-audit-20261103.json) contains readiness results without credentials, customer records, or payment details.

| Check | Verified result |
| --- | --- |
| Live account | Card payments and payouts enabled; details submitted; no current or past-due account requirements and no disabled reason. |
| Twelve membership prices | All live and active. Amounts match the table above, with correct monthly, six-month, and annual intervals, USD, exclusive tax, and membership product metadata. No mismatches. |
| Four membership products | All live but **inactive**, consistent with the prelaunch hold. They must be activated as part of the separately authorized launch. |
| Managed billing portal | Live and active. Payment method, invoice history, customer details, and shipping address controls enabled. Stripe-side plan changes and subscription cancellation disabled, matching the application's managed billing and prepaid cancellation flow. |
| Billing webhook | The canonical `/api/grimmunity/webhook` endpoint is live and enabled on API version `2026-04-22.dahlia`. All 21 event types handled by the application are subscribed. |
| Tax registration | Stripe reports the Idaho registration active from November 1, 2026, at midnight America/Boise. This checks Stripe's registration state, not a customer's final tax calculation. |
| Internal shipping products | Absent at this initial read-only audit. They were subsequently prepared and verified in the separate closed-enrollment check below. |

At this initial billing audit, Vercel metadata confirmed the same production deployment ready, `GRIM_MODE=live`, and enrollment, managed collection, and customer emails disabled. `SHIPPO_API_KEY` was missing at that checkpoint and was subsequently configured as recorded above. The production billing credential's value was not retrieved; this audit establishes the live account's configuration, not an end-to-end connection through the deployed application's credential.

No live customer, checkout session, invoice, subscription, charge, refund, or portal session was created. This Stripe configuration audit did not send a fresh live billing event. The later check exercised actual Stripe sandbox event delivery and a real Resend callback to the existing production receiver. The deployed sensitive Stripe credential remains a separate final-release check; its value was not retrieved.

## Connected signup, email, and shipping follow-up

The owner authorized completing these checks while keeping enrollment closed. An isolated copy of the current branch ran against a new local `grim_signup_check` database, Stripe sandbox, and Shippo sandbox. No hosted preview or production deployment was made. The [connected-check receipt](readiness-connected-signup-20261103.json) records results without customer identifiers, addresses, or credentials.

| Check | Result |
| --- | --- |
| Authentication | The existing WorkOS test login used the registered `localhost:3000/callback`. The authenticated session then opened the isolated app at port 3200. Port 3200 is not an authorized WorkOS callback; no redirect allowlist was changed. This tests a first membership for an existing test identity, not new WorkOS identity registration. |
| Browser signup | Selected annual Keeper, entered the sandbox delivery address, received a real Shippo test quote, reviewed consent, and opened hosted Stripe card setup. A new Stripe test customer and one reservation were created through the application. |
| Card setup and first payment | Saved Stripe's test Visa with Link unchecked. Card setup took no payment. The separate hosted invoice was paid for $324 membership, $6.28 shipping, and $19.44 tax: $349.72 total. These are sandbox shipping/tax results. |
| Confirmation and account | Confirmation showed “Your first edition is confirmed.” The account showed Active Keeper, membership paid through November 3, 2027, one paid November edition, and dispatch by November 10 under the seven-day policy. There was no stale-data or unresolved-exception warning. |
| Stripe webhook | Stripe-originated checkout, subscription, customer, and paid-invoice callbacks reached the isolated application through a temporary webhook-only tunnel. The paid-invoice callback returned HTTP 200 and its event reached `done`. Reprocessing the same paid event did not duplicate the paid edition, fulfillment, or email. An unsigned Stripe callback returned HTTP 400. |
| Email | The application's outbox sent exactly one `[SANDBOX] Your Grimmunity edition is paid` message to `hello@moonafique.com`. Its content and account link were checked in that inbox. Retrying the sent outbox delivered zero additional messages. |
| Resend webhook | Resend recorded delivery at `2026-11-03T22:29:05.609Z`. The existing production receiver accepted its signed callback at `22:29:06.308Z` with HTTP 200 on attempt 1. The email ID and outbox tag matched this signup. A fresh unsigned production callback returned HTTP 400. Sandbox tags intentionally prevent any live notice clock or billing record from being updated. |
| Billing portal | Opened from the authenticated account, showed the saved test card, shipping information, and paid invoice, and returned to the account. No portal details were changed. The member login correctly received 404 from the staff page; no staff access was granted. |
| Actual shipping billing items | The sandbox first invoice used the active $0 monthly delivery schedule and $6.28 one-time postage item, with managed-shipping metadata, the shipping tax code, and exclusive tax behavior. No postage label was purchased. |

Stripe's portal displays “Your service is paused” for the application's deliberately paused Stripe collection schedule. The Moonafique membership remains Active and its own account shows the billing schedule. The account now explains this difference. Storybook includes **Memberships → Member account → Managed billing portal guidance**, with actions disabled.

The shipping review also found that an internal one-time postage price could pass the ordinary cart's product filter if submitted directly. The branch now excludes `grim_managed_shipping=true` products from both catalog display and cart checkout. Two regression cases cover direct postage checkout rejection and exclusion even if a one-time default price is assigned.

The [live shipping-product receipt](readiness-shipping-products-20261103.json) confirms preparation of the internal monthly delivery-schedule and postage products on the expected live account. Both are active, use the expected metadata and shipping tax code, and are excluded from the ordinary catalog. The delivery schedule has an active $0 USD monthly Price with exclusive tax. No fixed live postage price was invented: each postage amount still comes from the actual carrier quote. This used the existing server connection, not a retrieved production secret. All four membership products stayed inactive; no live customer, subscription, invoice, charge, or enrollment change was made.

This follow-up verifies the current branch locally and the already-deployed production Resend receiver. It does not deploy the branch, exercise a new live payment, or test a production notice clock using a live customer. Notice-to-clock binding and the seven-day collection guard retain the regression and sandbox billing evidence above. Final staff packing and the deployed release's credential checks remain part of release preparation.

The temporary Stripe webhook was removed, the test subscription canceled, and its customer removed. The four unique test membership products, twelve test prices, and test portal were archived. Shared sandbox shipping products and the prepared live internal shipping products were retained. The disposable local database was removed; the test app, webhook proxy, tunnel, and temporary PostgreSQL servers were stopped. The original dev server and Storybook review remain available.

The follow-up passed 11 route checks, 13 member-account Storybook checks, TypeScript, scoped ESLint, and the static Storybook build. The [managed billing account example](http://localhost:6007/?path=/story/memberships-member-account--managed-billing-portal-guidance) was also checked in the browser. Production metadata confirmed the deployment unchanged and enrollment, collection, and customer emails disabled. Public availability returned `editionId=null` and an empty availability map. Shippo was subsequently approved and configured as recorded at the top of this report; the connected-signup receipt preserves the earlier missing-key checkpoint.

## Brand review

The owner authorized a Preview deployment for Jess and Reuben to review, with enrollment closed and no Production release. The [website Preview](https://moonafique-brand-review-20261103.vercel.app) and [hosted Storybook](https://moonafique-brand-review-20261103.vercel.app/storybook/?path=/story/memberships-member-account--managed-billing-portal-guidance) are ready. Existing Vercel Authentication remains in place; a Vercel sign-in may be required. No public-access bypass or review invitation was created.

The deployed application source is `84f13616c85f120b5b94187316582efc4e3a883b` on `codex/brand-first-release`, deployment `dpl_9i24ZX6SjsNFAJRHcriCE8zYY5YG`. The [sanitized Preview receipt](preview-20261103.json) records the checks. The remote Next.js build passed. The deployed homepage, membership pages, About, navigation, cart drawer, and hosted account story were checked in the browser. Both membership pages show paid enrollment closed. All eight preexisting aliases, including the Production domains and older membership sandbox, remain unchanged.

This Preview is for visual review. It has no database connection or operational Stripe, Shippo, or email credentials. Its shop has no connected product catalog, and signup, checkout, and contact delivery are disabled. Use Storybook's sample cart, contact, signup, and member-account states to review those experiences. All 165 Storybook entries are hosted with the Preview; the required brand and account artifacts match the verified local build. No payments, postage labels, emails, or customer records were created by this deployment.

About was already rewritten in the first release. This readiness pass also updated the membership overview, Grimmunity, ACEOs, tier descriptions, and page metadata to match that voice. Prices, limits, included items, and financial terms retain the approved offer. Historical paid snapshots are not rewritten.

Storybook's **First release → Brand pages** contains full desktop pages and mobile examples for Grimmunity, ACEOs, and About. It also includes simulated open enrollment with the current monthly and prepaid choices. Submissions and external navigation are disabled in these review stories. Membership names remain unchanged. The tagline is still undecided.

## Needed from Jess and Reuben

| Owner | Needed before Thursday |
| --- | --- |
| Jess | Confirm the first Starter Grimm and accessories/pets, Keeper design and worn accessories, two ACEO prints, and original-art collection. Supply final photos or confirm which approved images can represent the opening offer. |
| Jess and Reuben | Confirm the first dispatch deadline and the number of orders you can make and pack within the promised timing, particularly Starter's uncapped offer. Confirm sealed package dimensions and weights for both collections. |
| Reuben | Shippo approval, live-key creation, secure Production storage, and eight live rate checks are complete. Review the deployed website Preview and hosted Storybook before approving a Production release. |
| Jess and Reuben | Use the existing Jess and Reuben Google login for staff tools, and choose who monitors shipping/payment/email exceptions and packing during launch and Grimmfest. Review the updated membership Storybook pages and final customer billing/cancellation wording. |

The first-edition designs, final photos, and dispatch deadline remain unconfirmed in this chat. The owner's November 3 copy approval does not resolve those production details.

## Remaining technical release checks

1. Live Shippo setup and eight rate checks are complete, including Alaska and Hawaii. Confirm the sealed package measurements and repeat quotes if those profiles change. Include the saved Production key in the reviewed release and verify the deployed staff readiness view while enrollment stays closed.
2. The Neon, live Stripe configuration, internal shipping-product preparation, and connected sandbox customer checks are complete. Configure the November draft for the agreed November 5 opening time and actual first edition. Keep the program disabled and unapproved while preparing these changes.
3. The branch is deployed to Preview and ready for Jess and Reuben's review. After review and separate authorization, prepare the Production candidate, check its deployed billing credential and callback configuration, and perform the final staff packing check against the actual first-edition setup. The visual Preview does not run live billing or signup. The connected local test used an existing WorkOS test identity and granted no staff access.
4. Measure provider-backed worker throughput for the expected launch queue and confirm the recovery/alert owner. Confirm database recovery arrangements.
5. Real signup email delivery and a fresh production Resend callback are verified. Confirm the reviewed release retains the correct server-only configuration and repeat its closed-enrollment smoke check after an authorized Production deployment. The branch has been deployed only to Preview; Production remains unchanged.
6. After these checks pass, obtain the separate launch instruction before activating live products, program approval, customer notification delivery, automatic collection, and enrollment. Prepare the launch-list announcement and Grimmfest link/QR destination separately; this check sent no announcements.

Thursday is the target, contingent on the remaining release checks. Shippo approval is resolved. Keep the working interest-list destination available for Grimmfest and describe enrollment as upcoming until the reviewed release and first edition are ready to open.
