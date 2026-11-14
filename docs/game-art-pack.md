# Reefkeeper game art pack

## Purpose and reference

Create a cohesive illustrated asset pack for the playable game, with real animation frames and predictable scale. Use the built-in imagegen tool. The visual reference is `public/images/reefkeeper-key-art.png`, the artwork the user selected. It supplies the diver's identity, handmade linocut treatment, palette, and original ornamental rhythm. It does not supply the composition of every asset.

The selected pack contains 12 image-generated assets with 62 authored animation frames. Original PNG sheets are stored in `art/source/`; optimized transparent WebP atlases, two environments and two props are in `public/images/game/`. The old SVG placeholders have been retired. The revised diver cycle has clear arm strokes and alternating kicks; NPC sheets use fixed-foot registration during packing.

Keep this specification outside `public/`. Only selected runtime images and game data belong in the published directory.

## Shared drawing direction

Use warm cream paper cuts, nearly black ink contours, rich sea-glass teal, coral red, muted ochre, and restrained sage green. Shapes should look confidently carved by hand. Use dry ink grain and meaningful carved marks; avoid smooth vector clip art, glossy digital shading, gradients, and decorative noise scattered over every surface. Preserve a clear silhouette at the actual game size.

Draw original geometric rhythms and ornamental bands inspired by the agreed Neo-Polynesian art direction. Do not copy sacred, identity-specific, or recognizable traditional motifs. Keep skin and faces unmarked. Put patterns on clothing, equipment, boats, frames, and environmental surfaces. All characters, animals, and props are original. Do not include text, logos, watermarks, UI, frame numbers, or grid lines in the artwork.

## Scale and camera contract

The game renders a logical **960 × 540** viewport into a **2400 × 540** reef world. The diver's visible swimming silhouette is the scale reference: **132 pixels long and approximately 66 pixels high**. Sizes below describe visible artwork, excluding transparent cell margins. The diver and fish face right in source art; the shark faces left. Runtime flipping creates the opposite direction.

| Asset | Visible game size | Relative scale | View and anchor |
| --- | --- | --- | --- |
| Diver | 132 × 66 | Reference length 1.0 | Horizontal side view; body center fixed |
| Golden reef dart | 48 × 32 | 0.36 diver lengths | Side view; body center fixed |
| Teal moonfin | 58 × 34 | 0.44 diver lengths | Side view; body center fixed |
| Coral wrasse | 60 × 26 | 0.45 diver lengths | Side view; body center fixed |
| Reef shark | 250 × 90 | 1.89 diver lengths | Side view; body center fixed |
| Adult villagers | 60 × 105 | Natural standing human proportions | Front or slight three-quarter view; feet anchored |
| Piko | 48 × 85 | Smaller child than the adults | Front or slight three-quarter view; feet anchored |
| Boat | 180 × 90 | Enough space to carry the diver | Side view; waterline anchored |
| Lost shell charm | 20 × 24 | Palm-sized collectible | Front view; center anchored |
| Reef environment | 2400 × 540 | Full world backdrop | Side view; no perspective camera tilt |
| Village environment | 960 × 540 | One shore scene | Stage-like side elevation with standing ground plane |

Do not render source resolution as game dimensions. Load high-resolution images and apply explicit display sizes in Phaser. Physics bodies must be sized to the visible artwork after scale, not to the source image dimensions. Source art should have enough detail for close inspection, but details that disappear at runtime should not carry gameplay meaning.

## Pack contents and animation plan

Animation sheets contain **62 distinct authored frames**. Transforming or repeating one illustration does not count as additional authored frames. Engine bobbing and particles may supplement these cycles.

| Sheet | Frames | Grid, read left to right then top to bottom | Source cell / sheet target | Playback |
| --- | ---: | --- | --- | --- |
| Diver swim | 12 | 4 columns × 3 rows | 256 × 256 runtime / 1024 × 768 atlas | 10–12 fps, loop |
| Golden reef dart swim | 8 | 4 × 2 | 256 × 256 runtime / 1024 × 512 atlas | 8–10 fps, loop |
| Teal moonfin swim | 8 | 4 × 2 | 256 × 256 runtime / 1024 × 512 atlas | 8–10 fps, loop |
| Coral wrasse swim | 8 | 4 × 2 | 256 × 256 runtime / 1024 × 512 atlas | 8–10 fps, loop |
| Reef shark swim | 8 | 4 × 2 | 256 × 256 runtime / 1024 × 512 atlas | 6–8 fps, loop |
| Malia idle | 6 | 3 × 2 | 256 × 256 runtime / 768 × 512 atlas | 3 fps, loop |
| Tane idle | 6 | 3 × 2 | 256 × 256 runtime / 768 × 512 atlas | 3 fps, loop |
| Piko idle | 6 | 3 × 2 | 256 × 256 runtime / 768 × 512 atlas | 3 fps, loop |

Additional images: reef background, village background, boat, shell charm, and the single-actor reference images used to lock identity. Keep a manifest beside the source code or assets with actual image dimensions, grid, frame count, frame order, animation rate, visible game size, and origin. If imagegen returns a different canvas size, inspect it and record the real frame geometry; do not silently assume the requested dimensions.

