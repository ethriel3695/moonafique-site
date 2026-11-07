# Live shows, Grimmfest, and newsletter

Updated November 7, 2026.

Published to both `www.moonafique.com` and `moonafique.com`. The deployed application source is commit `6306f49122467e022d9d0c9e6115c5461124125c`, Vercel deployment `dpl_8v2fCn4UURHZtkhvmzKLLPacuexB`. The previous release, `dpl_EmdTToQX7s8EqPC6fwL2UNNJCfeN`, remains the rollback reference.

The useful lesson from 3DA's Print Wars presentation is to give a recurring event a recognizable identity and preserve its finished work and recognition. Grimmfest now has that prominence within Grimmunity, while [Print Wars' monthly Hall of Fame](https://3d-addicts.com/print-wars/hall-of-fame/) provides supporting evidence for Moonafique's competition work.

## Visitor experience

The homepage next-show card leads directly to the scheduled Whatnot show. The Live Shows page provides selected upcoming dates, a Grimmfest introduction, Print Wars recognition, and instructions for first-time viewers. Both use the existing cream, purple, serif headings, rounded cards, and product photography.

Grimmfest has a dedicated section within Grimmunity, with the existing film, four house crests, a show link, and links to past editions. Quick links near the top let visitors jump to memberships, Grimmfest, or past editions. Watching Grimmfest does not require a membership, and Whatnot editions are separate from membership editions.

3DA references are limited to Print Wars. The Lion King diorama links to September 2026's Hall of Fame and its verified Most Creative Interpretation award. The August butterfly and October lyre link to their respective monthly awards without implying Moonafique won those months.

## UI/UX review

| Finding | Implemented improvement |
| --- | --- |
| A profile link makes visitors search for the next show. | A prominent next-show card links to the individual show, with date and Mountain Time. |
| Community stories were hard to discover within the membership flow. | Grimmfest has its own feature, film, house crests, and direct section links. |
| Large mobile headings delayed the primary show action. | Smaller phone headings and spacing bring the show details forward. |
| Newsletter feedback disappeared in a toast. | Persistent inline confirmation, errors, visible email label, and explicit consent. |
| A scheduled start is not evidence a broadcast is live. | Use “Scheduled today” after the start, with Whatnot as the source of current status. |
| Keyboard focus was suppressed on some links. | Visible focus outlines, contrasting focus in Grimmfest, and an active navigation state. |
| The cart provider hid the entire page until JavaScript loaded. | Page content now renders on the server, while saved cart details wait for hydration. |

Reviewed desktop and 320, 390, and 768 pixel layouts. Phone layouts stack cards and controls, and the key pages have no horizontal overflow. Images retain their proportions; the Grimm group photo is framed closer using CSS. Reduced-motion preferences disable smooth scrolling; the existing film keeps its playback controls.

The next content priority is real product photography: several current shop listings still display “Photo unavailable.” Adding accurate photos will help buyers judge those products. The new live-show and Grimmfest features use existing Moonafique photography and artwork.

## Maintaining show dates

Edit `packages/moonafique-site/lib/live-shows.ts`. This is a curated schedule, not an automatic Whatnot feed. Use a verified direct show URL and an ISO timestamp with the correct Mountain Time offset. Update `scheduleCheckedOn` after checking Whatnot. Grimmfest's November 7 time was confirmed by the owner as 8 p.m. Mountain.

The next-show card and Grimmfest feature use the same data. They refresh on page focus and every minute. Shows from prior Mountain calendar days drop out automatically. When no dated shows remain, visitors get a link to Moonafique's Whatnot profile rather than a stale event. A changed or cancelled Whatnot listing still requires an editorial update here.

## Newsletter activation

The old public page was paused because `NEWSLETTER_SEND_EMAILS` was disabled and `RESEND_NEWSLETTER_SEGMENT_ID` was missing. Signups are now active and use Resend's existing General segment (`55b393d8-c0bb-4d18-b0d7-eb99c3ee93fd`), separate from membership launch notifications. Both settings are saved in Vercel's Production environment.

Production requires `NEWSLETTER_SEND_EMAILS=approved`, the General segment ID, an existing full-access Resend key, a verified sender, the live opt-in database, signing secret, and canonical site URL. `scripts/check-newsletter.ts` runs during deployment and verifies the provider connection and confirmation storage without sending mail or adding contacts. It blocks an enabled live newsletter build when the connection is incomplete.

Visitors consent through the form, then confirm their address using a 24-hour signed link before the app adds them to the newsletter segment. Existing unsubscribed contacts remain suppressed. Launch-interest signups do not silently become newsletter subscribers. This activation does not send a newsletter campaign.

Verification includes the existing 17 database-backed opt-in tests and 36 storefront tests, including date selection and initial page rendering, plus TypeScript, ESLint, and browser checks. A browser check confirmed that an added cart item survives reload without hydration errors and can be removed normally. Provider delivery to a real inbox requires a separate authorized test; the deployment preflight is read-only.

## Release settings

The November 4 live release used deployment overrides for membership flags. Preserve `GRIM_LIVE_ENROLLMENT`, `GRIM_MANAGED_COLLECTION`, `GRIM_SEND_EMAILS`, and `CONTACT_SEND_EMAILS` as `approved`, `GRIM_REVIEW_UI=false`, and blank `GRIM_PRODUCTION_SETUP` and `GRIM_INTEREST_SMOKE_CLEANUP`. Do not rerun the historical November launch script. This update changes newsletter configuration and presentation, not membership billing or edition data.

Stage production without changing domains, check newsletter readiness and the public routes, then promote. Keep the previous deployment available for rollback.

For this release, the production build verified the sender, segment access, and confirmation storage. Staged and public checks passed for the homepage, Live Shows, Grimmunity, ACEOs, creations, confirmation page, newsletter input validation, same-origin protections, and protected membership endpoints. Both public domains point to the new deployment. Membership enrollment stayed open. Eighteen client bundles were checked for secret leakage. Public browser checks showed the new show card, Grimmfest feature, and active signup form without console errors.
