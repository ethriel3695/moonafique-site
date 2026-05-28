# UI Modernization Plan

Status: approved for implementation on 2026-04-25

## Goal

Modernize the site from the atomic layer upward using Storybook as the primary design review surface, then roll those decisions into the highest-impact commerce and marketing templates.

Approved direction:

- Strong redesign
- Playful boutique aesthetic
- UI refresh plus light UX cleanup
- Keep the current IA, page inventory, and core commerce flows

## Workflow

Use Storybook first, then integrate into Next.js pages.

The repo already includes Storybook support in `.storybook/main.ts` and `.storybook/preview.ts`, including `@storybook/addon-mcp`, `@storybook/addon-a11y`, docs, vitest, and Chromatic-related tooling. Treat Storybook as the implementation workbench for atomic and composed surfaces before page rollout.

## Phase 1: Visual Foundation

Start with the token and styling layer so every downstream component inherits the new language.

Primary files:

- `app/globals.css`
- `tailwind.config.ts`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/badge.tsx`

Implementation goals:

1. Define the updated typography system.
2. Refresh color tokens and surface treatments.
3. Standardize radii, shadows, spacing rhythm, and section density.
4. Improve focus styles and interactive clarity.
5. Replace hardcoded status styling with a smaller semantic system.

Notes:

- Decide typography before major component work because it will affect spacing and perceived brand tone across the entire site.
- The current badge/status system should move away from rainbow-coded one-off variants toward a smaller, reusable semantic pattern.

## Phase 2: Storybook Atomic Coverage

Create stories for the missing primitive components before redesigning composed sections.

Priority story targets:

- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/badge.tsx`
- `components/ui/tabs.tsx`
- `components/ui/sheet.tsx`
- `components/ui/tooltip.tsx`
- `components/ui/avatar.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/separator.tsx`
- `components/ui/toast.tsx`

Story requirements:

1. Show visual variants.
2. Cover hover, focus, disabled, loading, error, and selected states where relevant.
3. Review responsive behavior where applicable.
4. Use Storybook a11y feedback during iteration, not only at the end.

Reference pattern:

- `components/product-buy-form.stories.tsx`

## Phase 3: Normalize Shared Patterns

Once the primitives are stable in Storybook, normalize cross-cutting UI behavior.

System patterns to standardize:

1. Button hierarchy and CTA emphasis.
2. Form field hierarchy and helper/error treatment.
3. Product status badges and messaging.
4. Icon sizing and spacing rhythm.
5. Empty, loading, and error states.
6. Shared container widths and section spacing.

Primary cleanup target:

- `components/ui/badge.tsx`

## Phase 4: Commerce Surfaces

Refresh the highest-impact commerce components next, using Storybook as the review loop.

Primary files:

- `components/product-list-thumbnail.tsx`
- `components/product-list.tsx`
- `components/product-buy-form.tsx`
- `components/cart.tsx`

Implementation goals:

1. Improve product-card polish, hierarchy, and media treatment.
2. Upgrade pricing presentation and status messaging.
3. Improve quantity controls and add-to-cart affordances.
4. Add stronger skeleton, empty, and loading states.
5. Improve cart clarity and checkout affordances.

In parallel, add or expand Storybook coverage for:

- `components/cart.tsx`
- `components/product-list.tsx`
- `components/signInButton.tsx`
- `components/userMenu.tsx`

## Phase 5: Shell and Marketing Sections

After the system and commerce surfaces are stable, refresh the shared shell and content-heavy sections.

Primary files:

- `components/siteHeader.tsx`
- `components/Footer.tsx`
- `components/hero.tsx`
- `components/testimonials.tsx`
- `components/faq.tsx`
- `components/email-signup-form.tsx`

Implementation goals:

1. Introduce a consistent section/container pattern.
2. Improve navigation clarity and header hierarchy.
3. Upgrade CTA treatment and section rhythm.
4. Make testimonials and FAQ feel denser and more intentional.
5. Improve newsletter presentation and form polish.

## Phase 6: Page Rollout

Roll the refreshed system into pages in dependency order.

Priority order:

1. `app/page.tsx`
2. `app/product/[id]/page.tsx`
3. `app/about/page.tsx`
4. `app/contact/page.tsx`
5. Policy and legal pages only as needed for consistency

Page goals:

1. Replace generic repeated section blocks with stronger composition and more intentional rhythm.
2. Improve product-detail gallery, pricing hierarchy, tab presentation, and purchase framing.
3. Align informational pages with the new typography, container, and spacing system.
4. Do not spend bespoke redesign effort on policy pages beyond shell and content-container consistency.

## UX Cleanup Included In Scope

Allowed because they directly support UI polish:

1. Clearer search states.
2. Stronger add-to-cart and cart feedback.
3. Better loading and empty states.
4. More visible focus treatment and accessibility polish.
5. Safer FAQ rendering if the current structure is brittle.

Out of scope:

1. New backend features.
2. Taxonomy redesign.
3. Major copywriting rewrites.
4. Large IA changes.

## Verification

1. Run Storybook and review newly added atomic stories before page-level rollout.
2. Review composed stories for catalog, cart, header, footer, FAQ, testimonials, and signup across desktop and mobile viewports.
3. Use Storybook a11y output to fix focus, contrast, labeling, and interactive-state issues during implementation.
4. Run linting after each major phase.
5. Manually validate key flows in the app: landing page scan, product discovery, product detail, add to cart, cart open/close, newsletter UI, and contact-page presentation.

## Execution Order Summary

1. Update design tokens and visual foundation.
2. Add atomic stories and lock the primitive system.
3. Normalize shared patterns and states.
4. Refresh commerce surfaces.
5. Refresh shell and marketing sections.
6. Roll changes into pages.
7. Verify in Storybook first, then in the integrated app.