# Membership examples in Storybook

The local Storybook is at [localhost:6006](http://localhost:6006/?path=/story/memberships-cost-comparison--all-four-memberships). Open **Memberships** in the sidebar.

These examples use the current four membership prices and actual application components. All shipping amounts are illustrative. They do not contact Stripe, Shippo, or email services. Payment, label-purchase, and dispatch actions are disabled.

## Start here

- **Cost comparison → All Four Memberships:** compare base price, shipping, monthly subtotal, and package profile. Change **Grimm shipping / month ($)** and **ACEO shipping / month ($)** in Controls.
- **Cost comparison → Keeper And ACEO Prints:** see two memberships with two shipping charges. The example $6.25 shipping on each subscription produces a $52.50 combined monthly subtotal, before tax.
- **Signup and monthly totals:** view each membership before shipping and after a quote, plus loading, failed, expired, full, and sales-tax states. Change **Membership**, **Shipping / month ($)**, or **Shipping quote state** in Controls.
- **Communities overview:** compare the two collection summaries and links to their separate detail pages.
- **Spots left:** preview the count dropping from 24 to 23, the last print membership selling out, and Keeper entering the vault. The preview button changes example data only.
- **Offer and availability:** review separate Grimm and ACEO pages with closed or open enrollment, the final Keeper place, Keeper vaulting, and full ACEO tiers. Use the **club** control to switch collections.
- **Member account:** inspect all four memberships, holding a Grimm and ACEO subscription together, cancellation, missing delivery information, payment attention, shipment tracking, and a refund hold.
- **Shippo labels:** select an example shipping service and see its displayed price change. Also review purchased labels, uncertain purchases, and transaction recovery. No postage is bought.
- **Packing and fulfillment:** inspect all four saved packing promises, Starter color preferences, ready orders, address problems, payment holds, and shipped orders.

## Example costs

| Membership | Base price per month | Example shipping | Monthly subtotal before tax |
| --- | --- | --- | --- |
| Grimm Starter | $15.00 | $6.25 | $21.25 |
| Grimm Keeper | $30.00 | $6.25 | $36.25 |
| ACEO Prints | $10.00 | $6.25 | $16.25 |
| ACEO Originals | $20.00 | $6.25 | $26.25 |

The lower-mailer-price example is hypothetical. An ACEO mailer may cost the same as a Grimm box. Actual quotes depend on the carrier, destination, packed dimensions, and packed weight.

The shared package profiles are 8 × 8 × 8 inches at 8 oz for Grimm and 7 × 5 × 1 inches at 6 oz for ACEOs. Return addresses and credentials are not imported into the stories.

## Run and build

Use a current Node runtime; Node 25.9.0 was used for verification. From the repository root:

```sh
pnpm --filter moonafique-site storybook
pnpm --filter moonafique-site build-storybook
```

The retained development server listens only on the local computer. Storybook story files are in `packages/moonafique-site/components/grimmunity/`. The optional fixture-state inputs in `JoinForm` are ignored unless `fixture=true`. Storybook also prevents form submissions at the example-frame boundary.

The existing local installation had a missing macOS ARM optional binding for its locked `oxc-parser` 0.127.0 dependency. It was restored from the previously verified local installation of that exact package version. No package manifest or lockfile change was needed. A fresh complete install from the lockfile should provide that optional dependency normally.

The owner subsequently approved [production deployment](deployment-20261026.md) of the collection pages and copy. Storybook remains local. Paid enrollment and live Shippo remain closed.

## Verification

The October 26 copy and availability update adds three interactive spot-counter examples and one unknown-availability example, for **60 membership stories across eight groups**. See [membership copy and available spots](membership-copy-and-availability.md) for the polling behavior, database checks, and current validation.

October 26, 2026: the page restructure adds the Communities overview and separate ACEO enrollment examples, for **56 membership stories across seven groups**. The production webpack build, static Storybook build, TypeScript, scoped ESLint, and 22 targeted billing/authorization tests pass. Browser checks verify the overview links and the two collection pages. The updated static Storybook output is `/private/tmp/moonafique-communities-storybook-20261026`, served at `http://localhost:6006`.

October 25, 2026: the original build contained 52 membership stories across six sidebar groups. The static Storybook build, TypeScript, scoped ESLint, and all 147 membership regressions passed. Browser checks confirmed the Starter total and disabled checkout, recalculation from $21.25 to $23.95 when sample shipping changes to $8.95, and carrier selection updating the disabled sample-label button to $6.79. Storybook interaction checks passed for the inspected Starter and carrier-selection stories.

The static build is retained at `/private/tmp/moonafique-membership-storybook-20261025`. Its JavaScript does not contain the business street address. Storybook's normal Vite warnings about client directives and bundle size remain non-blocking.