## Generation and packaging status

- All new illustrated art and animation sheets are generated with the **built-in imagegen tool** using the approved key art and selected single-actor illustrations as references.
- The first diver sheet contained poses that were too close to duplicates. That version was rejected as an animation source. The replacement contains twelve stronger phases with visible alternating leg kicks and an arm stroke. Keep the rejected version out of the runtime atlas.
- An actual animated proof of the selected diver cycle is written to `../outputs/diver-swim-preview.gif`, outside this repository and its published directory. Review the moving proof as well as the static sheet.
- High-resolution generated PNG sheets live under `art/source/`. `scripts/prepare-game-art.mjs` uses **Sharp** to extract the specified grid cells and package runtime **lossless WebP** atlases under `public/images/game/`. Each runtime cell is normalized to **256 × 256 pixels**. The script uses **gifenc** to create the animated diver proof. These are packaging operations on generated artwork; they do not substitute repeated transforms for authored animation frames.
- The packaging script writes `public/images/game/manifest.json` with actual grid dimensions and frame counts. The renderer must distinguish the square frame canvas from the visible actor inside its transparent padding.
- Current display canvases are 150 × 150 for the diver, 56 × 56 for the golden fish, 66 × 66 for teal/coral fish, 260 × 260 for the shark, 128 × 128 for adult villagers, and 104 × 104 for Piko. These are frame-canvas sizes, not claims about visible anatomy. The shark remains roughly twice the diver's visible length. Preserve natural aspect ratios and check the visible silhouettes together before finalizing scale.
- Village and NPC assets are generated and reviewed. All 18 final villager frames have an opaque foot baseline at y=239 and midpoint within one pixel of x=128 in the normalized atlas; no frame clips the figure.

### Review findings and resolution

The generated source cells inspected for the current diver, fish, shark, and villager sheets are square; their delivered canvas dimensions differ from the prompt targets. Rounded extraction boundaries normalize fractional source cells for the fish/shark sheets. Inspect row and column seams after packaging.

The initial NPC candidates shifted horizontally and Piko had clipped frames. Those candidates were replaced, then the replacement sheets were registered to a fixed foot anchor. The final review found no material remaining clipping or registration issues. Overall alpha coverage alone was not used as proof of completeness.

Physics dimensions are specified in source-frame pixels before sprite scaling in Phaser. For example, a 100 × 75 body on a 256-pixel frame displayed at 150 pixels becomes approximately 59 × 44 game pixels. Review world-space collision bounds rather than comparing the numeric source-body size directly with the actor's display size.

### Registration rules for every sheet

- Use a genuinely transparent background for actors and props. No painted checkerboards, dark rectangles, scenery, shadows, or floor strips.
- Use identical cell dimensions with no gutters, margins between cells, frame labels, or visible grid lines.
- Keep each actor centered on the same anchor, at the same apparent size and camera angle in every frame. Villager feet stay on one baseline.
- Keep all fins, hands, hair, tails, tools, and clothes inside their own cells. Leave enough internal padding for the largest motion.
- Draw sequential phases of one continuous motion. The last frame transitions smoothly into the first; do not duplicate the first as the final frame.
- Keep identity, facial features, suit patches, fish markings, basket, proportions, and outline weight stable. Animate form, not the grain pattern or character design.
- Inspect sheets at full size and run the loops in Phaser before shipping. Generated sheets are candidates until registration, frame count, transparency, and movement have been reviewed.

## Drawing briefs

### Reef background

Draw a wide underwater panorama with a thin cream wave band at the top, open deep teal swimming space through the middle, and richly layered reef formations in the lower portion. Include naturally varied rocks, scalloped shell fans, ochre sponges, flowing seaweed ribbons, and coral branches. Leave sandy gaps and clear navigation space. Use distant reef silhouettes to establish depth. No people, animals, collectibles, boat, UI, or rectangular border. Environment details should support the actor scale rather than dwarfing a small fish into invisibility. Deliver an opaque image.

### Village background

Draw the same island village at night, in the same print style. Include a wooden dock across the lower middle, a shared kitchen, small homes, warm lanterns, a quiet sea, and a dusk sky. Corrugated roof metal must have straight rigid ridges and hard edges, not fabric seams or clothing patches. Reserve clear standing spaces for three separately drawn villagers. No people, portraits, embedded dialogue, text, or UI. Deliver an opaque image. Keep restoration overlays separate so repaired roofs and brighter windows can visibly change in play.

### Diver swim sheet

Use the generated single diver and approved key art as identity references. A young diver with tied-back dark hair, cream-rimmed goggles, a coral/teal patchwork wetsuit, teal fins, and a small woven basket swims horizontally to the right. Make twelve sequential phases of gentle alternating fin kicks; hair and loose cloth trail naturally. The body and basket stay steady while legs flex. The forward arm performs a clear pull and recovery stroke. Across the 12 poses, the legs alternate through raised, closing, together, and reversed kick positions; near-duplicate poses were rejected. Keep natural hands with four fingers and a thumb where visible. No skin markings. Do not fill the basket with a different haul on every frame.

