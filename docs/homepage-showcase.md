# Homepage creations showcase

The homepage displays the showcase between the hero and the shop section, at `/#showcase`. The owner approved this scope on October 24, 2026:

- August Print Wars: Glow Butterfly Battle Bot, with color-detail and glow photos.
- August Print Wars: Archie, with dressed-up and hat-free photos. His description notes the bonus appearance; the separate callout above the description was removed at the owner’s request.
- September Print Wars: The Lion King Diorama, with a full-scene photo and a glowing Scar detail.
- October Print Wars: The Devil’s Favorite Lyre, with finished-piece and glowing-detail photos.
- Custom creations: an anonymous award-winning carp replica, 38 inches long with a 30-inch girth. Photo permission is pending.

The gallery presents completed work in two columns on desktop and one on mobile. Photo buttons select each view; the main image opens a larger, keyboard-accessible dialog. Its cards do not represent products for sale or current inventory. The custom-project link opens an email to the public contact address, `hello@moonafique.com`. Public copy and image descriptions credit Moonafique or use “we” rather than naming individual makers, as requested by the owner.

## Adding the remaining photos

1. Save approved images under `packages/moonafique-site/public/showcase/` with descriptive filenames.
2. Add each image’s `src`, `alt`, `width`, `height`, and short `label` to its project’s `photos` array in `packages/moonafique-site/lib/creations-showcase.ts`. The separate carp record still uses one optional `photo`.
3. Review the `Organism/Creations Showcase` Storybook story on desktop and mobile. Images use `object-contain` to show the entire piece.

Use photos of the actual finished projects. Keep the visible “Photo coming soon” placeholder until each image is supplied. Add the carp photo only after the customer grants permission. Do not include the customer’s identity, handle, catch location, identifying background details, or image metadata.

The section component is `packages/moonafique-site/components/creations-showcase.tsx`; photo selection and the Radix dialog are in `components/creation-photo-gallery.tsx`. The seven newly supplied photos use descriptive filenames under `public/showcase`. Their EXIF, IPTC/XMP, and comment segments were removed without recompressing or changing image pixels. The originals remain untouched. The older `MadeAtMoonafique` component and its Grimfest/ACEO entries are retained locally but are not mounted on the homepage.

The owner subsequently supplied `Grimfest_Whimsical_Font.mov`. The [Grimmunity showcase](grim-club/verification.md) now includes its web-ready video above the three Grim of the Month photo cards.

## Verification

TypeScript, targeted ESLint, and `git diff --check` passed. Storybook reported zero accessibility violations and 25 passes. Two inconclusive checks required manual review: contrast over images/gradients, and `aria-controls` references to Radix dialogs that mount when opened. The text uses dark backings, and the dialogs were verified when open. Browser review confirmed photo switching for all three photo pairs, enlarged photos, focus containment, visible focus outlines, Escape dismissal, focus restoration to the triggering image button, and no horizontal overflow at 320 and 390 pixels. The carp remains the only photo placeholder.

Storybook needed a missing macOS parser binding in this checkout. It was installed in `/tmp/creations-storybook-support-20261024` and supplied through `NODE_PATH`; project dependencies were unchanged.

The showcase is published on `https://www.moonafique.com/#showcase` and the stable Grimmunity sandbox. Latest homepage-only update, production deployment: `dpl_GutHe66XAgSvCQgw5PyA4DxN6i7r`. Corresponding sandbox deployment: `dpl_5xMGwawyPmfn44zZriERfyuNJqR5`. Both builds succeeded. The deployed gallery contains four Print Wars features plus the separate carp feature. Browser checks confirmed the supplied images, the photo viewer on desktop and mobile, and placement above the shop. No subscription or email settings changed.

The lyre glow-photo addition passed TypeScript, targeted ESLint, and whitespace checks. The production candidate and public site both displayed the glow photo through the existing selector and enlarged viewer. At 390 pixels, the image loaded and the dialog stayed within the viewport with no horizontal overflow. The supplied photo's encoded pixels were preserved.

The subsequent attribution update credits Moonafique in the Lion King and lyre descriptions and Lion King alt text. Application-source search found no remaining references to the individual maker’s name. Targeted ESLint, whitespace checks, and both Vercel builds passed. The production candidate and live homepage were checked for the updated text and image descriptions.

Archie’s separate “Bonus appearance · Not a contest entry” callout was removed on October 24 at the owner’s request. His description and photos remain. Targeted ESLint, whitespace checks, and both deployment builds passed; the public card was verified without the callout.
