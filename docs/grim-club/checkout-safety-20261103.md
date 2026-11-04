# Checkout safety and rehearsal — November 3, 2026

Enrollment remains closed on the public site. The changes in this record are on `codex/brand-first-release`. They are not in the hosted brand Preview or Production. Use the local rehearsal for the new checkout protections and current billing flow.

## What the payment check proved

A card saved in Stripe does not pay an invoice or create a shipment. A signed billing event wakes the app, which retrieves the invoice and its payment from Stripe. The app checks the customer, billing mode, currency, line items, and paid amount before allocating the edition. An unpaid invoice stays off the packing list. A payment after the reservation deadline can require staff review. The customer must not assume that saving a card confirmed a shipment.

The November 3 sandbox check used a real Stripe test card setup and invoice. The first charge returned `card_declined`. The app recorded zero paid editions and zero shipments. Retrying with a valid Stripe test card produced one paid edition, one shipment, and one queued paid email. Replaying the paid event did not duplicate any of them. A subsequent sandbox refund put the shipment on hold and changed the customer confirmation to **Your edition needs review**. No money moved, no label was purchased, and no email was sent by this specific check. The earlier [connected signup check](readiness-connected-signup-20261103.json) verified real signed Stripe delivery and one sandbox receipt arriving in the owner inbox.

A valid payment can still be disputed after dispatch. Recheck unresolved Stripe and staff exceptions before packing and buying a label. Keep tracking and delivery evidence. Stripe Checkout includes [card testing protections](https://docs.stripe.com/disputes/prevention/card-testing).

After the owner signed in, the live Moonafique Radar rules showed the highest-risk, default Stripe block-list, and failed CVC rules enabled. The rule that requests 3D Secure for every supported card and both postal-code failure rules were disabled. No rule was changed. Stripe [documents dispute notices by email and Dashboard](https://docs.stripe.com/disputes/responding); the previously audited live webhook subscribes to dispute events. The Team notifications page did not show a separate dispute recipient setting. No live dispute or test alert was triggered, so inbox delivery for live dispute notices remains unverified. Assign one person to monitor both Stripe Disputes and the staff exception queue.

## What changed on the branch

- Membership card setup and shipping quotes require a signed-in account with a verified email. Shared database rate limits throttle requests by account and IP before provider calls. The ordinary cart also checks the site origin and limits requests by IP.
- The general newsletter and membership launch list now require separate email confirmations. A submission queues a single confirmation link that expires in 24 hours. Opening the link alone does not sign up the address. The owner of the inbox must select **Confirm email**.
- Both forms use a hidden bot field, shared per-IP and overall request limits, and duplicate detection. A bot can still cause a limited number of confirmation messages. It cannot add an address to either list without the confirmation token. Confirmed newsletter contacts go only into the configured Resend segment; existing opt-outs stay suppressed.
- The staff launch export includes only verified launch-list entries. Preexisting unverified records remain stored for staff review. The migration does not email them or assume that their inboxes were verified.

## Try the current signup without a real charge

Open [the checkout rehearsal](http://localhost:3220/grimmunity) in Chrome on this Mac. This local app uses a separate PostgreSQL database, Stripe and Shippo test keys, and the current four-tier checkout. It stays available while its local processes run. Use your existing Moonafique member login. If you need to sign in again, use the existing local site on port 3000 first, then return to the rehearsal. There is no separate password to share.

1. Confirm the page says **Stripe sandbox — test payments only**. Choose **Grimm Keeper** and **Monthly**.
2. Use a synthetic U.S. address, such as Moonafique Sandbox, 100 Test Street, Boise, ID 83702. Calculate shipping and continue to Stripe.
3. Confirm Stripe shows test mode. Use [test Visa](https://docs.stripe.com/testing) **4242 4242 4242 4242**, any future expiry, and any three-digit CVC. Card setup should take no payment.
4. Return to Moonafique and select **Review and pay first invoice**. Check the membership, shipping, and tax lines before submitting the test payment. For the decline scenario, Stripe’s test card **4000 0000 0000 0341** can be saved but fails when charged.
5. Allow about a minute for the local payment check, then reload the confirmation or membership account. Look for one paid edition and one `[SANDBOX] Your Grimmunity edition is paid` email in `hello@moonafique.com`. An unpaid invoice must not show a confirmed edition. No test shipment will be sent.

The local rehearsal checks Stripe directly for its own invoices and sends test emails only to the owner inbox. It has no public webhook or live checkout route. The existing owner login opened the account. A browser ACEO Prints checkout obtained a $5.97 sandbox quote and saved a test card without payment. The separate Stripe invoice showed $16.57. Stripe’s embedded card frame did not load in this Chrome session, so the sandbox API paid that invoice with the saved test card. The browser account then showed exactly one paid ACEO edition. The labeled receipt arrived in `hello@moonafique.com` and identified the ACEO Prints rehearsal. Try the hosted Pay button again from a fresh browser as part of the release check. Grimm Keeper is still available for the owner’s rehearsal.

The protected brand Preview remains for visual review. To run this after the Mac’s local processes stop, restart the local rehearsal or provision an updated protected hosted sandbox. Never use a Stripe test card or a live test charge on Production. A no-charge production smoke check can verify the public routes, login, and closed-enrollment controls, but only a separate Stripe sandbox can simulate a complete card payment.

Verification passed: 201 membership tests, 29 storefront tests, four Storybook interactions, TypeScript, and scoped ESLint. The disposable decline test archived its test products and portal and removed its test customer and subscription. The separate local rehearsal remains available for review.

## Before opening subscriptions

- Review the new changes, apply migration 013 in the separately authorized closed-enrollment Production release, and confirm the opt-in links and inbox delivery on the actual domain. Set `NEWSLETTER_SEND_EMAILS=approved` and the intended `RESEND_NEWSLETTER_SEGMENT_ID` when the newsletter is ready. Review the legacy interest list before any launch email.
- Verify the deployed live billing and Shippo connections and staff hold handling. Confirm that expired unpaid checkouts free limited spots promptly and that staff can respond to an unexpected spike. The current daily backup is not enough evidence for a busy launch. Review whether stricter risk-based authentication or an edge bot challenge is warranted if abuse rises.
- Treat the ordinary store checkout as a separate release check. Its card payment is hosted by Stripe, but this branch has no `/success` page and no enabled automatic one-time fulfillment. Its session does not request a delivery address. Confirm the intended shipping countries and test a paid-only packing and receipt workflow before depending on it for one-time orders.
- Finish the first edition, dates, package measurements, and dispatch plan in the [November readiness record](readiness-20261103.md). Keep enrollment closed until you approve the release and launch separately.
