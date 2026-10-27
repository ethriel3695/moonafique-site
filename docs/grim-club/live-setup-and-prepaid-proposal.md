# Live billing setup and prepaid pricing

Updated October 26, 2026. The owner authorized connecting Shippo and preparing the four live Stripe memberships, while keeping checkout closed until testing is complete.

## Completed live setup

The guarded `prepareLiveDraft` helper completed successfully in a Production build. It prepared the four monthly membership products and Prices: Grimm Starter $15, Grimm Keeper $30, ACEO Prints $10, and ACEO Originals $20. Products remain inactive. The database program is disabled, has no approval timestamp, and uses draft editions. The Production enrollment switch remains disabled. No customer subscriptions, charges, or shipping labels were created.

Setup candidate: `dpl_4rbf5T6Ug51XWEMJzLory4Ng3d3L`, `moonafique-site-1yhvri7hq-ethriel3695s-projects.vercel.app`. It was created with `--skip-domain`; the public site remains on the previously verified deployment. `GRIM_PRODUCTION_SETUP=draft` was used only as a build-time flag.

The production database was checked after setup: four tiers, `enabled=false`, and no approval timestamp.

| Membership | Monthly Stripe Price | Member cap |
| --- | --- | --- |
| Grimm Starter | `price_1UV0MiDuU4RwQbePjcXEgVgb` | None fixed |
| Grimm Keeper | `price_1UV0MjDuU4RwQbePBWcdcMyw` | 12 |
| ACEO Prints | `price_1UV0MjDuU4RwQbePkm49YamB` | 24 |
| ACEO Originals | `price_1UV0MkDuU4RwQbePkShHUUA3` | 12 |

Verification image: [prepared live monthly prices](screenshots/live-stripe-monthly-prices-20261026.jpg).

## Approved shipping direction

The owner wants shipping recalculated from carrier rates each month, charged automatically after a seven-day advance notice showing the itemized total. This is a new billing workflow. The currently deployed implementation still saves the initial shipping quote as a recurring amount; **it must not be opened under the new policy until replacement billing logic is implemented and tested**.

The replacement must keep the membership amount and each month’s shipping distinct, show tax and the charge date, preserve historical invoices, handle quote/email failures without an undisclosed automatic charge, and show the same figures in the member account. Address or price changes after notice require a new reviewed notice before collecting a changed total. Initial signup consent is separate from subsequent renewal notices.

## Approved prepaid prices

The owner clarified twelve months, not twelve years, and approved 5% off six months and 10% off twelve months on October 26. Members pay the membership amount upfront. Shipping remains a separate monthly charge and receives no discount.

| Membership | Six months at 5% off | Twelve months at 10% off |
| --- | --- | --- |
| Grimm Starter | $85.50 | $162.00 |
| Grimm Keeper | $171.00 | $324.00 |
| ACEO Prints | $57.00 | $108.00 |
| ACEO Originals | $114.00 | $216.00 |

All values exclude shipping and applicable tax. The owner has approved these discounts. Catalog preparation adds two recurring Prices per membership to the existing inactive products. It does not enable prepaid checkout. Storybook’s **Memberships → Billing options proposal** provides interactive examples, including shipping-only charges during the remaining prepaid months.

Review [the annual Keeper example](screenshots/prepaid-billing-proposal-20261026.jpg), or open [the interactive Storybook proposal](http://localhost:6006/?path=/story/memberships-billing-options-proposal--annual-keeper). The static Storybook build, TypeScript, and scoped ESLint checks pass. This verification covers the proposal display, not a working prepaid billing flow.

[Stripe supports mixed billing intervals with flexible billing](https://docs.stripe.com/billing/subscriptions/mixed-interval?dashboard-or-api=api), including monthly shipping alongside six-month or yearly membership charges. Its current documentation says mixed-interval subscriptions cannot be created through Checkout Sessions. The current app also validates monthly periods and one paid monthly edition per invoice. It therefore needs checkout, invoice validation, prepaid entitlement, cancellation, and refund changes—not just extra Stripe Prices. Previously prepaid deliveries must remain accounted for when renewal is canceled or shipping payment fails.

## Pending account access

The owner signed in to Shippo. Its API settings show no live token and offer a **Request Live Token** button. Automatic approval review blocked clicking that button because it may submit an external request or initiate commercial contact. The owner was asked to authorize that request or complete it themselves. No live key has been connected or extracted. Never request credentials in chat.

Do not activate products, enable the program, set live enrollment approval, send customer renewal notices, or purchase postage during setup and testing.

## Approved prepaid catalog receipt

All eight prepaid Prices were created successfully in live Stripe. The existing four monthly Prices were reused. The guarded setup committed all twelve Prices to the disabled program configuration. All membership products remain inactive, `enabled=false`, and `approved=false`. No customer subscriptions, live payments, emails, or labels were created.

The unpromoted Production candidate is `dpl_5XrCEjHrkUtXCVAfS3J8Co82MskT`, `moonafique-site-l5mf79f7d-ethriel3695s-projects.vercel.app`, source `445258d9`. Vercel reports **READY**. The public domain still points to `dpl_9XahLquzAqzQNDBsjWtZqoXuoNdA`. No new database migration was needed.

| Membership | Six-month Stripe Price | Annual Stripe Price |
| --- | --- | --- |
| `grimm_starter` | `price_1UV0zNDuU4RwQbePpKzSVQX3` | `price_1UV0zNDuU4RwQbePixHCqzXV` |
| `grimm_keeper` | `price_1UV0zODuU4RwQbePmuS4yDPF` | `price_1UV0zODuU4RwQbePUI4e25BE` |
| `aceo_prints` | `price_1UV0zPDuU4RwQbePo7Wktsd9` | `price_1UV0zPDuU4RwQbePG8K1SQag` |
| `aceo_originals` | `price_1UV0zPDuU4RwQbePYAsR0PdA` | `price_1UV0zQDuU4RwQbePiWmwMbWS` |

All 159 membership regression tests pass against the disposable local PostgreSQL database. TypeScript, scoped ESLint, and the static Storybook build pass. The approved pricing code and tests were pushed to the existing checkpoint branch.

A disposable Stripe sandbox test clock also verified an annual membership with a zero-cost monthly delivery schedule: the initial test invoice was $162 plus $6.25 shipping; the following monthly invoice remained a draft with `auto_advance=false`; a fresh $6.95 shipping invoice item could then be added without a charge. The test clock/customer/subscription were removed and its sandbox product archived. No email address was supplied. This probe validates the Stripe API approach; it does not verify an integrated seven-day notice or prepaid fulfillment workflow.

The probe confirmed that Stripe does not allow changing the price or amount of an existing subscription invoice line. The replacement must add a separately quoted shipping invoice item instead. It must keep renewal drafts and finalized invoices from automatic advancement until the delivered notice has aged seven days. Missing quotes, failed notices, changed addresses, or mismatched totals must block collection. Initial payment consent, cancellation across prepaid coverage, refunds/disputes, and remaining monthly deliveries still need integrated implementation and testing.

Shippo access remains pending: [live token required](screenshots/shippo-live-token-required-20261026.jpg). The signed-in account has no live API token; the owner has been asked to authorize the external live-token request.
