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

The public membership overview and Grimmunity page loaded. Grimmunity still offers the launch-interest form with paid enrollment closed. Existing-owner Google sign-in through WorkOS returned successfully to the production member account, which showed no memberships. The public callback is correct. The `hello@moonafique.com` login received a 404 from the staff dashboard, consistent with its exact-account access restriction; the existing authorized staff login needs confirmation before checking production editions and fulfillment. No staff permissions changed.

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

## Brand review

About was already rewritten in the first release. This readiness pass also updated the membership overview, Grimmunity, ACEOs, tier descriptions, and page metadata to match that voice. Prices, limits, included items, and financial terms retain the approved offer. Historical paid snapshots are not rewritten.

Storybook's **First release → Brand pages** contains full desktop pages and mobile examples for Grimmunity, ACEOs, and About. It also includes simulated open enrollment with the current monthly and prepaid choices. Submissions and external navigation are disabled in these review stories. Membership names remain unchanged. The tagline is still undecided.

## Needed from Jess and Reuben

| Owner | Needed before Thursday |
| --- | --- |
| Jess | Confirm the first Starter Grimm and accessories/pets, Keeper design and worn accessories, two ACEO prints, and original-art collection. Supply final photos or confirm which approved images can represent the opening offer. |
| Jess and Reuben | Confirm the first dispatch deadline and the number of orders you can make and pack within the promised timing, particularly Starter's uncapped offer. Confirm sealed package dimensions and weights for both collections. |
| Reuben | Let us know when Shippo approves live access. Store the issued key through the secure production configuration workflow; do not paste it into chat or source. |
| Jess and Reuben | Confirm the existing authorized staff login and who monitors shipping/payment/email exceptions and packing during launch and Grimmfest. Review the updated membership Storybook pages and final customer billing/cancellation wording. |

The first-edition designs, final photos, and dispatch deadline remain unconfirmed in this chat. The owner's November 3 copy approval does not resolve those production details.

## Remaining technical release checks

1. Connect approved live Shippo access and verify actual rates for both sealed package profiles, including expensive U.S. destinations. Rate checks do not require buying a label.
2. Read the actual current program, all twelve configured prices, portal restrictions, and first and future editions through authorized staff tools. Replace obsolete November 1 opening assumptions with the approved opening time. Do not publish draft edition dates.
3. Verify fresh authentication, signup, confirmation, account management, and staff visibility together in the isolated sandbox. Do not claim the synthetic verifier proves the complete authenticated browser journey.
4. Measure provider-backed worker throughput for the expected launch queue and confirm the recovery/alert owner. Confirm database recovery arrangements.
5. Complete review of the brand branch, then verify the approved release's real email delivery and webhook handling while checkout remains closed.
6. After these checks pass, obtain the separate launch instruction before activating live products, program approval, customer notification delivery, automatic collection, and enrollment. Prepare the launch-list announcement and Grimmfest link/QR destination separately; this check sent no announcements.

Thursday is the target, contingent on these checks. If Shippo has not approved access, keep the working interest-list destination available for Grimmfest and describe enrollment as upcoming until checkout can be verified.
