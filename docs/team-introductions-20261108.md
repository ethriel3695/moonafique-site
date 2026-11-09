# Team introductions: Jess, Reuben, and Megan

Added owner-supplied roles and short biographies to the About page. Each role appears beneath the person’s name in the accordion summary. Their introduction appears above their project gallery.

- Jess: CEO, designer, ACEO artist, creative vision, familiar face of Moonafique, and Whatnot host.
- Reuben: COO, operations, shipping, custom order processing, 3D design, and ACEO art.
- Megan: artist behind many ACEOs, live-show support alongside Jess, and creator of Grimmfest’s games.

The copy uses the studio’s playful voice while keeping these responsibilities clear. `teamProfiles` in `lib/team.ts` holds optional biographies separately from project credits, so a general role does not assign authorship of a specific piece. The remaining six people retain their existing entries until the owner supplies their introductions. Existing projects, credits, and links are preserved.

TypeScript and whitespace checks passed. Browser review covered all three introductions, direct name navigation, and the 390px mobile layout without horizontal overflow. Mobile role labels wrap within the accordion. No billing, stock, or customer data changed.
