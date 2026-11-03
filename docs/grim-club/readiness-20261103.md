# Subscription readiness — November 3, 2026

Target opening: Thursday, November 5. Grimmfest announcement: Saturday, November 7 at 7:30 p.m. MST. All launch dates and times in this record use America/Boise.

**Paid enrollment is not ready to open yet.** The current sandbox billing checks pass. Live Shippo access, the actual first edition, and the final operating and release checks remain outstanding. No production settings changed, no live payment or postage purchase occurred, and no real email was sent during this check.

## Shippo and production status

The owner submitted a follow-up to Shippo explaining the business and signed back in for this check. The signed-in [Shippo API settings](https://apps.goshippo.com/settings/api) still show **Request Live Token**. No live token is available on that screen. Do not submit another request while the owner's follow-up is pending.

A read-only Vercel metadata check confirmed the current production deployment is `dpl_CzTQ9bSm98WCmz9MSfVoqVWSKqMi`, with status `READY`. Production has no `SHIPPO_API_KEY` configuration record. Its current launch controls are:

| Setting | Current value |
| --- | --- |
| `GRIM_MODE` | `live` |
| `GRIM_LIVE_ENROLLMENT` | `disabled` |
| `GRIM_MANAGED_COLLECTION` | `disabled` |
| `GRIM_SEND_EMAILS` | `disabled` |
| `GRIM_REVIEW_UI` | `false` |

Database, Stripe, Stripe webhook, Resend receipt webhook, and cron secrets have sensitive configuration records. Their values were not retrieved or decrypted. These records confirm configuration presence, not provider connectivity or current catalog/edition state.

The public membership overview and Grimmunity page loaded. Grimmunity still offers the launch-interest form with paid enrollment closed. Existing-owner Google sign-in through WorkOS returned successfully to the production member account, which showed no memberships. The public callback is correct. The `hello@moonafique.com` login received a 404 from the staff dashboard, consistent with its exact-account access restriction. The subsequent staff check below resolved which existing login works. No staff permissions changed.

A complete new-customer signup through authentication, application checkout, confirmation, and account display remains a release check on the reviewed sandbox candidate. The provider-backed billing walkthrough below used the verifier's synthetic local owner.

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

This verifies queue rotation under the simulated timing. It does not measure real Stripe/Shippo throughput. Starter has no fixed enrollment cap, so there is no single full-capacity number for the whole program. Once live Shippo works, measure the expected launch workload and agree on enough worker runs and staff monitoring. A single daily backup run must not be treated as proof that a busy launch queue will finish in time. The admin **Run billing checks** action is available; no additional production runs or scheduler changes were made here.

## Production staff verification follow-up

After the owner asked to continue, the existing **Jess and Reuben Ellis** Google login, `ellistech0215@gmail.com`, successfully opened the production staff dashboard. This account already had staff access. No allowlist or permissions were changed.

- November 2026, December 2026, and January 2027 all load through the staff edition selector and remain **draft**.
- Each displays dispatch within seven days of payment and separate tier limits. The dashboard shows Starter without a fixed cap, Keeper with 12 places, ACEO Prints with 24, and ACEO Originals with 12.
- There are zero memberships, paid fulfillment obligations, pending billing cycles, unresolved exceptions, pending events, or pending notifications. One person is on the launch-interest list; no contact details were exported.
- The latest completed backup billing check is November 3, with zero memberships checked and zero failures. No manual worker run was triggered during this follow-up.
- The dashboard still reports **Shippo API key needed**.

These screens do not expose the exact enrollment/cutoff timestamps or all twelve saved price options. Automatic approval review initially rejected opening the production Neon console because that access exceeded the staff-dashboard verification scope. The owner then explicitly authorized the limited read-only Neon audit below. It selected only program, membership-price, and edition configuration, excluding customers, addresses, credentials, and staff identities.

## Approved production Neon audit

The owner authorized the audit on November 3 and required enrollment to stay closed. The [approved queries](readiness-config-audit.sql) ran in Neon's SQL Editor against **grimmunity-production → main → neondb**, inside `BEGIN TRANSACTION READ ONLY` and `ROLLBACK`. All five statements succeeded. The three result sets contained one program, twelve price options, and three editions. The [sanitized receipt](readiness-neon-audit-20261103.json) omits product/price identifiers and the portal identifier; no credentials or customer records were retrieved.

**Enrollment remains closed:** `enabled=false`, `approved_at=null`, and all three editions are `draft`. The program uses `notice_shipping_v1`, U.S. delivery, USD, exclusive tax, seven-day rolling dispatch, and terms version `moonafique-notified-shipping-v3-2026-10-26`. A managed billing-portal reference is saved; its current Stripe controls were not inspected by this database-only audit.

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

## Brand review

About was already rewritten in the first release. This readiness pass also updated the membership overview, Grimmunity, ACEOs, tier descriptions, and page metadata to match that voice. Prices, limits, included items, and financial terms retain the approved offer. Historical paid snapshots are not rewritten.

Storybook's **First release → Brand pages** contains full desktop pages and mobile examples for Grimmunity, ACEOs, and About. It also includes simulated open enrollment with the current monthly and prepaid choices. Submissions and external navigation are disabled in these review stories. Membership names remain unchanged. The tagline is still undecided.

## Needed from Jess and Reuben

| Owner | Needed before Thursday |
| --- | --- |
| Jess | Confirm the first Starter Grimm and accessories/pets, Keeper design and worn accessories, two ACEO prints, and original-art collection. Supply final photos or confirm which approved images can represent the opening offer. |
| Jess and Reuben | Confirm the first dispatch deadline and the number of orders you can make and pack within the promised timing, particularly Starter's uncapped offer. Confirm sealed package dimensions and weights for both collections. |
| Reuben | Let us know when Shippo approves live access. Store the issued key through the secure production configuration workflow; do not paste it into chat or source. |
| Jess and Reuben | Use the existing Jess and Reuben Google login for staff tools, and choose who monitors shipping/payment/email exceptions and packing during launch and Grimmfest. Review the updated membership Storybook pages and final customer billing/cancellation wording. |

The first-edition designs, final photos, and dispatch deadline remain unconfirmed in this chat. The owner's November 3 copy approval does not resolve those production details.

## Remaining technical release checks

1. Connect approved live Shippo access and verify actual rates for both sealed package profiles, including expensive U.S. destinations. Rate checks do not require buying a label.
2. The Neon configuration audit is complete: saved prices, allocations, program controls, and exact draft dates are verified. Before launch, verify current Stripe catalog/portal controls and configure the November draft for the agreed November 5 opening time and actual first edition. Keep the program disabled and unapproved while preparing those changes.
3. Verify fresh authentication, signup, confirmation, account management, and staff visibility together in the isolated sandbox. Do not claim the synthetic verifier proves the complete authenticated browser journey.
4. Measure provider-backed worker throughput for the expected launch queue and confirm the recovery/alert owner. Confirm database recovery arrangements.
5. Complete review of the brand branch, then verify the approved release's real email delivery and webhook handling while checkout remains closed.
6. After these checks pass, obtain the separate launch instruction before activating live products, program approval, customer notification delivery, automatic collection, and enrollment. Prepare the launch-list announcement and Grimmfest link/QR destination separately; this check sent no announcements.

Thursday is the target, contingent on these checks. If Shippo has not approved access, keep the working interest-list destination available for Grimmfest and describe enrollment as upcoming until checkout can be verified.
