# Agent notes

## Project shape

- This is a static Cloudflare Pages site. Public files live only in `public/`.
- The 2D game source is `src/game.js`; Phaser 3 handles scenes, input, camera, and Arcade Physics.
- `npm run build` bundles the game to `public/reefkeeper-2d.js` with esbuild before checking publish safety. Edit `src/game.js`, not the generated bundle.
- Cloudflare Pages Functions live in `functions/` and provide the score API.
- High scores are stored in Cloudflare D1 through the `DB` binding.
- Keep the game approachable for a child: avoid accounts, tracking, and collection of identifying details.

## Publishing safety

- **Never put Markdown documentation in `public/`.** Cloudflare Pages publishes `public/`; Markdown files must remain at the repository root or elsewhere outside that directory.
- `npm run build` checks recursively that `public/` contains no `.md`, `.markdown`, or `.mdx` files. Keep this check in place.
- `wrangler.toml`, migrations, `functions/`, and repository docs are outside the published directory.

## Score API

- `GET /api/scores?game=<slug>` returns up to 10 scores.
- `POST /api/scores` accepts `{ "game": "reefkeeper", "nickname": "...", "score": 12 }`.
- Validate all browser input on the server. Scores are casual and client-submitted, so do not present them as cheat-proof.
- Apply schema changes as new SQL migrations under `migrations/`; do not edit an already-applied migration.
- A Pages D1 binding named `DB` must be configured in the Cloudflare project. Follow `README.md` before the first deployment.

## Local work

- Run `npm run build` after changing static files or the publishing check.
- Run `npm run test:e2e` for the headless Chromium smoke flow, including keyboard and mobile controls.
- Run the Pages Functions locally with Wrangler after configuring the local D1 binding as described in `README.md`.

## Living village rebuild

- `docs/rebuild.md` records the current town/reef loop and asset briefs.
- Village navigation uses `ShoreScene`; its dialogue and repair board sit below the canvas so they never block walking or NPC selection.
- Save fields `wood`, `repairs`, `species`, and `moonQuest` extend existing saves. Shared species counts are credited once per haul; timber transfers once on safe return.
- New art sources: `town-panorama.png`, `town-restored.png`, `shore-walk.png`; export using `npm run art:prepare`. Do not replace actors with geometric fallback drawings.

## Buildings and conversations

- `RoomScene` supplies kitchen/home/workshop interiors. Pause/resume `ShoreScene` when entering/leaving; publish `data-scene=village` only after its RESUME event so keyboard controls are ready.
- All dialogue should call `presentDialogue()` to show the in-game conversation, not only update below-canvas text. Room touch actions need their own handler; paused shore handlers must not process them.
- New Game pauses play and confirms before clearing only `reefkeeper-save`. Never clear all origin storage or shared scores.
- Interior atlas source is `art/source/room-interiors.png`, exported in thirds by `art:prepare`. Extra tests cover doors, room conversation/touch, leave/rest, reset cancellation and confirmation, repair discounts, and celebration.
