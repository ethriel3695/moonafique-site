# Grimmunity Vercel sandbox

Initial sandbox setup record, October 24, 2026. Later production and lifecycle work is recorded in [production setup](vercel-production.md) and [verification](verification.md). The initial hosted sandbox signup passed. The owner completed the test payment, and Stripe’s customer portal and the Grimmunity account agree on the subscription, paid amount, and next billing date. Production had not been redeployed at this initial checkpoint; the later interest-page launch is recorded separately.

## Test site and configuration

Open https://moonafique-grimmunity-sandbox.vercel.app/grimmunity. Sign in to Vercel if prompted, then sign in to the Moonafique member account. These are separate logins.

The offer is one Grim Collector membership at **$25 plus $9.21 U.S. shipping each month**, totaling **$34.21**, with a **24-subscriber limit**. Both charges recur monthly. Stripe Checkout accepts U.S. delivery addresses only.

The sandbox has clearly labeled October 2026 through January 2027 test editions. Enrollment covers each calendar month. Payment and address cutoffs and dispatch windows are test fixtures in America/Boise time. The October edition says “no shipment.” These fixtures do not change the planned first real shipment in November 2026.

| Resource | Configuration |
| --- | --- |
| Vercel project | `ethriel3695s-projects/moonafique-site` |
| Ready Preview | `dpl_HE6C5SuUAPRP663irfoB1ktnabVd` |
| Immutable URL | https://moonafique-site-hysvagxqr-ethriel3695s-projects.vercel.app |
| Neon database | `grimmunity-sandbox`, Free plan, `iad1` |
| Neon project | `noisy-silence-66981734` |
| Vercel store | `store_pzSRPuPCgxT6po0R` |
| Database connection | Preview only, prefix `GRIM`, sensitive credentials |
| Migrations | 001 and 002 applied and verified |
| Stripe sandbox | User-provided key from “Grimmunity testing”; API confirmed test mode |
| Membership Price | `price_1UU6fWDXCSFYFpTTn1MqxwjA` |
| Shipping Price | `price_1UU6fWDXCSFYFpTThIJTZmuE` |
| Membership Product | `prod_grimmunity_preview_collector_v1` |
| Shipping Product | `prod_grimmunity_preview_shipping_v1` |
| Customer portal | `bpc_1UU6fWDXCSFYFpTTAAMF5Art` |
| Webhook | `we_1UU6fXDXCSFYFpTTDQbq59oR` |
| Stripe API version | `2026-04-22.dahlia` |

The portal supports payment-method updates, delivery-address updates, invoices, and cancellation at the end of the billing period. Plan changes and cancellation prorations are disabled.

## Test signup

1. Open the test site and sign in to the Moonafique member account.
2. Review the sandbox offer, select the recurring-payment checkbox, and choose **Join in Stripe sandbox**.
3. Confirm that Stripe shows test mode and a $34.21 monthly total.
4. Use test card **4242 4242 4242 4242**, a future expiry such as **12/34**, and any three-digit CVC. Use a U.S. test delivery address.
5. Submit the test subscription, then check the confirmation page and **My membership**.
6. Verify that the paid edition appears once and that the account opens the customer portal.

