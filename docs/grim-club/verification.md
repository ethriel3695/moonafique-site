# Current verification — October 24, 2026

The public interest page and production staff login are verified on `www.moonafique.com`. Paid enrollment remains disabled. Earlier fixture results below are historical and separate from these provider-backed checks.

The latest local regression run passed **132 tests across eight files** after adding custom request notifications. TypeScript, targeted ESLint, and `git diff --check` passed. Earlier membership verification included a scan for full Stripe credentials in the reviewed feature, scripts, example configuration, and documentation.

## Custom request form and staff queue

The carp showcase’s existing “Have an idea? Let’s talk.” link now opens `/customs`. The homepage does not contain the custom form. The initial form deployment applied additive migration 007 successfully. Production deployment `dpl_56ffYkjY71X5rYY1CsTFCTTHShGH` was promoted to `www.moonafique.com`; Preview deployment `dpl_6Jb9GWXidbXD7f79DCcGPYdy19na` was assigned to `moonafique-grimmunity-sandbox.vercel.app`.

The first sandbox attempt exposed a missing Preview `GRIM_INTEREST_SECRET`. The attempt showed an error and saved no request. A separate random Preview secret was added, the sandbox was redeployed, and the preserved form submitted successfully. Production already had its own secret.

Browser checks verified the live homepage link, public form, confirmation reference, and private staff queue. Sandbox requests exercised Whatnot-only contact with a date and occasion, email-only contact without a deadline, missing-contact validation, saved internal notes, status updates, reload persistence, and removal from the open filter after completion. The public date fields and staff controls fit a 390-pixel viewport without horizontal overflow. The viewport override was reset afterward.

A clearly labeled synthetic live request also reached the Production queue. The staff account marked it completed with a test note. The two sandbox fixtures were also completed. These records remain in the closed filter for verification history; they require no customer contact or production work. No emails or payments were generated during that initial form walkthrough.

Anonymous HTTP checks returned 200 for `/customs`, a sign-in redirect for `/admin/customs`, 405 for public API reads, and 401 for staff mutations. Automated tests also cover ordinary-user rejection, cross-origin writes, invalid and past dates, concurrent duplicate retries, concurrent rate limits, environment isolation, pagination, and stale staff edits.

Custom requests do not change subscription availability or paid enrollment. Queue access uses the existing approved staff allowlist. The initial version used on-screen confirmation only; the email follow-up below adds notifications for new submissions.

### Email notifications and received-order policy

The owner selected `hello@moonafique.com` for staff alerts and authorized customer confirmations when an email is provided. The form introduction, date helper, acknowledgment, success screen, staff queue, and email templates now state that requests are handled in the order received. A requested date is for information only and neither changes queue order nor commits Moonafique to completion or delivery by that date. The database query sorts by received time rather than the requested date.

Migration 008 records staff and customer notification intents atomically with new requests. Historical requests are not emailed. Tests cover optional customer email, both recipients, copy, HTML escaping, deduplicated concurrent deliveries, failed-send recovery, frozen retry payloads, the 23-hour ambiguity hold, test-sink restrictions, and staff-only sample emails. TypeScript and targeted ESLint pass.

The public submission schedules email delivery after saving; the two protected daily workers provide backup checks. Staff can see Sent, Pending, and Needs review states and retry pending delivery. Sent means the provider accepted the message; it does not prove inbox arrival. The staff sample action sends only to the configured staff inbox and stores its fixture as completed.

Automatic approval review rejected a proposed full Production environment export because it included unrelated secrets. No environment file was created. Testing instead uses the authenticated staff sample action, keeping all credentials on Vercel.

Published on October 24, 2026: Production `dpl_DK1WVgsfW1FZAa9fAvoRNZeHCRYv` and sandbox `dpl_1XTSWkFDTTbdm8NfMKRDKoLJQsax` both built successfully. Production was promoted to `www.moonafique.com`; the sandbox alias was updated separately. Production enables custom-request email delivery to the approved staff inbox. Sandbox outbound custom-request emails remain disabled.

