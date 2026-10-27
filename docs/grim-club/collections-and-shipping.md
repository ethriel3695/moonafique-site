# Moonafique subscriptions and Shippo

Updated October 25, 2026. This document records the offer agreed during the business meeting and the new implementation. The former $25 Collector membership and $9.21 flat shipping fee are historical.

**Current state, October 26:** the collection pages and updated membership copy are live. The approved recovery snapshot and migrations 009/010 are complete. Four live monthly Stripe Prices now exist with inactive membership products and a disabled program. Paid enrollment remains closed; live Shippo remains disconnected. No customer subscriptions, charges, or shipping labels were created. See [the deployment record](deployment-20261026.md) and [the latest setup record](live-setup-and-prepaid-proposal.md).

The owner approved recalculating shipping monthly with seven days’ itemized notice before automatic payment. The deployed billing flow still repeats the initial shipping quote, so it must remain closed until the replacement passes testing. The owner approved 5% off six months and 10% off twelve months, on membership only, paid upfront. Prepaid checkout remains closed during implementation and testing.

## Collection pages

The [October 26 copy and availability update](membership-copy-and-availability.md) replaces public production notes with collector-focused descriptions and adds refreshing spot counts. The local preview shows capacity totals because it has no database connection.

October 26, 2026: the local site now has a shared `/communities` overview and two separate membership pages:

- `/grimmunity` describes Grimm Starter and Grimm Keeper, their prices, accessories, color preferences, member limits, shipping, and the Grimm showcase.
- `/aceos` describes ACEO Prints and ACEO Originals, their prices, monthly contents, member limits, and mailer shipping.

The overview summarizes both collections and links to their detail pages. The main navigation links to Communities. Both detail pages show only their own tiers, including in open-enrollment signup forms and allocation terms. Sign-in returns and canceled Stripe checkouts return to the selected collection. Billing confirmation, account management, staff tools, and API routes remain shared.

Both pages use the existing shared interest list for Grimm and ACEO launch news. No separate interest-list segment or database migration was added. Confirmation emails link to the Communities overview. Existing saved notification messages retain their original content.

The local preview remains available at `http://127.0.0.1:3049/communities`, using fake service credentials and no database connection. The approved production version is also available at `https://www.moonafique.com/communities`.

## Current offer

All prices are monthly, before shipping and applicable sales tax.

| Tier ID | Customer name | Price | Member cap | Retained copies | Monthly contents |
| --- | --- | --- | --- | --- | --- |
| `grimm_starter` | Grimm Starter | $15 | None fixed | 0 | One mystery Grimm in a fancy gradient or dual-extrusion finish, with a different ear option each month; all six emotion faces; two pairs of pants; two boots; two pets matching the monthly vibe |
| `grimm_keeper` | Grimm Keeper | $30 | 12 | 1 | One custom Grimm with a fancier paint job exclusive to the subscription; coordinated accessories on the Grimm itself |
| `aceo_prints` | ACEO Prints | $10 | 24 | 0 | Two physical ink prints of original ACEO artwork |
| `aceo_originals` | ACEO Originals | $20 | 12 | 0 | One original piece from the new monthly collection |

Starter offers at least $24 in value for $15. Members provide six distinct preferred colors and may list colors to avoid. Preferences guide a mystery design; they do not promise an exact custom color match. Preferences are saved with each paid edition. Account edits affect future paid editions.

Keeper produces 13 copies: twelve for members and one for the Moonafique collection. Its public offer reads **Vaulted for now** when all twelve places are allocated. This capacity status does not stop existing subscriptions from renewing. A stand is undecided and is not included in the promised offer. The separate Starter accessory pack and pets are not included in Keeper.

A customer can hold one Grimm subscription and one ACEO subscription. Each has its own checkout, recurring charge, shipment, address, and billing portal. Tier switching and automatic rejoining after cancellation remain unavailable. Do not manually swap Stripe Prices.

## Package profiles

The server reads the business return address from `lib/grimmunity/shipping-profile.ts`; it ships from Rigby, Idaho, ZIP 83442. The contact email is `hello@moonafique.com`. Set the optional `SHIPPO_FROM_PHONE` if a selected carrier requires a business phone number. The full street address must remain out of client bundles and public offer copy.

| Profile | Dimensions, inches | Packed weight | Notes |
| --- | --- | --- | --- |
| Grimm | 8 × 8 × 8 | 8 oz | Includes collectible, contents, box, and packing |
| ACEO | 7 × 5 × 1 | 6 oz | 5 × 7 bubble mailer; uses the high end of the owner-confirmed 3–6 oz range |

Weigh and measure the sealed parcel before buying postage. If a monthly design exceeds a profile, correct the profile and review its effect on shipping costs. A bubble mailer is quoted as a tracked parcel. This implementation does not use stamped-letter or untracked flat rates. A smaller mailer does not guarantee a lower postage price.

## Signup and recurring shipping