### Fish swim sheets

Use the corresponding generated single fish as the identity reference for each sheet. All eight frames face right with a fixed body center and a subtle tail oscillation cycle. Dorsal and pectoral fins follow that movement. Keep the face, markings, body size, and silhouette recognizable.

- **Golden reef dart:** small rounded golden body, short spiny dorsal fin, cream carved fin rays, original dark stripe shapes. Short and quick tail beats.
- **Teal moonfin:** elegant teal teardrop body with longer flowing dorsal and tail fins, cream carved stripes. A slower flowing tail cycle.
- **Coral wrasse:** slender coral body with ochre tail and dorsal fin, curved cream scale marks. A narrow, slightly more flexible swimming shape.

### Shark swim sheet

Use the generated single shark as the identity reference. Draw eight phases of a grey-green reef shark swimming to the left. It is roughly twice the diver's visible length. Keep natural anatomy: triangular dorsal fin, swept pectoral fins, gill slits, and a strong crescent tail. The tail and rear body sweep gently from side to side while the head remains stable. Calm and imposing, with no smile or exposed teeth. Clear predator silhouette is essential.

### Villager idle sheets

Each six-frame sheet shows one full-body villager in a front or slight three-quarter view. Use subtle breathing, one blink, and a restrained hand or clothing movement. The feet remain fixed. No walking, changing viewpoints, extra characters, tools appearing or disappearing, or exaggerated bobbing.

- **Malia, the cook:** an older woman with grey hair tied back, a warm coral outfit, and a practical cream apron. Warm, welcoming expression. Hands rest comfortably near the apron.
- **Tane, the builder:** a friendly adult man in ochre work clothes and a broad woven hat. A simple repair tool stays consistently tucked at the belt. Relaxed grounded stance.
- **Piko, the explorer:** a smaller child in teal/coral island clothes, curious expression, and a modest satchel. One small expectant hand gesture during the idle cycle. Their scale should remain smaller than both adults.

### Boat and charm

- **Boat:** a small wooden island fishing boat in side profile, with a sturdy hull, two seats, a simple mooring rope, and original carved equipment decoration. Sized to carry the diver. Transparent background, no water or people. It can bob and rock through Phaser transforms without a separate frame sheet.
- **Shell charm:** a small recognizable shell on a short cord, ochre/cream against a dark outline, readable at 20 × 24 game pixels. Transparent background and no glow painted into the file; collectible highlighting is an engine effect.

## Prompt construction

For each built-in imagegen call, combine the shared direction, the relevant drawing brief, its camera/view, the transparency requirement, and the exact grid/registration rules if animated. Label attached images as either **style reference** or **identity reference**. Use one call per distinct asset or sheet. Preserve the exact prompt and generated source path in the asset manifest or an accompanying generation log.

Example sheet prompt structure:

> Production 2D game animation sheet. Style reference: approved Reefkeeper key art. Identity reference: the selected single diver image. Draw twelve distinct sequential frames of the diver swim cycle described in the brief. Exact four-column, three-row grid, equal cells, no gutters or labels, transparent background. Same character size, body center, camera view, basket, suit patches, and outline weight in every cell. Full silhouette stays within each cell. Warm carved linocut ink and paper texture. No text, UI, scenery, borders, duplicates, or changing character design.

## Acceptance before publication

1. Inspect every image against the approved key art for style and identity.
2. Verify source dimensions and actual alpha transparency for every actor/prop.
3. Check all sheet cells for clipping, missing parts, extra limbs, changed markings, and inconsistent camera angles.
4. Preview every animation at its intended runtime size and frame rate; reject visible jitter, blank frames, clipped fins, and abrupt loop seams.
5. Check relative scale in a composite gameplay view with the diver, all fish, shark, boat, and charm together.
6. Play the game with the final art to confirm collision bodies and catch ranges still agree with the displayed actors.
7. Keep discarded candidates out of the runtime asset manifest. Publish only reviewed selections.

## Selected pack verification

- All 12 required sources are present; source alpha checked on every sheet.
- Runtime sheets use 256-pixel square cells, with original colors and alpha preserved. NPCs are packed with uniform per-sheet scaling and a shared foot anchor at (128, 240). Clipped opaque silhouettes fail preparation.
- Regenerated Malia with two hands holding her bowl; regenerated Tane and Piko with safe margins and fixed resting arms. Rejected their earlier clipped or drifting candidates.
- `npm run art:prepare` rebuilds atlases; `npm run art:preview` creates an actual moving GIF at game-relative sizes.
- Animated proof: `../outputs/game-art-animation-preview.gif`. The GIF plays 30 composite frames and shows all eight actor loops together, rather than relying on static sprite-sheet previews.
- Browser smoke coverage includes keyboard and touch movement, capture, keepsake return, night conversations, a second active dive, and saved progress.
- Built-in imagegen created the illustration and pose sheets. Sharp performs format conversion and frame packing; gifenc encodes the animated proof.