The live staff sample action reported two emails sent with zero requiring another check. Both the staff notification and customer confirmation went to `hello@moonafique.com`, with `[TEST]` subjects. Completed fixture `f9b61ed5-d909-4361-8aaf-c6c2dc0a6a3a` displays Sent for both notification records. This verifies provider acceptance, not inbox arrival. The fixture stays outside the open queue; existing customer requests were unchanged and were not emailed retroactively.

Live browser review confirmed the revised introduction, date helper, acknowledgment, and staff queue copy. The closed queue displayed records oldest first. The public page remains a separate form at `/customs`, linked from the homepage showcase. A screenshot of the live date policy is saved in the task's visualizations directory as `custom-request-policy-live.png`.

## Grim of the Month showcase

The separately approved [homepage creations showcase](../homepage-showcase.md) includes supplied photos and Archie’s non-contest appearance. Its publication and subsequent updates are recorded in the linked notes. The Grimmunity behavior below is preserved.

The Grimmunity offer page includes August, September, and October 2026 Grim of the Month cards above membership details. August and September are sold out and vaulted. The owner set October availability to two copies as of October 24. All three are identified as Whatnot-only releases, separate from the Grimmunity membership designs. Each card now displays its Grim and pet in a separate CSS crop of the owner's straight-on group photograph. The image's encoded pixels are unchanged; identifying metadata was removed from the site copy. The AI-generated previews were not used.

The edition records, approved image path, descriptive alt text, crop coordinates, and manual availability date are in `packages/moonafique-site/lib/grimmunity/showcase.ts`. The original group photo is `public/showcase/grim-of-the-month-august-september-october.jpg`. October links to the existing Moonafique Whatnot profile. Availability is not synchronized with Whatnot; update the count and date when the owner confirms a sale.

The owner later supplied `Grimfest_Whimsical_Font.mov`, a 34-second portrait film. The showcase now places a video feature above the three edition photos. The original file remains unchanged. Its website copy is a 720 × 1280 H.264/AAC MP4 with a fast-start header, 5,310,641 bytes (48% smaller than the source). The poster is an actual frame from the film; the soundtrack and on-screen text are retained. Source creation metadata was removed.

The player starts muted when at least a quarter of it is in view, loops, and pauses outside the viewport or when the tab is hidden. It respects reduced-motion preferences by requiring manual playback. An explicit pause/play button and native sound, seek, and fullscreen controls remain available. A visitor’s manual pause is preserved across scrolling. The adjacent copy and accessible description identify the editions and distinguish Whatnot releases from membership designs.

Video verification: TypeScript, targeted ESLint, whitespace checks, and both deployment builds passed. The full MP4 decoded without errors and its fast-start header precedes the media payload. Browser checks confirmed muted automatic playback, offscreen pause and return, manual pause persisting across scrolling, manual replay, and inline playback without horizontal overflow at 390 pixels. The public site served the video successfully with all three edition photos still present. Reduced-motion behavior is implemented but was not exercised with an OS preference override. Current video deployment: Production `dpl_E7GfGSinLqJRoSNfFfV5PSMNiopY`; sandbox `dpl_H8CJZrq9cGCcm1pURkayCQYN1FWc`.

The photo update passed TypeScript, targeted ESLint, whitespace checks, and both Vercel builds. Browser review verified full Grim-and-pet framing on desktop and mobile, all three images loading, and no horizontal overflow at 390 pixels. The public `/grimmunity#grim-showcase` page has no remaining photo placeholders. Photo-release production deployment: `dpl_FsJxsMt6znbS37oUzNL7Ry145yBN`; corresponding sandbox deployment: `dpl_8q6Kv99tPF2PozzcnP7xoCsoncxF`. Paid enrollment remains closed.

