# Prepaid billing and seven-day shipping notices

Implementation record, October 26, 2026. The owner approved 5% off six months and 10% off twelve months, paid upfront on membership only. Deliveries and additional shipping charges remain monthly. Checkout stays closed until a separate launch decision.

## Customer flow

1. Choose a membership and monthly, six-month, or annual billing. Get a Shippo quote for the delivery address and package profile.
2. Review membership, first-month shipping, tax, and renewal terms. Save a card in Stripe Checkout setup mode; this takes no payment.
3. Review and pay the separate itemized first Stripe invoice before the checkout hold expires. An unpaid initial invoice is voided before its place is released; payment races preserve verified paid membership.
4. Receive a fresh, itemized notice before later automatic payments. During prepaid coverage, membership is $0 on the monthly invoice; postage and tax remain due. Membership appears again when the selected term renews.
5. Manage paid coverage, monthly invoices, notices, delivery information, and holds in the account. Canceling renewal preserves the prepaid term; monthly postage remains due for deliveries during that term.

The dedicated Stripe portal handles payment methods, shipping information, and invoice history. Renewal is canceled through Moonafique so a monthly delivery boundary cannot accidentally end an annual term.

## Billing safeguards

Stripe uses flexible billing with a membership item and a $0 monthly delivery schedule. `send_invoice` prevents automatic charging, and `pause_collection=keep_as_draft` retains later invoices. The application adds a fresh, one-time Shippo shipping item and finalizes with `auto_advance=false`.

The worker freezes amounts, tax, products, periods, and delivery address before queuing a notice. A signed Resend delivery receipt starts the minimum seven-day wait. Preparation normally schedules payment eight days ahead, allowing delivery time. Late delivery or a missed collection window requires another notice. Missing or closed editions block payment instead of charging for an unavailable delivery.

Automatic collection requires its explicit flag, verified delivery, the full waiting period, an unchanged invoice and address, a supported subscription, a current edition, and valid membership coverage. Missing quotes remain visible and can be retried without payment. Bounced notices, financial adjustments, changed details, and uncertain payment outcomes block collection. A payment attempt is committed before external I/O; ambiguous attempts never automatically retry.

The noticed customer charge is fixed. Staff see the current carrier price before buying the label. A difference between the original quote and eventual label cost never silently changes the subscriber's charge.

## Prepaid deliveries and staff review

`grim.prepaid_periods` records each paid membership term. Each paid monthly shipping invoice grants at most one monthly edition and links to the covering membership payment. Annual prepayment does not create twelve copies of the first design. Each paid edition saves its actual shipping amount and current preferences.

Refunds, disputes, and adjustments hold unshipped deliveries and future charges. Shipped history remains intact. Rechecking the covering payment catches a missed refund webhook. A won dispute requires staff review before a held order is released.

Staff can reissue a notice for an unchanged invoice after reviewing delivery or payment status. Changed delivery details need a fresh quote and a replacement invoice: the unpaid old invoice is voided, the original membership term is retained, tax is recalculated, and a new notice period starts. Replacement intents are durable and recoverable. A payment racing replacement blocks it for review. This action cannot replace a paid invoice.

## Configuration

- Migrations 011 and 012 add billing cycles, prepaid coverage, verified delivery receipts, and replacement intents. Applied migrations 001–010 are unchanged. Historical paid snapshots keep their original billing flow.
- The disabled program uses `billing_policy=notice_shipping_v1`, the twelve reviewed Stripe Prices, and a dedicated portal with Stripe subscription cancellation disabled.
- Keep `GRIM_LIVE_ENROLLMENT=disabled`, `GRIM_MANAGED_COLLECTION=disabled`, and `GRIM_SEND_EMAILS=disabled` in Production. Products stay inactive; the program stays disabled and unapproved.
- Resend endpoint: `/api/grimmunity/notice-delivery`, listening for delivered, bounced, complained, failed, and suppressed events. `GRIM_RESEND_WEBHOOK_SECRET` is server-only and stored as a sensitive Vercel Production variable. Never record its value in source, screenshots, logs, or chat.
- The existing Resend API key is restricted to sending. The webhook was created through the signed-in Moonafique dashboard and must be enabled after its receiver is deployed. Receipts are scoped to a tagged outbox message and billing mode.
- The daily worker uses a forty-second billing budget within this project's sixty-second function limit, plus a bounded custom-request email backup. It rotates attempted members, sends queued notices before reconciliation, reserves time for newly queued notices, and throttles sends. Missed work delays payment or requires another notice; it never permits an undisclosed charge. Availability refreshes also reconcile expired unpaid first invoices. Test full-capacity throughput before launch; staff can run additional passes from the admin page. A larger membership base may require a more frequent scheduler or a hosting change.

