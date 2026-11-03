# Moonafique Workspace

This repository is now a `pnpm` workspace backed by Turborepo.

## Structure

```text
packages/
	moonafique-site/   Next.js storefront app
```

The monorepo shape mirrors the package-first layout used in `~/source/storybook-addon-manifest`, with the app living under `packages/*` and the workspace managed from the root.

## Commands

Run these from the repository root:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm storybook
pnpm build
```

To run commands directly against the app package:

```bash
pnpm --filter moonafique-site dev
pnpm --filter moonafique-site lint
pnpm --filter moonafique-site storybook
```

## App Location

The storefront source now lives in `packages/moonafique-site`, including:

- Next.js app routes
- Storybook config
- components and UI primitives
- Tailwind, Vitest, and ESLint config
- local `.env` files for the app package

## Notes

- The app package currently declares `node >=25.9.0` in `packages/moonafique-site/package.json`.
- In this environment, package-level linting works for targeted files, but some broader lint commands still surface pre-existing Node and formatter/tooling issues unrelated to the monorepo move.

## Brand first release: local review

The release is on `codex/brand-first-release`. Review it locally before authorizing any Preview or Production deployment. No push or deployment is part of this review.

Run `pnpm --filter moonafique-site storybook`, then open the **First release** group. It contains the full homepage, an iPhone-sized view, contact delivery states, and cart quantity and checkout recovery examples. Catalog names and prices in these stories are labeled samples. Contact and newsletter delivery are simulated.

Run `pnpm --filter moonafique-site test:storefront` for cart and API regressions. Run `pnpm --filter moonafique-site exec vitest run --config vitest.config.ts components/first-release.stories.tsx components/contact-form.stories.tsx components/cart.stories.tsx components/product-buy-form.stories.tsx` for browser interactions. Set `STORYBOOK_BROWSER_CHANNEL=chrome` to use an existing Chrome installation instead of downloaded Chromium.

The contact form uses the existing Resend sender and always delivers to `hello@moonafique.com`, with the visitor as the reply address. Set `CONTACT_SEND_EMAILS=approved` only for the reviewed Production release; Vercel Preview delivery remains blocked. Provider acceptance is tested with a stub. A real inbox delivery check remains a launch task. No automatic customer email or newsletter subscription is created by this form.

Confirmed social destinations are maintained in `packages/moonafique-site/lib/site-content.ts`. Instagram, TikTok, Facebook, Discord, and Whatnot destinations are confirmed by the owner. The tagline remains undecided.

Manrope and Lora are bundled under `packages/moonafique-site/public/fonts` with their SIL Open Font License notices. The app and Storybook share `lib/site-fonts.ts`, so local builds do not need Google Fonts access.
