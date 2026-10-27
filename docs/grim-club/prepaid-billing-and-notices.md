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

The owner authorized exactly one clearly marked test notice to `hello@moonafique.com`, with sample amounts and no subscription or charge. Record its delivery and webhook result after deployment. Shippo approval and the final launch decision remain separate.

Review [the prepaid account examples](http://localhost:6006/?path=/story/memberships-prepaid-billing-and-notices--annual-keeper-shipping-only) and [the notice copy](http://localhost:6006/?path=/story/memberships-prepaid-billing-and-notices--seven-day-email). Stories use application components and the actual email formatter; actions are disabled.

The reusable verifier is `scripts/grimmunity/verify-prepaid-billing.ts`. It requires sandbox mode, a local database named `grim_test`, and `GRIM_PREPAID_VERIFY=approved`. It truncates that disposable database and refuses production. It sends no real email.
