# Private job costs and time

Staff open `/admin/whatnot/costs` from the Whatnot business dashboard. The same exact WorkOS staff allowlists protect the page, data, imports, saves, and exports. Nothing links here from public navigation or the sitemap.

## Working with Notion

Notion remains the editable recipe reference. Export **Inventory Cost and Sale Price** as Markdown & CSV, unzip the download, then use **Item reference → Update from a Notion CSV export**. Preview the import before replacing the snapshot. The import is bounded to 1 MB and 1,000 rows. Unnamed rows are skipped; malformed numeric values reject the entire import and preserve the saved reference.

This is a dated snapshot, not automatic Notion synchronization. The website has no Notion integration credential. Future automatic synchronization needs an authorized server-side Notion connection.

Choose the units used by the values in the filament price column. The existing table labels the column dollars per kilogram but stores values such as `0.025` dollars per gram. The importer converts explicitly selected per-gram values to dollars per kilogram. It does not infer a blended price for multiple values. Missing batch sizes use a flagged one-unit assumption.

Reference cards show the original Notion cost per unit, which excludes hands-on labor and may contain formula assumptions. Starting a job copies batch filament, batch machine hours, and per-unit packaging/finishing costs multiplied by the reference batch size. Check these estimates against actual usage. Changing finished units does not rescale inputs.

## Recording actual work

1. Start a blank job or choose an item reference. Use custom, regular batch, or development as the job type.
2. Record material grams and dollars per kilogram for each material, including purge, supports, waste, and reprints.
3. Record total job costs for packaging, hardware, paint, and other supplies.
4. Record total printer hours and the hourly machine allowance separately from hands-on time.
5. Add time entries by person and activity. The editable $25/hour default is a suggested planning allowance, not payroll or a market wage estimate.
6. Confirm the cost and time records are complete. Missing values do not become zero cost.
7. Link settled Whatnot orders, or enter net receipts from another channel. Quotes and unpaid requests stay without receipts.
8. Mark the job completed when finished. Only completed non-development jobs with full cost and receipt coverage enter the main result totals.

Use development jobs for prototype/design work that should not be charged repeatedly to each future item. Their recorded hours appear separately. A failed or development job may have zero finished units; per-unit cost is then unavailable.

## Calculations and limitations

Amounts are stored in integer USD cents. Material and time products are summed before rounding to cents. This first version supports USD only.

- Cash after direct costs = net receipts − material costs − other supplies.
- Earnings after machine allowance = cash after direct costs − machine hours × machine allowance.
- Contribution after valued labor = earnings after machine allowance − person-hours × each entry’s labor rate.
- Earned per hands-on hour = earnings after machine allowance ÷ recorded person-hours, before the labor allowance.
- Cost per finished unit = all recorded job costs, including machine and labor allowances, ÷ finished units.

Linked Whatnot earnings sum signed ledger entries for the selected order IDs and currency, including order-attributed refunds. Fees and shipping are already included in that net figure. Provider cost-of-goods values are not subtracted again. Account adjustments without order IDs, bank deposits, business overhead, income tax, and sales outside linked jobs are not included. Job dates drive the cost workspace filters; they are not settlement dates.

Each Whatnot order can belong to only one job, including archived jobs. Selected orders’ combined sold quantity must equal the job’s finished units. A job can cover a batch across multiple orders, but cannot allocate a fraction of one order to separate jobs. Search uses item titles or exact order IDs; ambiguous titles are never auto-matched. Refreshing financial reports updates linked earnings. Manual receipts require manual updates for later payments or refunds.

## Storage and recovery

Migration `002_job_costs.sql` extends the existing `whatnot_private` schema. It does not modify the applied report migration. The guarded production preparation runs both migrations with checksums and an advisory lock.

Jobs retain their source reference snapshot. Reimporting Notion never rewrites historical job inputs. Saves require the expected revision and serialize order assignment; concurrent edits fail without overwriting. The browser preserves unsaved edits on validation/network failure, warns before leaving, and offers reloading the saved version. New jobs keep a stable ID so an uncertain save cannot create a second job.

Every successful save records a private history revision and staff ID. Archive is reversible in the job form and retains order links. CSV export includes all jobs, archived records, detailed material/time lines, and monetary columns explicitly labeled in cents. Untrusted text is protected from spreadsheet formula execution.

No customer contact fields, tokens, provider report URLs, or raw Notion exports are committed to the repository. No order writes or customer messages are sent by this feature.

## Validation

`pnpm test:whatnot` includes costing arithmetic, explicit unit import, incomplete coverage, refund handling, route authorization/CSRF/size limits, concurrent writes, reference snapshot preservation, and revision history. Database tests require `WHATNOT_TEST_DATABASE_URL` pointing to a disposable loopback database named `grim_test`.

The browser workflow was checked with synthetic local jobs: save/reload, expected cost and earnings calculations, CSV preview/import, and a 390-pixel mobile layout. Live deployment and staff import verification are recorded in the release notes.
