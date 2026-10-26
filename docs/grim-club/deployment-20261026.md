# Production deployment — October 26, 2026

The owner approved deployment, creation of a recovery snapshot, and membership migrations 009 and 010. The updated Communities, Grimmunity, and ACEO pages are live:

- [Communities](https://www.moonafique.com/communities)
- [Grimmunity](https://www.moonafique.com/grimmunity)
- [ACEOs](https://www.moonafique.com/aceos)

## Release

| Item | Value |
| --- | --- |
| Source commit | `79fe78b4b866115791fad60b8d740d3fcb58b47e` |
| Vercel project | `prj_qyOQHMNvTfmMMlVFZkh1C14D9LkB` |
| Production deployment | `dpl_9XahLquzAqzQNDBsjWtZqoXuoNdA` |
| Candidate URL | `moonafique-site-ljqi69n2d-ethriel3695s-projects.vercel.app` |
| Previous production deployment | `dpl_DK1WVgsfW1FZAa9fAvoRNZeHCRYv` |
| Production Neon project | `aged-cherry-13270058` |
| Production branch | `main`, `br-fancy-boat-b8c3nmme` |
| Applied schema versions | 001–010 |

The candidate was built with Production configuration and `--skip-domain`, checked, and then promoted. The Vercel alias API confirms `www.moonafique.com` points to the new deployment. The build completed with Turbopack on Vercel’s selected Node 24 runtime. No live Stripe products or prices were created or activated.

## Recovery snapshot

Before migrations, Neon created the manual snapshot **main at 2026-10-26 23:40:16 UTC (manual)**. The console reports no expiration. The project stayed on its existing free plan. No database password was exported or saved locally.

An optional restore into a separate branch was blocked by automatic approval review because that additional branch creation was outside the explicit approval. The restore dialog was canceled. **Snapshot creation is verified; an end-to-end restore was not tested.**

The migration check advanced from version 8 to version 10. Before and after counts agreed: zero memberships, one interest signup, and five custom requests. No customer records were deleted or changed by a smoke test.

## Controls kept closed

The production database still reports `enabled=false` and no approval timestamp for the live program. Deployment build and runtime overrides keep `GRIM_LIVE_ENROLLMENT=disabled`, `GRIM_REVIEW_UI=false`, and `SHIPPO_API_KEY` empty. The unused legacy `NEXT_PUBLIC_STRIPE_SECRET_KEY` is also empty in this deployment.

The existing shared interest list and custom-request notifications remain configured. No verification signup, email, charge, subscription, or postage purchase was created. The new four-tier billing configuration has not been provisioned in Production; the public pages show the approved offer and capacity totals while enrollment remains closed. Opening paid enrollment is a separate launch step.

The daily workers remain registered at `/api/grimmunity/worker` (12:00 UTC) and `/api/custom-requests/notifications` (00:00 UTC). Automatic Git deployments remain disabled for the checkpoint branch; future pushes are backups until another deployment is requested.

## Verification

The protected candidate and public domain returned 200 for `/communities`, `/grimmunity`, `/aceos`, `/customs`, and `/api/grimmunity/availability`. The availability API returns `Cache-Control: no-store` and an empty count object because no current four-tier edition is open. An unauthenticated request to the packing API returned 401.

Browser review verified the separate membership pages, overview navigation, public interest form, updated descriptions, prices, shipping wording, and closed enrollment. Earlier source validation passed 151 regression tests, TypeScript, scoped ESLint, and production and Storybook builds.

Proof images: [production overview](screenshots/production-communities-20261026.jpg) and [Neon snapshot](screenshots/production-snapshot-20261026.jpg).
