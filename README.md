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