TypeScript and targeted ESLint passed. Desktop (1280 pixels) and phone (390 pixels) browser checks confirmed the three cards, status labels, and link; no mobile horizontal overflow was found. Production deployment: `dpl_F1Togm8cbDPndyFEQd4EEtQdMBbi`. Stable sandbox deployment: `dpl_7j5HSMUecEhxAUuKbPz9jVUKwaMW`.

## Waiting-list confirmation follow-up

The owner authorized automatic confirmations for new waiting-list signups and one test to the verified login email. Migration 6 adds a confirmation queue without backfilling old contacts. The updated suite passes **106 tests across five files**, including concurrent normalized signups, provider failure with an unchanged retry, an expired deduplication window, sandbox recipient isolation, and removing an unsent contact. TypeScript and targeted ESLint passed.

The real Resend test accepted one review email, ID `01a16ec3-74ab-7e32-8cdd-5d7050ee8491`. The subject is `[TEST] You’re on the Grimmunity waiting list!`. Running delivery again sent zero additional messages. This test used a disposable local sandbox record and the verified owner as the only recipient; it did not add the owner to the production waiting list. Provider status lookup returned HTTP 401, so acceptance is verified but inbox arrival still needs the recipient’s confirmation.

The email was visually checked in a browser. It explains the future launch notice, no reserved membership or charge, the separate newsletter, and how to request removal. Retry behavior follows Resend’s [24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys); immediate delivery uses Next.js [`after`](https://nextjs.org/docs/app/api-reference/functions/after).

Production deployment `dpl_A2ih1ucBo1DBeDirYpJ9PREiz27e` is published to `www.moonafique.com`. The live browser shows the updated confirmation-and-launch consent, and paid enrollment remains closed. The stable sandbox points to `dpl_AydpGZ89cuZvsooFe6La2csVAXYB`, with delivery disabled. Both builds applied migration 6 successfully; the existing contacts were not emailed. The stored production flag `GRIM_SEND_INTEREST_EMAILS=approved` enables confirmations independently of paid-member emails.

## Mobile navigation follow-up

The mobile sidebar now closes when a navigation link is activated. The change uses the existing sheet close control for all menu links and New Drops. At a 390 × 844 viewport, the protected Preview passed page navigation, category query navigation, New Drops anchor navigation, and keyboard activation of the current page. TypeScript and targeted header ESLint passed.

Published to the stable sandbox with deployment `dpl_BHuVYGAmn55fjWUpCxK9LTv21Mrh` and to production with `dpl_BxRFvbCfxTBBjSPyR8aDTUgWxJrR`. The production browser check confirmed that selecting Grimmunity closes the sidebar and reveals the page. Paid enrollment remains closed and the public interest form remains available.

## Actual Stripe sandbox lifecycle

The operator ran `scripts/grimmunity/verify-stripe-lifecycle.ts` in Vercel Preview using the **Grimmunity Testing** sandbox. The runner guarded the sandbox account and Neon project, created a separate temporary database and test-clock customer, and used the real Stripe gateway and membership service. It did not modify the owner's original test subscription. No real charge or customer email was created.

| Check | Result |
| --- | --- |
| Initial Idaho invoice | $25 membership + $9.21 shipping + $1.50 tax = $35.71; automatic tax complete. |
| Initial allocation | Exactly one paid order; ship-by date seven days after payment. |
| Packing | Real payment and shipping retrieval; packing CSV includes the locked address. |
| Address update | Stripe customer shipping updated; saved packing address stayed unchanged and an exception appeared. |
| Portal | Restricted configuration accepted and a real portal session opened through the API. |
| Renewal | Test clock produced a second paid monthly invoice and exactly one second order. |
| Replay | The actual Stripe `invoice.paid` event was processed twice; no duplicate order. |
| Failed renewal | Attached decline card produced an open invoice and past-due subscription; no shipment was allocated. |
| Recovery | Replacing the payment method and paying the invoice produced exactly one additional order. |
| Refund | A real sandbox full refund moved the order to a packing hold. |
| Cancellation | Cancel-at-period-end stopped the next renewal and preserved previous paid orders. |
| Cleanup | Test clock/customer and temporary verification database were removed. Original sandbox membership remains intact. |

Successful verification deployment: `dpl_CJBmDo8Nk4an8MgiAkkZ28dBS4Xr`. Test subscription: `sub_1UU7HaDXCSFYFpTTW14DGm5g`. Invoice IDs: `in_1UU7HbDXCSFYFpTT08rET2o9`, `in_1UU7HrDXCSFYFpTT5yX0pDYi`, `in_1UU7I8DXCSFYFpTTPuubpuTd`. These are test records, not customer charges.

The first attempts found a missing sandbox tax head-office address. A fictional address was configured only in that test account, then the complete run passed. The production business address was not changed.

## Production and email checks

- Public email-only form: valid submission and duplicate returned success; consent omission and cross-origin submission were rejected.
- Approved owner login reaches the staff dashboard. The test signup appeared once; the synthetic record was then removed.
- A harmless, correctly signed live webhook probe returned 200. An invalid signature returned 400. This checks the signature and HTTP path; it is not a live customer-payment test.
- Unauthenticated worker and interest export requests returned 401.
- Staff manual billing check completed with zero failures and no live memberships.
- Two real Resend messages went only to the explicitly approved owner email. Provider acceptance succeeded, replay sent zero duplicates, and the owner confirmed both arrived.
- Paid enrollment and normal customer email delivery remain disabled.

## Limits before paid launch

The actual Stripe test exercised API changes for payment methods, address, and cancellation; it did not click those controls in the hosted portal. The earlier hosted Checkout test remains the evidence for browser signup. Dispute and 3-D Secure edge cases retain deterministic test coverage rather than a new real sandbox run.

Confirm the database recovery plan and final copy/operating policy before opening paid enrollment. Rotate the previously exposed local sandbox key as recorded in the launch checklist. Do not use this verification as permission to change the live enrollment gates.

---

## Earlier implementation record

# Grimmunity verification record

## Hosted sandbox signup — October 24, 2026

The owner completed a Stripe test payment through the protected Vercel Preview. Verification used the signed-in Grimmunity account and Stripe’s customer portal, with no further payment or subscription changes.

- Confirmation: “Your first edition is confirmed.”
- Grimmunity membership: **Grim Collector — Active**, with a successful fresh Stripe refresh and no stale-data warning.
- Stripe current subscription: **$34.21/month**, comprising Collector membership and recurring U.S. shipping.
- Stripe invoice history: one October 24 invoice, **$34.21 Paid**.
- Next payment: **November 24, 2026**, matching on both services.
- Fulfillment view: exactly one October sandbox edition, **Paid $34.21**, labeled “no shipment.” The account query joins the saved fulfillment and invoice entitlement.
- Delivery: saved U.S. address; no missing-address or payment-review warning.
- Portal access: opened successfully from the account and returned to it.
- Stripe sandbox subscription: `sub_1UU6mUDXCSFYFpTTw7qnIZqc`.

This verifies the initial hosted signup and billing-to-membership path. It does not verify a later renewal, replay of the paid event, portal edits, cancellation, refunds, recovery, or packing. The earlier signed `customer.updated` duplicate probe is separate from a paid-invoice replay. No real funds moved. Production remains unlaunched.

See [Vercel sandbox setup](vercel-sandbox.md) for the deployed resources and isolation controls. The October edition and dispatch dates are test fixtures; the approved first real shipment remains November 2026.

## Earlier implementation checks — October 15, 2026

The local implementation, including the three-tier update, is ready for code and fixture review. It is **not verified for live enrollment**. No usable Grim Stripe sandbox key, recurring Price, portal configuration, test-clock customer, or authenticated staff/customer sandbox session was available. Existing environment settings included a live storefront key; it was not used for subscription testing.

## Approved shipping fee and November launch plan

The launch plan now uses $25 membership plus $9.21 recurring U.S. shipping, an initial limit of 24 subscribers, and first shipments in November 2026. The monthly total is $34.21 before any added tax. Exact enrollment and dispatch dates remain unapproved. The owners confirmed Vercel as the deployment host.

The public page displays these values while enrollment remains closed. Review and sandbox fixtures use a separate 921-cent recurring shipping item and capacity 24; their Stripe IDs are fictional. Historical regression fixtures retain their original capacity and fee values. Negative tests explicitly remove shipping configuration to retain coverage of the signup gate. All 86 tests, TypeScript, and targeted ESLint pass.

See the [launch-plan screenshot](screenshots/grimmunity-launch-plan.jpg). No real Stripe charges, database configuration, or deployment was performed. Validate postage using a fully packed sample before opening enrollment; the published rates and margin calculation are in the launch checklist.

## Grimmunity rename verification

The public, account, staff, and API routes now use `/grimmunity`. Navigation, page titles, customer emails, payment return links, and feature imports use the new name. All 86 existing tests pass against the disposable local PostgreSQL database. TypeScript and targeted ESLint pass after regenerating Next.js route types.

Local HTTP checks confirm that the new page returns 200 and old public/account/staff URLs return 308 redirects. Checkout query parameters survive those redirects. Both API prefixes retain the same anonymous portal rejection (401) and unconfigured-webhook rejection (503), with no POST redirect. The browser displays the renamed page at the canonical URL; see the [Grimmunity screenshot](screenshots/grimmunity-preview.jpg).

The production build was not repeated for this rename. Live enrollment remains closed; no Stripe objects, customer records, or applied migration contents were changed.

## Current single-membership and separate-shipping follow-up

The current offer is one $25 Grim Collector membership plus a flat U.S. shipping fee. The fee is undecided. The public copy promises a new Grim never previously seen in the shop or released as a Grim of the Month, with a fun custom color design and pet. Separate purchase is held until two calendar months after the subscription month. Staff enforce that sale hold through the release log; the catalog does not enforce it automatically.

All 86 Grim tests pass, including historical multi-plan regressions and new single-membership and shipping cases. The new tests verify that retired choices are rejected, a missing fee blocks signup, membership and shipping recur together, and one monthly invoice creates one shipment. Missing, duplicate, wrong-price, wrong-amount, wrong-period, and wrong-quantity shipping lines cannot enter packing. The Stripe adapter tests both recurring Checkout items, configuration metadata, and subscription item order.

TypeScript and targeted ESLint pass. The isolated production build passes with fictional credentials; the ordinary catalog logs its expected invalid-key response and uses its fallback. The public offer renders one $25 membership at 1280 and 390 pixels without overflow. The mobile signup fixture shows one selected membership and disables both consent and checkout while shipping is undecided. A narrow-screen overflow in that form was corrected by allowing the button label to wrap.

Current screenshots: [desktop](screenshots/single-membership-desktop.jpg) and [mobile](screenshots/single-membership-mobile.jpg). Existing multi-tier screenshots and results below are historical. No real Stripe transaction, deployment, production database operation, or customer message was performed. Real sandbox verification and launch decisions remain outstanding; see [launch checklist](launch-checklist.md).

## Earlier three-tier offer follow-up (superseded)

The owner approved Starter $18, Collector $23, and Curator $33 per month with standard U.S. shipping included. The closed offer, selectable review form, shared sandbox data, and example configuration now use these prices and the approved Grim-and-pet contents. Existing database programs and historical order snapshots were not rewritten.

After this update, all 73 Grim tests pass against the disposable local PostgreSQL database. TypeScript and targeted ESLint pass. The isolated local preview uses fictional payment and authentication settings with no membership database. The public page and development fixture page render successfully. Desktop (1280 pixels) and mobile (390 pixels) have no horizontal overflow. Keyboard selection changes Collector to $23 and Curator to $33 in the summary and recurring consent. Fixture checkout remains disabled.

The [approved desktop comparison](screenshots/approved-tiers-desktop.jpg) and [approved mobile comparison](screenshots/approved-tiers-mobile.jpg) replace the earlier screenshots as evidence for current offer copy. Earlier fixture screenshots and their broader browser results remain historical. No production build or live service validation was repeated for this copy/configuration update. Live enrollment remains closed. Tax treatment, edition limits, dates, member perk delivery, and launch configuration still need decisions and verification.

## Completed checks before the approved offer follow-up

| Check | Result |
| --- | --- |
| Existing TypeScript baseline | Passed before implementation. |
| Existing full lint baseline | One existing `no-explicit-any` error at `.storybook/main.ts:33`. |
| Existing Storybook suite | Cannot start under default Node 20.16 (`ERR_REQUIRE_ESM`). Under Node 25.9, its existing `oxc-parser` native binding is unavailable. |
| Grim integration and route tests | 73 tests pass, using real local PostgreSQL 13.4 plus deterministic Stripe/Resend fixtures. |
| TypeScript after implementation | Passes. |
| ESLint for new and changed feature code | Passes. |
| Production Next.js build | Passes with fake test Stripe credentials. The existing catalog fetch logs the expected invalid-key response and renders its fallback. |
| Desktop, tablet, mobile review | 15 screen/viewport combinations return HTTP 200 without horizontal overflow, at 1440, 1024, and 390 pixels. |
| Keyboard and accessible error | Keyboard navigation selects the mid/high tier, updates recurring consent and total, submits only the tier ID, and displays a `role=alert` error with visible focus. |
| Real local auth guards | Anonymous billing portal returns 401. Anonymous staff page redirects to WorkOS (307). |
| Browser runtime | No page errors in the review run. Twelve PNG screenshots saved, including a compact tier comparison. |
| Migration | Applies transactionally and can be repeated without changing existing records. |
| Unrelated work | Existing homepage/showcase changes preserved. Newsletter route unchanged. |

[Browser results](screenshots/browser-results.json) contain the viewport and authentication checks. [Screenshots](README.md#review-the-result) are explicitly labeled presentation fixtures. They do not represent an actual Stripe transaction or a logged-in staff session.

Tier tests also exercise each tier’s initial payment and renewal, shared final-seat capacity, unknown tiers and price injection, unfinished-checkout tier conflicts, choosing again after authoritative expiry, invoice/tier mismatches, saved perk history, CSV sanitization, and the live gate for unconfirmed benefits. Stripe adapter tests check all three configured Prices. A migration test upgrades an existing single-plan paid order and checks its tier snapshots, retained fulfillment, and disabled enrollment.

The test suite exercises final-seat concurrency with 12 simultaneous attempts; duplicate joins; ambiguous Checkout creation; signed and invalid webhooks; initial payment before checkout; renewals without checkout; duplicate/reordered events; payment failure/authentication/recovery; billing-period and Boise/DST mapping; cutoff rejection; cancellation after payment; checkout-expiry/payment races; invalid destinations; address changes and packing correction; full/partial refund and dispute holds; shipped-history preservation; CSV formula protection; missing-invoice reconciliation; missing-edition re-evaluation; event transaction rollback; stored customer ownership; staff authorization; ordinary cart pricing; recurring catalog exclusion; newsletter regression; modern Stripe object paths; portal restrictions; outbox delivery safeguards; canceled billing-period commitments; and delayed historical invoices after replacement members join.

All external payment and email behavior in those automated tests uses fixtures. PostgreSQL locks, uniqueness, transactions, and rollback are exercised against an actual database. No test emails were sent.

## Repeat the local checks

Use a disposable local PostgreSQL database named `grim_test`. Tests deliberately refuse any other database name or a remote host.

```sh
export GRIM_TEST_DATABASE_URL='postgres://YOUR_LOCAL_USER@127.0.0.1:55437/grim_test'
pnpm --filter moonafique-site test:grim
pnpm --filter moonafique-site exec tsc --noEmit
```

Run targeted lint with the command in `.github/workflows/grimmunity.yml`. The workflow supplies PostgreSQL 16; that hosted CI run has not been executed in this session.

For visual review, start the app with `GRIM_REVIEW_UI=true`, `GRIM_DATABASE_URL` empty, and fake test-only storefront Stripe values. Use a current Node runtime and `SERVER_URL=http://localhost:3047`:

```sh
pnpm --filter moonafique-site dev --port 3047
```

From `packages/moonafique-site`, run `node scripts/grimmunity/browser-review.mjs`. It uses the installed Chrome channel, blocks external browser requests, waits for visible content, and writes screenshots into this directory. The tier follow-up used an isolated source copy with the normal Turbopack bundler, leaving an existing development server running. An alternate Webpack preview failed to hydrate; it was not used as verification evidence. Review screens return 404 in production regardless of the fixture flag.

## Required real sandbox walkthrough

Complete this before considering a launch. Store test credentials through the secret manager, not this document.

The managed Neon database, migrations, protected Preview, WorkOS browser sign-in, initial hosted payment, and saved membership are verified. See the October 24 record above and [Vercel sandbox setup](vercel-sandbox.md). The remaining walkthrough steps below still apply; the paid-event replay and renewal have not run.

1. Provision dedicated sandbox PostgreSQL and run the migration.
2. Configure the $25 monthly membership Price and $9.21 monthly shipping Price, product metadata, test tax treatment, U.S. shipping, and restricted portal.
3. Configure the webhook endpoint and retry/expiry/reconciliation/outbox workers.
4. Set a current sandbox enrollment window without changing the live proposed schedule.
5. Complete signup for Grim Collector with a test WorkOS customer. Verify the membership and $34.21 recurring total in Checkout. Use test payment methods and complete any authentication.
6. Verify one initial invoice, one entitlement, one fulfillment, and the correct next billing anniversary.
7. Replay the paid event and confirm the order count stays one.
8. Update the payment method and shipping address through the actual portal. Confirm `customer.updated` synchronizes the shipping field and unsupported countries cannot enter packing.
9. Exercise a renewal without a new Checkout Session. Use a Stripe test clock where the supported customer/Checkout flow permits it. Otherwise use a separate clock-attached subscription bound to a sandbox reservation and repeat hosted Checkout independently. Advance only the sandbox clock, and save compatible edition windows before advancing.
10. Confirm exactly one order on each month's packing list. Test failed renewal, required authentication, recovery before cutoff, and recovery after cutoff.
11. Change the address before and after lock. Confirm shipped history never changes.
12. Cancel through the portal. Confirm no future renewal occurs, while the already-paid order remains.
13. Test partial refund, full refund, and dispute handling before and after shipment.
14. Run reconciliation with the webhook temporarily unavailable. Confirm the missing paid invoice appears once and the event can later replay safely.
15. Test notification delivery only to the designated sandbox sink. Verify provider idempotency and recovery after a simulated worker interruption.

Stripe's [test-clock guide](https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions) explains how to advance simulations and inspect subscription changes. Support for attaching a test clock to the specific hosted Checkout flow still needs an actual account check. The code does not claim that every Checkout customer supports test clocks, and it does not alter the production clock.

## Remaining limits

Initial real hosted sandbox Checkout and WorkOS sign-in/callback continuity passed on October 24. Portal shipping/payment edits, actual Stripe renewal/test-clock events, paid-event replay, Resend delivery, deployed worker scheduling, and production host timeouts remain unverified. The older screenshots in this directory remain fixture screens; they are not evidence for those services.

The current launch offer uses one fixed membership Price plus a separate fixed recurring shipping Price, with one membership per WorkOS owner, no trial/coupon/quantity/plan changes, and manual handling for rejoining after cancellation. Historical program configuration cannot be edited once members exist. Late, duplicate, adjusted, or unallocated payments require staff review; the software does not automatically issue refunds. Those choices prevent an unexpected payment from silently consuming a vaulted or unavailable copy.
