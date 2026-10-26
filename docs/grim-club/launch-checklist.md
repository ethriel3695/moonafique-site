# Grimmunity launch status — October 24, 2026

[The public interest page](https://www.moonafique.com/grimmunity) is live. Visitors can leave an email without making an account. Paid enrollment remains closed while Jess reviews the offer and the operator completes launch verification.

## Approved launch offer

- One Grim Collector membership: $25 plus $9.21 flat U.S. shipping every month, plus applicable sales tax.
- 24 subscriber places, with one additional copy retained for Jess. Existing limited editions keep their original promises.
- Enrollment planned for November 1, 2026, continuing until the places are filled.
- First shipment within seven days of signup; subsequent paid editions within seven days of successful payment. Billing renews monthly on the signup anniversary.
- A new Grim and matching pet, with a fun custom color design that is less elaborate than Grim of the Month, plus a collectible card. Colors are prepared for repeatable printing; do not advertise individual hand painting.
- The design has never appeared in the shop or as a Grim of the Month. An optional separate sale may start two calendar months after its subscription month: November → January.
- Idaho is the only state where the owner reports a sales-tax registration.

The owners approved this policy for the review draft: cancel before the next renewal to stop future charges; already-paid editions still ship; unpaid editions do not ship; recovery after an edition cutoff requires staff review. Final copy approval remains separate.

## Completed preparation

The dedicated free production Neon database is separate from the sandbox. Migrations support interest signup, membership accounting, rolling ship-by dates, variable Stripe tax, and worker status. Production staff access is restricted to the approved verified owner login. The production WorkOS callback now uses the public domain.

The public interest form passed a live browser submission, duplicate handling, consent and origin checks, and unauthorized-export checks. Staff login and the interest count were verified in the browser. New signups also receive a confirmation email. The list does not reserve a place or add contacts to the general newsletter. Sending the launch announcement remains a separate owner action.

Live Stripe prices are prepared for $25 membership and $9.21 recurring shipping, using exclusive tax. A separate billing portal permits invoices, payment-method updates, shipping updates, and cancellation at period end. Plan and quantity changes are disabled. Idaho tax registration is scheduled for November 1. Products and paid enrollment remain disabled. See [production resources](vercel-production.md).

Stripe webhooks are the primary payment path. A protected daily worker retries pending events, expires abandoned reservations, reconciles memberships, and retries approved notifications. The staff dashboard provides manual execution and the latest result. The daily 12:00 UTC schedule fits Vercel Hobby. Preview does not run cron.

The actual app outbox sent two test messages through Resend to the owner's explicitly approved login email: payment and shipping. Resend accepted both; replay sent zero duplicates. The owner confirmed both messages arrived. Customer email sending remains disabled.

The deterministic PostgreSQL suite passed 101 tests, with TypeScript and ESLint passing. It covers concurrency, replay, payment holds, exclusive tax, rolling fulfillment, access control, interest signup, and worker locking. Real Stripe lifecycle results are recorded separately in `verification.md`; do not infer those from fixture tests.

## Required before accepting money

1. Completed: real Stripe initial tax calculation, renewal, failure/recovery, cancellation, refund hold, address-lock protection, and duplicate-event replay. The owner’s original sandbox subscription was preserved. Portal controls were verified through the API; an interactive portal-edit walkthrough remains useful before launch.
2. Review the final offer and policy with Jess. Draft recovery cutoff: seven days after the subscription month ends; later payments receive staff review. Confirm the first design and card.
3. Confirm a packed-box shipping quote from 83442, including expensive U.S. destinations. The chosen fee is not a guarantee that every parcel covers packaging and postage.
4. Test emails arrived. Confirm the database recovery plan and staff alert handling before paid enrollment; the free database is not a long-term backup strategy.
5. Completed: signed live webhook probe, staff login, manual worker, tax calculation in the sandbox, and disabled-checkout controls. Activate the two live products only as part of the approved launch.
6. Apply final terms, edition schedules, and the program approval timestamp. Set the program enabled and `GRIM_LIVE_ENROLLMENT=approved` only after the owners approve. Enable customer notification delivery with the tested sender.

The production draft has November–January editions. Prepare future months before renewal dates. A missing edition is held for staff review; it is never guessed. Checkout stops about 31 minutes before a monthly edition boundary to avoid crossing editions during Stripe's minimum checkout lifetime. Review this boundary behavior before paid launch.

## Tax and shipping references

[Stripe documents recurring shipping as a separate Product with the shipping tax code](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior). The production draft uses tangible goods `txcd_99999999` and shipping `txcd_92010001`, with tax added above the displayed subtotal. Verify the actual Idaho invoice before opening enrollment.

[Idaho generally excludes separately stated delivery charges from the sales price](https://tax.idaho.gov/taxes/sales-use/guides-for-certain-groups/retailers/sales-price/). Stripe Tax calculation does not file the business's returns. The owner remains responsible for registration and filing. [Stripe Tax pricing](https://stripe.com/tax/pricing) lists Basic pay-as-you-go fees separately from payment and Billing fees.

## Credential maintenance

A sandbox secret was found in the local, untracked `.env.example` and replaced with a placeholder on October 24. No committed or publicly deployed copy was found. Rotate that sandbox key, replace its sensitive Preview value, and redeploy. Never print or copy a sensitive Vercel value into source. Production credentials are separate from that sandbox.