Live Shippo access, current editions, active products, approved email and collection flags, program approval, and the separate enrollment switch are required before launch. Preparing this implementation opens none of them.

## Verification

All **192 regression tests** pass. TypeScript, scoped ESLint, the isolated production build, and the static Storybook build also pass. Public bundles contain no actual workspace credentials or return street address.

Automated checks include all twelve prepaid deliveries, annual and monthly renewal, late and bounced notices, quote recovery, changed addresses and amounts, duplicate requests, uncertain payments, cancellation, refunds, signature verification, staff review, replacements, and late-edition holds.

Two real Stripe sandbox checks used disposable test-clock customers and the configured Shippo sandbox:

- Hosted card setup and first payment: $324 annual Keeper membership plus $6.25 postage. Card setup took no payment. The next month's $6.25 shipping invoice stayed unpaid before the waiting period, then paid afterward and produced exactly one more monthly delivery. Cancellation retained the annual end date.
- Stripe Tax and replacement: the first invoice itemized $324 membership, $6.25 postage, and $19.44 tax. A new address produced a $6.43 quote. The old invoice was voided; the replacement passed notice, payment, and coverage checks.

These are sandbox results, not advertised rates or tax advice. No live subscription, live payment, or label purchase was created. Verification customers/subscriptions were removed; only their temporary products and portal configurations were archived.

Screenshots: [first invoice](screenshots/prepaid-first-invoice-sandbox-20261026.jpg), [shipping-only sandbox payment](screenshots/prepaid-shipping-renewal-sandbox-20261026.jpg).

The owner authorized exactly one clearly marked test notice to `hello@moonafique.com`, with sample amounts and no subscription or charge. Its delivery and webhook were verified below. Shippo approval and the final launch decision remain separate.

Review [the prepaid account examples](http://localhost:6006/?path=/story/memberships-prepaid-billing-and-notices--annual-keeper-shipping-only) and [the notice copy](http://localhost:6006/?path=/story/memberships-prepaid-billing-and-notices--seven-day-email). Stories use application components and the actual email formatter; actions are disabled.

The reusable verifier is `scripts/grimmunity/verify-prepaid-billing.ts`. It requires sandbox mode, a local database named `grim_test`, and `GRIM_PREPAID_VERIFY=approved`. It truncates that disposable database and refuses production. It sends no real email.

## Closed production deployment and delivery receipt

- Source commit: `0017410a` on `codex/site-checkpoint-2026-10-26`, pushed to GitHub. Deployment `dpl_CzTQ9bSm98WCmz9MSfVoqVWSKqMi` was promoted to `www.moonafique.com` on October 26, 2026 (America/Boise).
- Migrations 011 and 012 applied successfully using the existing recovery snapshot. Draft preparation verified `enabled=false`, `approved=false`, twelve approved Prices, and inactive Products. No live membership, payment, or label was created.
- The first candidate was rejected by Vercel because this project's Hobby configuration allows at most sixty seconds per function. The final candidate uses supported limits and keeps the current plan. The worker queue fairness regression passes.
- Public `/grimmunity` and `/aceos` return HTTP 200 and offer the interest list without checkout. `/api/grimmunity/availability` returns HTTP 200 with no open edition. An unsigned notice callback returns HTTP 400, `invalid_webhook`.
- Production `GRIM_LIVE_ENROLLMENT`, `GRIM_MANAGED_COLLECTION`, and `GRIM_SEND_EMAILS` remain `disabled`. Live Shippo remains disconnected. The dedicated Resend receipt webhook is enabled; its signing secret remains sensitive and server-only.
- Exactly one direct preview email was sent with subject **TEST ONLY — Moonafique billing notice preview** to `hello@moonafique.com`. Provider ID: `01a17bac-ffae-7f15-beda-9b3db125fe85`. Resend shows **Delivered** at `2026-10-27T04:44:59.015Z` (October 26 locally).
- Delivery event `msg_3LGNAON1xgungGltkZi1JiTMgd5` reached the production receiver at `2026-10-27T04:45:00.092Z` and received **HTTP 200** with `{"received":true}` on attempt 1. Its `preview` tag intentionally prevents a production billing record or notice clock from being created. Outbox binding and seven-day collection timing were tested separately in the regression suite and Stripe sandbox.

Proof: [delivered email](screenshots/prepaid-notice-delivered-20261026.jpg) and [successful signed webhook](screenshots/prepaid-notice-webhook-20261026.jpg). No signing secret is visible in either screenshot.

Before opening checkout: connect the approved live Shippo key, verify live carrier quotes and packing profiles, complete full-capacity worker testing, prepare the actual first edition, and make the separate launch decision. Keep email, collection, catalog activation, program approval, and enrollment gates closed until those checks pass.
