# November project galleries

The owner supplied six photographs for the Moonafique M.A.S.H. Machine and November Grimm World. All six are published as local showcase assets. EXIF, XMP, IPTC, and comment metadata were removed without recompressing or changing the image pixels. The original color profile was retained where present.

## Published content

- The M.A.S.H. Machine leads the Print Wars gallery at `/creations#mash-machine`. Its three photographs show the full machine, spiral dial, and glowing details. The owner identified the Childhood Unlocked theme; the official [Print Wars battle page](https://3d-addicts.com/print-wars/current-battle/) confirmed November 2026. No award or November Hall of Fame placement was claimed.
- The November Grimm World appears in the Grimm Worlds collection at `/grimmunity#november-grimm-world` and in the creations archive. Its three photographs show the open scene, painted details, and closed book box. Gallery copy distinguishes this Grimmfest piece from monthly membership releases and makes no stock or price claim.
- Keyara receives design and painting credit. Jess receives box-collaboration credit. One shared project appears in both portfolios, with distinct anchors: `/about#project-keyara-november-grimm-world` and `/about#project-jess-november-grimm-world`.
- Team portfolios list confirmed projects rather than blanket categories. The other seven people retain their names and a single neutral coming-soon panel. No medium, project, or role was assigned to them.

## Maintenance

`lib/project-photos.ts` holds the shared photo arrays. `lib/team.ts` holds the shared project and its creator-role list. The collection and both portfolios use that same project. Add a new collaboration once, with every confirmed contributor in `creators`; do not duplicate its content for each person.

The shared photo viewer supports thumbnail selection, enlarged views, focus return, and Escape dismissal. Enlarged images keep their proportions and stay within the viewport. Team sections include a return link to the name index.

## Verification

TypeScript and all 87 storefront tests passed. Browser review covered desktop and 390px layouts, direct project links, shared creator credits, collection navigation, thumbnail switching, and enlarged-image dismissal. The phone collection had no horizontal overflow. No browser errors were observed in the reviewed preview. Existing inventory, prices, subscriptions, and billing were not edited.
