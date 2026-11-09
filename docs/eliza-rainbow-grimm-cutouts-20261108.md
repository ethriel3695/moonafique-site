# Eliza’s rainbow and stars Grimm cutouts

The owner requested removal of their hand and the workshop background from two photographs of Eliza’s hand-painted Grimm. The built-in image-generation tool produced front and back cutouts with actual alpha transparency. Both are saved as PNGs in `packages/moonafique-site/public/showcase/`, named `eliza-rainbow-stars-grimm-front.png` and `eliza-rainbow-stars-grimm-back.png`.

These are AI-edited images, not pixel-identical photographic extractions. The prompts prioritize the original design, paintwork, pose, and handmade texture; concealed edges can be reconstructed. Original photographs and generated source files were retained. The new project appears only in Eliza’s portfolio at `/about#project-eliza-rainbow-stars-grimm`, credited for hand painting.

## Prompts and tool

Tool: built-in `image_gen`, edit mode, `transparent_background: true`, one original photograph per call.

### Front

Use case: background-extraction. Edit target: the attached FRONT-view photo of Eliza's real hand-painted Grimm figurine. Create a clean transparent-background product cutout of ONLY this exact figurine. Remove the entire human hand/fingers and every part of the room/workbench/background, including the spaces between the legs and around the silhouette. Preserve the figurine's original camera angle, proportions, pose, turquoise skull, black coat, exact hand-painted multicolored stars and dots, rainbow trim, turquoise legs, striped metallic boots, handmade imperfections and surface texture. Do not redesign, repaint, beautify or invent decorations; do not remove the figurine's own small black hands. Reconstruct only tiny portions of silhouette actually obscured by human fingers, consistent with adjacent existing surface. Keep full head and both boots in frame, centered with modest transparent margins. No new background, floor, shadow, text or watermark. Return one front-view cutout with actual alpha transparency.

### Back

Use case: background-extraction. Edit target: the attached BACK-view photo of Eliza's real hand-painted Grimm figurine. Create a clean transparent-background product cutout of ONLY this exact figurine viewed FROM THE BACK. Remove the entire human hand/fingers and all workbench, room and other background, including the gap between the legs. Preserve the original back-facing camera angle, proportions, pose, black ears, multicolored wavy stripes on the hood, exact starburst and diamond pattern on the black coat (large yellow starburst centered on upper back), rainbow-block coat hem, turquoise legs and asymmetric multicolored metallic striped boots. Preserve the hand-painted textures and imperfections. Do not redesign, repaint, beautify, add details or show the face. Reconstruct only tiny silhouette portions actually hidden by fingers consistent with adjacent surface. Entire head and both boots visible, centered with modest transparent margins. No ground, shadow, new background, text or watermark. Return a single BACK view with actual alpha transparency.

## Verification

Both PNGs are 1086 × 1448 with non-opaque alpha channels. TypeScript passed. Local browser review verified the project credit, thumbnail switching, and enlarged back-view cutout. No billing, stock, or customer data changed.
