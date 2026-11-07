# Live shows, Grimmfest, and newsletter

Updated November 7, 2026.

Published to both `www.moonafique.com` and `moonafique.com`. The deployed application source is commit `f59a5a4d4ec2554e0db3cb86e61d05048d2fe073`, Vercel deployment `dpl_2R8aPnUGz34BJfBs64GvFT8HpSLw`. The previous release, `dpl_8v2fCn4UURHZtkhvmzKLLPacuexB`, remains the rollback reference.

The useful lesson from 3DA's Print Wars presentation is to give a recurring event a recognizable identity and preserve its finished work and recognition. Grimmfest now has that prominence within Grimmunity, while [Print Wars' monthly Hall of Fame](https://3d-addicts.com/print-wars/hall-of-fame/) provides supporting evidence for Moonafique's competition work.

## Visitor experience

The homepage next-show card leads directly to the scheduled Whatnot show. The Live Shows page provides automatically updated show dates, a Grimmfest introduction, Print Wars recognition, and instructions for first-time viewers. It initially shows the next eight dates after the featured show; visitors can reveal more dates in groups of eight. Both use the existing cream, purple, serif headings, rounded cards, and product photography.

Grimmfest has a dedicated section within Grimmunity, with the existing film, a show link, and links to past editions. The four houses of Moonafique have a separate section and their own crests. Quick links near the top let visitors jump to memberships, Grimmfest, Moonafique’s houses, or past editions. Watching Grimmfest does not require a membership, and Whatnot editions are separate from membership editions.

3DA references are limited to Print Wars. The Lion King diorama links to September 2026's Hall of Fame and its verified Most Creative Interpretation award. The August butterfly and October lyre link to their respective monthly awards without implying Moonafique won those months.

## UI/UX review

| Finding | Implemented improvement |
| --- | --- |
| A profile link makes visitors search for the next show. | A prominent next-show card links to the individual show, with date and Mountain Time. |
| Community stories were hard to discover within the membership flow. | Grimmfest has its own feature and film; Moonafique’s houses have a separate section. Direct section links make both easy to find. |
| Large mobile headings delayed the primary show action. | Smaller phone headings and spacing bring the show details forward. |
| Newsletter feedback disappeared in a toast. | Persistent inline confirmation, errors, visible email label, and explicit consent. |
| A scheduled start is not evidence a broadcast is live. | Show “Live now” only when a recent Whatnot response reports a live broadcast. Otherwise retain the scheduled-time label. |
| Keyboard focus was suppressed on some links. | Visible focus outlines, contrasting focus in Grimmfest, and an active navigation state. |
| The cart provider hid the entire page until JavaScript loaded. | Page content now renders on the server, while saved cart details wait for hydration. |

Reviewed desktop and 320, 390, and 768 pixel layouts. Phone layouts stack cards and controls, and the key pages have no horizontal overflow. Images retain their proportions; the Grimm group photo is framed closer using CSS. Reduced-motion preferences disable smooth scrolling; the existing film keeps its playback controls.

The next content priority is real product photography: several current shop listings still display “Photo unavailable.” Adding accurate photos will help buyers judge those products. The new live-show and Grimmfest features use existing Moonafique photography and artwork.

## Automatic Whatnot schedule

Schedule shows in Whatnot. The homepage card, Live Shows page, and Grimmfest feature read the same server snapshot. Dates, titles, and cancellations update without code edits or another deployment. Times use America/Boise, including daylight saving changes. Grimmfest's November 7 start was confirmed by the owner as 8 p.m. Mountain; future changes come from Whatnot.

The connection uses the [official Whatnot Seller API](https://developers.whatnot.com/api-reference/tag/shows). Save a personal token with `read:shows` as `WHATNOT_API_TOKEN` in Vercel → moonafique-site → Settings → Environment Variables → Production. Mark it Sensitive. Enter the raw token without `Bearer`, then deploy. For local development, use an ignored `.env.local` file. Never put the token in source control, browser code, or a `NEXT_PUBLIC_` variable.

The server verifies the token belongs to `moonafique`, then reads paginated scheduled and live shows. It publishes only public shows and creates viewer links; Whatnot's API supplies seller-dashboard URLs, which visitors cannot use. Other 3DA-branded events are omitted to preserve the owner's Print Wars-only rule. The full Whatnot profile link remains available. Private, stopped, ended, and cancelled shows are excluded. Undated shows appear only while live.

The shared Next.js cache refreshes after two minutes when requested. Open, visible pages check it every minute and when the visitor returns to the tab. Changes normally appear within a few minutes; there is no paid cron dependency. No requests run solely to update an unvisited page. The first visitor after an idle period can briefly see the previous snapshot while the background refresh completes.

Failed refreshes retain the last successful snapshot. After ten minutes, the site marks dates as potentially outdated and stops asserting a show is live. After 24 hours, it hides old dates and links to Whatnot. A successful empty schedule clears the old shows. A missing or invalid token yields a usable profile link. Rotation changes the cache key; revocation or expiry requires a replacement token and deployment.

`scripts/check-whatnot.ts` verifies the seller and schedule during deployment without modifying any show. Production builds fail if the token is missing, unauthorized, belongs to another account, or the schedule cannot be read. Logs contain fixed error categories and a public show count, never credentials or provider response bodies. Provider rate limits and failed requests trigger a short backoff, and imports use a ten-second timeout.

## Newsletter activation

The old public page was paused because `NEWSLETTER_SEND_EMAILS` was disabled and `RESEND_NEWSLETTER_SEGMENT_ID` was missing. Signups are now active and use Resend's existing General segment (`55b393d8-c0bb-4d18-b0d7-eb99c3ee93fd`), separate from membership launch notifications. Both settings are saved in Vercel's Production environment.

Production requires `NEWSLETTER_SEND_EMAILS=approved`, the General segment ID, an existing full-access Resend key, a verified sender, the live opt-in database, signing secret, and canonical site URL. `scripts/check-newsletter.ts` runs during deployment and verifies the provider connection and confirmation storage without sending mail or adding contacts. It blocks an enabled live newsletter build when the connection is incomplete.

Visitors consent through the form, then confirm their address using a 24-hour signed link before the app adds them to the newsletter segment. Existing unsubscribed contacts remain suppressed. Launch-interest signups do not silently become newsletter subscribers. This activation does not send a newsletter campaign.

The newsletter release passed 17 database-backed opt-in tests. The current storefront suite passes 56 tests, including API pagination, account validation, private-show filtering, cancelled and empty schedules, stale data, live status, and initial page rendering. TypeScript, targeted ESLint, and production builds also pass. A browser check confirmed that an added cart item survives reload without hydration errors and can be removed normally. Provider delivery to a real inbox requires a separate authorized test; the deployment preflight is read-only.

## Release settings

The November 4 live release used deployment overrides for membership flags. Preserve `GRIM_LIVE_ENROLLMENT`, `GRIM_MANAGED_COLLECTION`, `GRIM_SEND_EMAILS`, and `CONTACT_SEND_EMAILS` as `approved`, `GRIM_REVIEW_UI=false`, and blank `GRIM_PRODUCTION_SETUP` and `GRIM_INTEREST_SMOKE_CLEANUP`. Do not rerun the historical November launch script. This update changes newsletter configuration and presentation, not membership billing or edition data.

Stage production without changing domains, check newsletter readiness and the public routes, then promote. Keep the previous deployment available for rollback.

For this release, the production build verified the sender, segment access, and confirmation storage. Staged and public checks passed for the homepage, Live Shows, Grimmunity, ACEOs, creations, confirmation page, newsletter input validation, same-origin protections, and protected membership endpoints. Both public domains point to the new deployment. Membership enrollment stayed open. Eighteen client bundles were checked for secret leakage. Public browser checks showed the new show card, Grimmfest feature, and active signup form without console errors.

## Schedule sync release verification

The owner saved `WHATNOT_API_TOKEN` as a Sensitive Production variable. The deployment check verified the Moonafique account and imported 96 public shows. The public snapshot contains the confirmed November 7 Grimmfest show at 8 p.m. Mountain, with the same viewer link on all three pages. No Whatnot show was changed.

A browser left on the staged page advanced its update time from 1:38 to 1:41 a.m. Mountain without a reload. The shared API cache reused fresh responses and replaced an expired response after background refresh. Mouse and keyboard checks expanded the schedule from eight to sixteen and twenty-four dates. The page fits 320, 390, and 768 pixel widths without horizontal overflow, and the browser reported no console errors. Public checks passed after promotion, including all key pages, newsletter validation, protected membership endpoints, and a scan of 18 client bundles for credentials. Both public domains point to the verified deployment.

Whatnot currently has two distinct listings for Plot Twists and Side Quests on November 19, 2026, at 8 p.m. Mountain: [first listing](https://www.whatnot.com/live/b2fc75df-2c0a-4c9a-b7ee-12407b199efb) and [second listing](https://www.whatnot.com/live/c565de87-eb8e-4e91-bb16-0bf27564d987). The website preserves both source records. If one is accidental, cancel it in Whatnot; the next successful sync will remove it from the website.

## Owner corrections — November 7, 2026

Marrowick, Hollowsmere, Veradell, and Glimmerfell are the four houses of Moonafique. The shared showcase wording and captions now use that attribution. On Grimmunity, the houses appear in their own section outside the Grimmfest event section.

The owner confirmed one October Grim remains on Whatnot. Its card now shows “1 left on Whatnot,” with availability updated November 7, 2026. This stock count is owner-maintained; automatic Whatnot synchronization covers show dates, not edition inventory.