Use only [Stripe test cards](https://docs.stripe.com/testing), never a real card. The initial hosted payment and saved membership were verified on October 24. Renewal, cancellation, refund, recovery, and packing remain separate acceptance checks in `verification.md`. The earlier automated smoke check created and expired a different unpaid Checkout session.

## Isolation and secrets

`GRIM_STRIPE_SECRET_KEY` and `GRIM_STRIPE_WEBHOOK_SECRET` are sensitive, Preview-only variables. The uploaded API key was initially scoped to Production; its scope was corrected to Preview without changing its value. At this initial checkpoint, no `GRIM_*` variable targeted Production. Production now has a separate live configuration; never move the sandbox credentials there.

`GRIM_MODE=sandbox`, `GRIM_LIVE_ENROLLMENT=disabled`, `GRIM_SEND_EMAILS=disabled`, `GRIM_USE_SHARED_WEBHOOK=false`, and `GRIM_REVIEW_UI=false` remain configured for Preview. The expected Neon project is checked before database setup. Customer email delivery is disabled.

Vercel Authentication remains enabled. The webhook URL uses Vercel’s existing automation bypass token, while the application still requires Stripe’s signature. Keep the full webhook URL and bypass token private. The stable WorkOS callback is `https://moonafique-grimmunity-sandbox.vercel.app/callback`; it is registered in the existing test WorkOS environment. Browser member sign-in and navigation into Stripe Checkout succeeded on October 24.

The deployed preview overrides ordinary storefront Stripe and Resend credentials with inactive placeholders, clears the legacy public Stripe-secret variable, and sets site/login/logout URLs to the sandbox alias. Preserve these deployment overrides. The expected catalog authentication warning concerns the inactive ordinary storefront key, not Grimmunity’s test key.

## Setup workflow and checks

Deployment used an isolated source copy, excluding local environment files, Git metadata, dependencies, and build output. Nothing was committed or pushed. Vercel CLI 64.3.1 was installed temporarily.

The Preview-only build override is `pnpm grim:prepare-preview && pnpm build`. Normal repository builds still run `next build`.

`scripts/grimmunity/prepare-preview.ts` checks Preview mode and the expected Neon project, refuses a database containing a live program, applies checksum-verified migrations, and seeds missing fixtures. The explicit `GRIM_PREVIEW_SETUP=provision` phase creates test Stripe resources and saves their IDs. `GRIM_PREVIEW_SETUP=enable` validates the saved Prices, portal, and webhook before enabling sandbox enrollment. Do not rerun provisioning after memberships exist.

The setup ran inside Vercel using its sensitive secrets. The newly generated webhook signing secret was encrypted with a temporary local RSA public key before leaving the build, then saved directly into Vercel as a sensitive variable. No secret plaintext entered build logs or repository files. The temporary public-key environment variable and local transfer key pair were removed after successful verification. No administrative Vercel credential was sent to the deployment.

Verified on October 24:

- Local TypeScript and targeted ESLint checks passed.
- Guards rejected Production, live mode, a mismatched database, approved live enrollment, and a production server URL.
- Both Vercel builds passed, including Next.js and TypeScript.
- The real application reservation path created a Stripe test subscription Checkout for 3,421 USD cents, restricted to U.S. delivery.
- A portal session was created with the dedicated configuration.
- The unpaid test Checkout was expired and its reservation released. The test customer uses an undeliverable `.invalid` address and holds no paid seat.
- The deployed webhook accepted a locally signed `customer.updated` probe for that Stripe test customer (HTTP 200), including a duplicate. This checks signature verification, runtime Stripe access, and database processing; it is not evidence of Stripe-originated delivery of a paid invoice.
- Unsigned webhook: HTTP 400. Anonymous checkout: HTTP 401. Wrong-origin checkout: HTTP 403.
- Browser member sign-in completed through WorkOS and returned to the sandbox account page.
- The owner completed the hosted Stripe test payment. The confirmation page showed “Your first edition is confirmed.”
- The Grimmunity account showed Grim Collector as Active, next payment November 24, 2026, saved U.S. delivery details, and exactly one paid October test edition for $34.21. No stale-data, address, or payment-review warning appeared.
- Stripe’s “Grimmunity Testing” customer portal showed the current Collector and monthly shipping subscription at $34.21/month, next billing November 24, and one October 24 invoice marked Paid for $34.21.
- Sandbox subscription: `sub_1UU6mUDXCSFYFpTTw7qnIZqc`. No subscription, payment-method, address, cancellation, or refund settings were changed during this verification.

Earlier 86-test regression results remain recorded in `verification.md`. This setup added operator scripts; it did not change the billing or fulfillment runtime.

## Remaining before a real launch

Complete the remaining renewal, recovery, cancellation, refund, and packing lifecycle checks. The approved owner WorkOS ID now has staff access in Preview and Production. Test email delivery to the approved owner inbox passed separately. Add a secured runner for expiry, retries, and reconciliation; Vercel Cron does not run on Preview deployments.

Resolve tax treatment, retained copies, exact enrollment/dispatch dates, recovery terms, cancellation wording, and support details in `launch-checklist.md`. Current unresolved values remain labeled test fixtures. Live resources and live enrollment require a separate launch decision.

To stop testing, disable the sandbox program while keeping webhook processing active. Do not promote this Preview or connect its Neon database to Production.
