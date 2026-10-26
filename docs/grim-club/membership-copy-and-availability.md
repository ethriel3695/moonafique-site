# Membership copy and available spots

Updated October 26, 2026. The approved pages and copy are now [deployed](deployment-20261026.md); paid enrollment and live Shippo remain closed.

The public pages describe the collecting experience and the included items. Production terms such as ink, dual extrusion, retained copies, and fixed member caps are removed from public offers. Prices, quantities, shipping, recurring billing, and cancellation information remain clear. Starter includes its accessory pack and two pets. Keeper includes the coordinated accessories worn by the Grimm.

The writing takes inspiration from the welcoming mail-club introductions used by [Visual Art By Eli](https://www.patreon.com/visualartbyeli/posts/monthly-print-168361696) and [Fish Side Up](https://www.patreon.com/posts/november-print-142601469). Moonafique’s wording and benefits are its own.

## Spot counts

- Capped memberships show the database count, such as **24 spots left**, **23 spots left**, or **1 spot left**.
- Zero remaining spots shows **Sold out** for ACEOs or **Vaulted for now** for Keeper. The signup choice is disabled.
- Starter has no fixed cap and shows no scarcity counter.
- Without a verified count, the card shows total capacity, such as **24 spots**. It does not claim that all 24 are still available.

`GET /api/grimmunity/availability` returns only the edition ID and tier counts, with `Cache-Control: no-store`. It exposes no customer details or program credentials. A failed database read returns 503. With no configured database, it returns an empty availability object.

The public page reads the count on load, every 30 seconds while visible, and when the visitor returns to the page. An edition change refreshes the page’s offer. A failed refresh removes the remaining-count claim until a successful refresh. Spot counts are not a reservation; the server checks capacity under the existing program lock before accepting checkout.

Counts include active members, allocated paid editions, and held checkouts. A paid member is counted once across those records. An expired unpaid checkout releases its spot after the existing reconciliation flow confirms expiry. Each membership family uses its own tier allocation.

The local preview has no database connection, so it displays total capacities. Storybook’s **Memberships → Spots left** examples demonstrate fictional counts and the last-spot transitions with all payment actions disabled.

## Saved membership details

`publicTierCopy` refreshes public wording for the current approved membership IDs and prices. It does not rewrite historical paid-member snapshots or change their financial terms. Capacity, retained copies, packing records, and staff controls remain in the database and staff workflow.

## Verification

All 151 regression tests pass, including database checks for checkout holds, paid-member deduplication, and released spots. TypeScript, scoped ESLint, the production webpack build, and the static Storybook build pass. Browser interaction checks verify the 24-to-23 example and the final spot for ACEO Prints and Keeper. The countdown story’s accessibility scan found no violations.
