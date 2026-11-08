# Visitor experience audit — November 8, 2026

Moonafique's visual identity is consistent, and the distinction between subscription Grimms and Whatnot's Grimm of the Month is prominent. This pass focused on broken journeys, misleading details, keyboard access, and mobile usability.

## Changes

| Finding | Change |
| --- | --- |
| First edition repeated the raw month: “Moonafique collections · 2026-11 · 2026-11.” | Show “November 2026 collection.” Named editions retain their title and one readable month. Paid-edition cards use the same formatting. Stored edition dates are unchanged. |
| Empty search results removed the way back to the shop; request failures could leave loading stuck. | Keep the search heading and “View all products” link; add useful empty and retry states. Render initial searches on the server and cancel pagination requests when leaving the results. |
| Checkout referenced unavailable live shipping rates, omitted delivery-address collection, and redirected successful payments to a missing page. | Use verified live rates, collect U.S. delivery addresses, add a return-to-shop link, and show payment confirmation only after checking the Stripe session. |
| Free shipping was applied at $50, while the shipping page said $100. Transit estimates also differed between pages. | Per owner confirmation, use a $100 item subtotal for free standard shipping. Share shipping settings across checkout, product details, FAQ, and policy. Standard is $7 with a 5–7-business-day transit estimate; express is $15 with a 2–3-business-day estimate. Membership postage is separate. |
| Keyboard users had to pass every header control before reaching content. FAQ buttons did not expose their expanded state. The creations page lacked a main heading. | Add a skip link, accessible FAQ state, and a page-level showcase heading. |
| Newsletter copy still referred to membership launch signups. Policy pages automatically labeled today's date as their update date. | Remove stale launch copy and misleading automatic policy timestamps. The revised shipping page has a fixed revision date. |
| Every product thumbnail was marked as a priority image despite appearing well below the hero. | Let product thumbnails load lazily and request sizes that match their grid columns. |
| An old show snapshot could remain on first visit until the next polling interval. | Request a refresh on mount when the initial snapshot is stale. Keep the existing last-known schedule and outage handling. |
| Product details could show an empty Size field. | Offer a clear contact path for measurements when the catalog has no size. |

## Membership naming and subscription safety

The premium display name is **Grimmoire Collection**, formerly Grimm Keeper. The introductory membership is **The Grimm Path**, formerly Grimm Starter, following the owner's direction toward a collector's journey. Names are adapted in the offer, selected-plan summary, membership lookup, and account display. Existing members receive an explanation when the saved name differs.

Tier IDs (`grimm_starter` and `grimm_keeper`), Stripe product and price IDs, saved membership snapshots, included quantities, prices, billing intervals, and renewal logic are preserved. Existing Stripe invoices can retain the previous names. No subscription migrations or billing writes are needed for this rename.

## Items that still need attention

1. **Add actual product photos.** Six of the first eight public catalog entries have no image attached: Fossil – Triceratops, Baby Kaida with hand-painted eyes, Fossil – Raptor, Fossil – Spinosaurus, Fossil – Stegosaurus, and Kaida hand-painted eyes and dry brushed. These are missing catalog images, not failed image downloads. Accurate photos will make a bigger difference than decorative placeholders.
2. **Confirm the one-time order fulfillment routine.** The shop's Stripe webhook validates paid sessions and checks for shipping details, but label purchase and shipping-email automation remain commented out. Payment confirmation does not mean a shipment has been created. Review paid shop orders in Stripe and fulfill them manually until that workflow is implemented.
3. **Complete catalog details.** Several product descriptions or dimensions are sparse. Add size, included pieces, finish, and a clear photo of the actual item where missing. Product-specific page titles and sharing previews would be a useful next refinement.

## Verification

- Read-only crawl of 16 public pages: all returned HTTP 200; no missing image-alt attributes or broken internal anchors were found among those pages. The missing creations-page H1 was corrected.
- Desktop and 390-pixel mobile browser checks covered the edition label, membership selection, search recovery, cart quantities and prices, and menu focus. Live pagination expanded the catalog from eight to nine pieces without losing the first page. The mobile menu focuses its heading rather than the search input. The checked mobile pages had no horizontal overflow.
- An isolated local fixture exercised catalog failure followed by a successful retry. No real emails or payments were submitted in browser testing.
- Automated coverage includes edition formatting, retryable product requests, saved membership identity, the $100 shipping boundary, U.S. address collection, checkout return links, and paid/pending/unavailable confirmation states.
- Production builds now verify the configured live Stripe shipping rates and checkout return origin before publishing.

This is a focused usability and implementation audit. It is not a complete accessibility certification, legal review of policies, or an end-to-end paid-order fulfillment test.

Stripe reference consulted for the confirmation flow: [Customize redirect behavior](https://docs.stripe.com/payments/checkout/custom-success-page).

## Published release

Published to https://www.moonafique.com on November 8, 2026 from application commit `0bf4f4a9841db4cd075ff8f7f5d3a96a13cf5093` (Vercel deployment `dpl_Hgqs5F1fgmaRveDhQVfuXQ9gaHzP`). Both public domain aliases were verified.

Validation covered 87 storefront tests and 20 targeted membership tests, TypeScript, and lint checks of the changed interactive and checkout code. Staged and public smoke checks passed. Eighteen client bundles were checked for credential exposure. Private analytics and cost exports rejected unauthenticated requests, and cross-origin writes were rejected.

The final candidate created one unpaid checkout session with the expected U.S. address collection, live shipping rates, and return links. That session was immediately expired. The earlier candidate's unpaid audit session was also expired. No payments, membership changes, or customer emails were made during these checks.

The live browser confirmed both new names retain their existing tier values, the edition reads “November 2026 collection,” the mobile page fits a 390-pixel viewport, and the navigation menu focuses its heading. The final public browser checks reported no production console errors or warnings in the inspected log entries.
