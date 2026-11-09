# November Grimm and pet photograph

Added the owner’s 538 × 360 profile photograph as the third view in the November Grimm of the Month gallery. The shared photo list displays it in both the monthly collection and Jess’s portfolio, labeled “Grimm & pet.” The original image pixels are unchanged; private metadata was stripped without recompression. The original file was retained.

The gallery uses its lead photograph to choose a stable portrait or landscape frame, so adding a landscape detail does not shrink the existing portrait presentation. All photos remain fully visible with `object-contain`.

Browser review exposed an existing lightbox sizing issue: the browser interpreted an optimized Next.js image’s density as a smaller natural display size. Explicit width now respects the source width, available dialog width, and 60dvh height limit. The new photograph displays at 538 × 360 on desktop and fits a 390px phone viewport. Portrait images also remain within the height limit. Escape dismissal returns focus to the photo button.

TypeScript and whitespace checks passed. Existing photos, creator credits, membership billing, and inventory data were preserved.

## Publication

Published revision `fc6d452a3f1ca94cfa92585a9bcafea888c047df` as Vercel deployment `dpl_GjoUc1jcKjXMmQtzAQLCDrDznRPG`. Staged and public checks confirmed the image download and its presence in both galleries, plus existing storefront protections. Live browser review verified the enlarged image and three-photo controls without browser errors. The local preview server was stopped.
