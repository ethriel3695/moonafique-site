# Private Whatnot business dashboard

Staff can open `/admin/whatnot` or follow **Whatnot business** from the existing membership or custom-request admin pages. The public navigation and sitemap do not link to it. WorkOS sign-in and the existing `GRIM_STAFF_USER_IDS` allowlist control access; knowing the URL does not grant access.

The four views cover settled financial activity, show performance, listing groups and buyers, and downloadable records. Date and currency filters apply to all three CSV exports. **Refresh from Whatnot** requests new reports, then checks their progress while the dashboard remains open. Reports can also finish after the browser closes; opening the dashboard resumes collection. Refreshing is on request, without a scheduled job. The last successful import remains available if a replacement fails.

## Metric definitions

- Settled item sales sum post-coupon item prices from order-earnings ledger rows. Prices already represent the line total; quantity is not multiplied into sales again.
- Net Whatnot activity sums signed ledger amounts, including tips and adjustments. Commission, processing, and seller-paid shipping are already deducted. This is neither bank deposits nor accounting profit.
- Paid orders exclude zero-price orders. Zero-price orders can include giveaways or fully discounted sales.
- Product cost is per unit. A zero recorded cost is treated as missing cost evidence, so incomplete costs never produce a profit claim.
- Show earnings are Whatnot estimates grouped by show date. Earnings per hour divides their sum by total live hours. Preparation, making, packing, and overhead are outside this measure.
- Buyer and viewer counts across shows are appearances, not deduplicated people. The buyer dashboard deduplicates reported usernames within the selected financial period. “Bought before this period” refers only to imported history.
- Products group by SKU when present, otherwise normalized listing title. Reused titles may represent different physical products. Standalone refunds are not allocated to title groups.
- Ledger completion and show dates use `America/Boise`. Daily report rows retain Whatnot's supplied calendar dates. The default period excludes partial days and compares an equal-length preceding period. Last calendar month's comparison is also equal-length; the exact comparison dates are displayed.
- Different currencies are never converted or added together. Show and daily reports describe sales activity and must not be added to the financial ledger.

## Access and storage

The server reads `WHATNOT_ANALYTICS_API_TOKEN`. Read Reports, Write Reports, and account identity access are needed for this workflow. Orders, inventory, customers, and payouts are not modified. The importer uses the financial report's buyer username, state, and country; it does not fetch customer emails or street addresses.

The `whatnot_private` PostgreSQL schema is separate from membership records. It holds refresh status and the latest complete normalized snapshot. Report IDs, row counts, generation times, and SHA-256 digests provide source references. Presigned download URLs and the API token are never saved in that snapshot or sent to the browser. CSV text is escaped against spreadsheet formula injection; signed numeric amounts retain their sign.

Every page read, export, and refresh checks staff access before reading storage or contacting Whatnot. Refresh also requires the canonical same-origin header. Responses are private/no-store and excluded from indexing. The former development/preview session recorder was removed from the root layout to keep staff data out of session recordings.

Imports validate seller identity, report type and date window, unique IDs, required columns, currency, quantities, amounts, and bounded CSV size. A database lease permits only one active refresh. All three normalized reports replace the saved snapshot in one transaction. Provider failures return fixed messages rather than raw responses, URLs, or credentials.

## Deployment and maintenance

`scripts/prepare-whatnot-analytics.ts` runs only in Vercel Production. It checks the existing expected Neon project and live-mode guards, rejects a sandbox database, verifies the Moonafique seller, and applies the private schema migration. Preview and local builds do not import real reports.

Initial setup can reuse already-generated reports through build-only variables: `WHATNOT_ANALYTICS_INITIAL_IMPORT=approved`, `WHATNOT_INITIAL_FINANCIAL_REPORT`, `WHATNOT_INITIAL_DAILY_REPORT`, and `WHATNOT_INITIAL_SHOWS_REPORT`. Normal refreshes do not need those variables. An existing saved snapshot makes bootstrap a no-op.

If Whatnot changes its report columns or download host, imports fail closed and retain the previous snapshot. Review the official schema before changing validators. If the token expires or loses permissions, update the existing server-only Vercel variable and redeploy. Do not put credentials in a `NEXT_PUBLIC_` variable.

## Verification

The analytics suite tests CSV parsing and formula escaping, signed money and quantity handling, DST/date comparisons, currency separation, unknown costs, account and report validation, anonymous/member denial, same-origin writes, private CSV headers, concurrency, idempotence, pending reports, and failed-import recovery. PostgreSQL integration tests require a disposable loopback database named `grim_test` via `WHATNOT_TEST_DATABASE_URL`.

Run `pnpm test:whatnot`, `pnpm test:storefront`, and `pnpm exec tsc --noEmit` from `packages/moonafique-site`. Browser checks use synthetic records in a separate temporary checkout. Real financial exports and screenshots must remain outside Git and public assets.