1. The customer selects one tier and enters a delivery address. Starter also collects six preferred colors and optional avoided colors.
2. The authenticated quote endpoint obtains a USPS Ground Advantage rate through Shippo. It does not purchase a label.
3. A quote belongs to the authenticated owner, selected tier, and exact delivery address. The server stores its amount and one-hour expiry.
4. The form shows membership price, monthly shipping amount, and combined monthly subtotal. The customer accepts recurring billing before opening Stripe Checkout.
5. Checkout uses the saved quote, not a browser-supplied price. A quote must have at least 31 minutes remaining when reserving a place. Stripe receives a separate recurring shipping Price on the same invoice.
6. The quoted shipping address is prefilled and fixed during Checkout so the customer cannot change destination after accepting the shipping rate. Later address changes require staff shipping review.

The accepted shipping amount recurs each month. Staff buy each month's label at the current carrier rate. Carrier price changes do not silently change customer billing. Changing an existing member's shipping charge requires customer communication and a reviewed billing change.

The website does not combine Grimm and ACEO shipments or waive one subscription's shipping automatically. Do not promise a combined-shipping discount until that behavior is implemented.

## Billing and capacity safeguards

Migrations 009 and 010 add membership families, immutable edition allocations, color preferences, shipping quotes, and label-purchase records. Applied migrations must not be edited. They preserve historical membership snapshots, charges, and fulfillment records; migration 009 closes new enrollment pending the new configuration.

Each monthly edition saves a separate capacity and retained-copy allocation for each tier. Reservation and payment allocation use the same program lock. Pending checkouts count toward capacity. The old shared 24-place limit applies only to historical offers without tier allocations.

Only eligible, verified paid invoices create packing obligations. Checkout completion, a shipping quote, or buying postage does not create an extra collectible. Historical invoices continue to validate against their saved membership and shipping Prices.

## Shippo credentials and staff workflow

Set `SHIPPO_API_KEY` server-side. Sandbox requires a `shippo_test_` key; live mode requires a `shippo_live_` key. Do not put either key in a `NEXT_PUBLIC_` variable or documentation. A test key cannot buy production postage through this implementation.

Staff lock the paid order's packing address, select **Get Shippo rates**, select a service, then confirm the displayed label price. The server checks payment, holds, address, selected rate, and quote age again. Quotes older than 30 minutes must be refreshed.

The purchase intent is committed before contacting Shippo. An uncertain purchase is held for review and is never automatically retried. After checking Shippo, staff can recover an existing transaction using its ID; the server verifies the order reference, selected rate, and mode. An unrelated transaction cannot be attached.

After a successful purchase, download the 4 × 6 PDF label. Dispatch the parcel, then choose **Mark dispatched**. Buying postage does not mark an order shipped. Once a purchase is pending or recorded, the packing address cannot be unlocked through the usual correction action.

## Launch status and checks

The four-tier setup helper prepares inactive live Stripe products and disabled program configuration. It cannot open paid enrollment. A live Shippo key, verified billing configuration, current edition allocations, signed webhook, and separate enrollment switch are required before opening.

The former sandbox contains historical test membership obligations. Do not overwrite its program with a new offer using a fresh seed or configuration command. Use a separate disposable sandbox for the new offer or prepare a reviewed migration preserving the old test subscriptions.

Automated checks cover concurrent tier caps, multiple membership families, quote ownership and expiry, color preference snapshots, refunds before postage purchase, duplicate purchase prevention, and uncertain purchase holds. Test results and deployment status are recorded in the production record after verification.

## October 25 verification and handoff

- All 147 tests passed against a disposable local PostgreSQL database.
- TypeScript and the scoped ESLint checks passed.
- An isolated production build completed successfully with test-only configuration. Its catalog warning was expected because the local storefront used a dummy Stripe key.
- The actual Shippo sandbox API returned rates for both approved package profiles. No label was purchased.
- The actual Stripe sandbox verified four monthly base prices and a Keeper Checkout with two recurring items: $30 membership plus a $6.25 sandbox shipping quote. The $36.25 session was expired without submitting payment; its synthetic test customer was removed.
- Browser inspection verified all four offer cards, six Starter color fields, and changing the selection to Keeper and ACEO Originals. Fixture checkout remains disabled.
- The production JavaScript bundle contained no copy of the business street address.
- A production candidate deployment was rejected by automatic approval review before execution because it needed explicit production authorization. The owner then selected local preview only and left live shipping disconnected. No alternate deployment route was attempted.

The retained local preview is `http://127.0.0.1:3049/grimmunity`; the interactive fixture form is `/grimmunity/review?screen=join`. It runs from the isolated review copy at `/private/tmp/moonafique-collections-deploy-20261025`. That copy uses the previous approved deployment source plus the scoped membership changes, so unrelated working-tree drafts are excluded. No real credentials were copied into it.

Remaining launch work requires a live Shippo key in Vercel Production, tested variable monthly shipping and notice handling, approved billing terms, current editions, activation of the reviewed Stripe products, and a separate paid-enrollment decision. Prepaid plans also require owner approval and tested prepaid billing and fulfillment. Do not treat the successful sandbox checkout as approval to charge customers.
