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
