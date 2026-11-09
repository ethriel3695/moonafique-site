# Team galleries and custom-request reference photos

The header and footer wordmarks reuse the stylized M from the existing Moonafique logo. The original logo remains intact. The wordmark exposes the full name to screen readers.

The About page introduces Jess, Reuben, Megan, Keyara, Eliza, Ethan, Sophia, Alex, and Ruby. A name index opens each person’s portfolio. Nested sections organize custom Grimms, custom boxes, and art cards. Native disclosure controls support keyboard navigation; direct links open the relevant person and category. Empty galleries explicitly say that project photos are coming soon. No portraits, biographies, or project credits were invented.

## Adding confirmed projects

Edit `packages/moonafique-site/lib/team.ts`. Add entries to `teamProjects` using a listed creator slug and category, a unique project slug, a title, a short description, and image source, dimensions, and descriptive alt text. Verify the creator credit with the team first. Keep public project images separate from private customer references.

Example gallery links: `/about#team-jess` and `/about#team-megan-art-cards`. Project entries receive `project-<slug>` anchors and appear as responsive image cards within their category.

## Customer photos

The custom-request form accepts up to three optional JPG, PNG, or WebP images, each up to 10 MiB before preparation. HEIC requires export to a supported format. Customers can preview and remove selected photos. The browser prepares images at up to 1,600 pixels and 1 MiB per photo before submission. The server caps the multipart body, decodes actual pixels, rejects unsupported or corrupt files, reorients images, removes embedded metadata, and stores bounded WebP images.

Migration 014 adds `customs.reference_photos`. Requests, photos, and notification records save in one transaction. Existing JSON submissions continue to work. Retrying a submission does not duplicate its photos or overwrite the saved request. Deleting a request also deletes its photos through the foreign key.

Staff view photos at `/admin/customs`. Image responses require the existing staff allowlist, respect the sandbox/live mode, and use private, non-cacheable responses. Public image optimization is deliberately avoided. Notifications include the number of photos, never their bytes or direct image links. No new storage token is required.

The image limits leave room below Vercel’s [4.5 MB request limit](https://vercel.com/docs/functions/limitations). Server processing uses Sharp’s default [metadata removal](https://sharp.pixelplumbing.com/api-output/).

## Verification before release

- 32 custom-request tests passed, including photo validation, transactional storage, retry deduplication, mode isolation, cascading deletion, staff authorization, email behavior, and request size limits.
- 87 storefront tests passed.
- TypeScript and targeted ESLint checks passed.
- Local browser checks covered desktop and 390px layouts, direct links, keyboard disclosure controls, photo selection/removal, submission confirmation, and the saved staff image preview.
- The synthetic submission used an isolated local database and no email credentials. No real request, order, payment, or email was created by that test.

## Published release

Published November 8, 2026 (Mountain time). Application revision: `ce5b1c5fb24e2146465f9d0001b9740bedf3fe2d`. Vercel deployment: `dpl_7mbDeXaDNgcnY7L8gVkFUnCPjGrC`. Both the apex and www aliases were verified against this deployment.

Staged and public smoke checks passed for the team page, photo form, unauthorized photo access, staff queue sign-in, unsupported-file rejection, existing membership enrollment, shipping presentation, newsletter protection, Whatnot schedule, vaulted October showcase, and private analytics. Twenty-one client bundles were checked for exposed credentials. The existing inventory cache briefly returned an old snapshot with the quantity correctly hidden; the check allowed its background refresh to finish and verified a fresh result.

Live browser review confirmed the new wordmark, nested gallery behavior, and a 390px photo-form layout with no horizontal overflow or browser errors. The production photo form was not submitted with a real request. Local end-to-end verification covered the persisted photo and staff preview. The temporary preview server and local test database were stopped.

Review artifacts are under `/private/tmp/moonafique-team-photos-20261108/control`. The user-provided, untracked October PNG was preserved and excluded from this release.
