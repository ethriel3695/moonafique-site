# Grimmunity production configuration

> October 25 update: the four-tier Grimm/ACEO offer and Shippo workflow are implemented and verified locally. The owner chose **local preview only** and **live shipping disconnected**. No production deployment or live Stripe pricing changes were made in this follow-up. The production configuration below remains the previous rollout record. See [the current implementation and handoff](collections-and-shipping.md).


Updated October 24, 2026. [The interest page](https://www.moonafique.com/grimmunity) is public. [The staff dashboard](https://www.moonafique.com/admin/grimmunity) requires the approved owner's Moonafique login. Waiting-list signup confirmations use their own delivery switch. Paid enrollment and paid-member notification delivery remain off.

Production deployment: `dpl_EhdTcX65mEmP5MXPYK9mfaWySDdP` (`moonafique-site-4ecwfazw2-ethriel3695s-projects.vercel.app`). Previous working deployment: `dpl_2yeyY8BFdtW2vDN4gGh7q5Wasy5Y`. Both keep paid enrollment closed. The final build passed and its daily cron definition was verified through the Vercel API.

## Resources

| Resource | Identifier / setting |
| --- | --- |
| Vercel project | `moonafique-site`, `prj_qyOQHMNvTfmMMlVFZkh1C14D9LkB` |
| Root | `packages/moonafique-site` |
| Production host | `https://www.moonafique.com` |
| Production database | `grimmunity-production`, free plan, iad1 |
| Neon project | `aged-cherry-13270058` |
| Vercel store | `store_eFzNVpAGCgLf1EDz` |
| Database connection | Production only, `GRIM` prefix, sensitive values |
| Stripe account | `acct_1QQsCqDuU4RwQbeP` |
| Membership Price | `price_1UU7A6DuU4RwQbePzYsUChY0`, $25 USD monthly, exclusive tax |
| Shipping Price | `price_1UU7A8DuU4RwQbePezlSV2fC`, $9.21 USD monthly, exclusive tax |
| Portal | `bpc_1UU7A8DuU4RwQbePVn4QPqJ9` |
| Signed webhook | `we_1UU7ElDuU4RwQbePr7eoXHcM`, enabled, `/api/grimmunity/webhook` |
| Stripe API version | `2026-04-22.dahlia` |
| Idaho tax registration | `taxreg_1UU7A9DuU4RwQbePRrMnP6ma`, scheduled November 1, 2026, 00:00 America/Boise |
| Worker | `/api/grimmunity/worker`, daily 12:00 UTC, plus authenticated staff POST |
| Email sender | `Moonafique <noreply@moonafique.com>` |

Live products remain inactive. The stored program is disabled, has no approval timestamp, and has November, December, and January **draft** editions. The owner approved 24 subscriber copies plus one retained copy, $25 + $9.21 monthly, and seven-day rolling dispatch. The final recovery cutoff and copy still need review.

## Environment separation

Production uses `GRIM_MODE=live`, `GRIM_SITE_URL=https://www.moonafique.com`, and the expected Neon project above. `GRIM_INTEREST_ENABLED=true` and `GRIM_SEND_INTEREST_EMAILS=approved`. `GRIM_LIVE_ENROLLMENT=disabled`, `GRIM_SEND_EMAILS=disabled`, `GRIM_REVIEW_UI=false`, and `GRIM_USE_SHARED_WEBHOOK=false`.

`GRIM_STRIPE_SECRET_KEY` currently holds the existing storefront live-account credential in a separate **sensitive Production-only variable**. It is a separate configuration name, not a second Stripe account or a new credential. The dedicated variable prevents Preview from falling back to the storefront's live key. Preview continues to use the **Grimmunity Testing** sandbox key.

Webhook secrets, database URLs, `GRIM_INTEREST_SECRET`, `CRON_SECRET`, and staff user IDs are stored in Vercel. Never put values in this document, source, logs, screenshots, or `NEXT_PUBLIC_*` variables.

The production WorkOS callback is `https://www.moonafique.com/callback`, registered with WorkOS. Production logout returns to the public domain. Existing development/Preview redirect values were preserved. The approved verified owner ID has staff access in both environments. No broad email-domain allowlist is used.

## Deployment procedure

The original workspace includes older homepage/showcase drafts. The owner separately approved the Print Wars and anonymous carp showcase on October 24; see [the homepage showcase notes](../homepage-showcase.md). Deployment copies now include that component, its homepage mount, and the approved lyre photo alongside the reviewed Grimmunity changes. The older Grimfest/ACEO showcase remains unmounted. Continue copying only reviewed files. The preparation copy used in this session is `/tmp/grimmunity-production-deploy-20261024`; temporary files are not a long-term source archive.

`vercel.json` runs the guarded migration preparation before the application build. Production setup verifies the connected Neon project and refuses a sandbox database. Applied migration checksums prevent silent edits. Do not edit migrations 001–005 after deployment.

The one-time build flag `GRIM_PRODUCTION_SETUP=draft` prepares the closed launch draft; it cannot approve or open enrollment. Do not leave it set on ordinary deployments. `GRIM_INTEREST_SMOKE_CLEANUP=approved` removes only the exact `.invalid` test email created by this verification; it does not delete customer signups.

Build with `--prod --skip-domain`, inspect the deployment, check the protected URL, then promote the verified candidate. Keep Vercel protection enabled for previews and deployment URLs. Do not promote the sandbox or connect its database to Production.

## Recovery and operating limits

[Neon's current free-plan documentation](https://neon.com/docs/introduction/plans) lists a six-hour history window, subject to its storage allowance, and one manual snapshot. The actual project's restore window and an end-to-end restore have not been verified in its console. Do not claim a daily or long-term backup exists. Before paid launch, confirm the retained history and test a restore to a separate branch/database; use a longer retention plan or an owner-approved encrypted backup process if needed. No paid plan upgrade was made.

For an application rollback, promote the last known good Grimmunity deployment while retaining the database and signed webhook. Closing enrollment does not stop existing billing or remove paid obligations. Keep webhook processing and fulfillment available for existing members. Do not drop the schema or roll back paid records.

For a database incident, first close new enrollment, retain Stripe's event and invoice history, and restore to a separate database/branch. Compare membership, invoice, fulfillment, and interest counts before changing the production connection. Replay pending receipts and reconcile paid invoices after recovery; idempotency prevents duplicate shipments. A provider restore can still lose interest emails recorded after its recovery point.

The worker is a bounded daily backup for webhooks, not a continuous alert service. Staff should review failures, pending events, and notifications each shipping day. There are no staff alert emails configured. Paid-member outbox delivery can be enabled only with the approved sender and launch authorization. Waiting-list confirmations have separate owner authorization and are enabled for new production signups. Preview delivery remains disabled; an explicit test destination is required before enabling it.

## Final verification

The final production deployment is promoted. The staff dashboard defaults to the upcoming November draft, and its manual worker completed without errors after the transaction-lock fix. Public homepage and Grimmunity routes returned 200; the legacy Grim Club route redirected to Grimmunity; unauthenticated worker and export requests returned 401. The production review route rendered Not Found without fixture content (its streamed HTTP response was 200).

The stable protected sandbox now points to `dpl_9DWPZaTyJtPhJeFSxBLBAvegiEXQ` (`moonafique-site-n1hwwysua-ethriel3695s-projects.vercel.app`). Its database was migrated without replacing the program. Browser verification confirmed the original test membership remains active with the saved $34.21 total. The sandbox storefront deliberately uses a nonfunctional placeholder key so it cannot access live product billing; its build logs show that expected catalog authentication warning. Grimmunity uses its separate valid sandbox credential.
