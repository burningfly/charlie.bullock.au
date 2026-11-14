# Reefkeeper: living village rebuild

Replaces the static night tableau with an 1800-pixel walkable village. Retains Phaser, the working score API, and selected illustrated actors and reef assets.

## Play loop

- Explore three named reef habitats with 14 schooling fish, shark avoidance, a lost charm and three storm-washed timber pickups.
- Fish fill a limited basket; timber is separate. Air depletion always returns the player safely.
- Return at dusk with fish and timber. Walk left/right or choose a destination: kitchen, family home, workshop, market, lookout.
- Share fish to earn shells and feed builders. Species counts accumulate only when shared.
- Malia rewards two shared moonfins with three shells. Piko rewards returning the charm with two shells. Both rewards are once per save.
- Repair the kitchen with one timber after three shared meals; the home with two timber after six meals; the jetty with three timber after twelve meals. Food requirements are milestones, not a second spending currency.
- Repaired structures replace the damaged illustration with corresponding sections of the restored panorama. Repairs and inventory persist.
- Every second night a merchant offers spear gun, basket and air tank upgrades. Rest begins another active dive.

## Visual direction

Fun hand-printed linocut with warm paper, bold ink contours, teal/coral/ochre, original Polynesian-inspired geometric rhythms. Retain proportionate fish and the diver's movement-only swim cycle. NPC animation rates and starting frames differ.

New production art, generated with the built-in image tool:

- `art/source/town-panorama.png`: rich side-elevation coastal town, 3:1, continuous sandy path, kitchen, two-storey home, workshop, market, lookout, layered palms and island, dusk. Corrugated metal roofs with storm damage; no characters or text. Reference: approved key art for style.
- `art/source/town-restored.png`: precise edit of that panorama repairing missing metal roof panels and jetty rails, adding lanterns/flowers while preserving framing and building locations.
- `art/source/shore-walk.png`: eight distinct side-profile walking frames, 4x2 transparent grid, main diver wearing patched wetsuit, headband and goggles pushed up, bare feet; same fun print style and consistent scale.

`npm run art:prepare` exports production WebP and registers walking feet to a consistent baseline. Public images live in `public/images/game/`. Markdown remains outside public.

## Regression checks

`npm run test:e2e` covers keyboard/touch diving, catch, float vs swim, charm, return, food, score submission and offline behavior, next day and saved progress; additionally real-control timber collection, village walking and destinations, repairs and timber expenditure, species reward, market upgrade, repair persistence, and mobile overflow. Multi-day progression uses a seeded save to avoid repetitive grinding in tests.

## Movement-state correction

Standing and floating use dedicated eight-frame idle sheets, generated with the built-in image tool. Shore idle brief: same character and print style, side profile, both bare feet planted, arms relaxed, subtle breathing/blink, transparent 4x2 atlas. Floating brief: same diver and basket, relaxed slightly diagonal hover, both hands at basket, no swim strokes or alternating kicks, eight transparent frames. Float generation required a background-removal correction.

Assets: `art/source/shore-idle.png` and `art/source/diver-float.png`, exported beside the other game atlases. State changes blend poses over 140ms; reduced-motion mode uses a static idle pose. Walking is registered around a stable head/body anchor instead of the alternating contact foot. Camera rendering preserves fractional pixels.

## Town life and usable buildings

- Kitchen, home and workshop doors now open a separate `RoomScene`. Clicking the building facade, its label, or its destination button enters. Space interacts with the nearest place; Escape leaves a room. Rooms provide Talk/Share/Repair/Rest/Leave buttons, and NPCs themselves can be clicked.
- Conversations appear over the game with speaker name, readable text and a dismiss button. Village movement stops while a conversation is open.
- Shop cards offer all three upgrades independently, with prices, effects, ownership and affordability. The merchant still visits on even days.
- Add workshop restoration (18 shared meals, 4 timber). Home reduces air use by 10%, dock increases swim speed by 12%, workshop reduces equipment prices by one shell.
- A rotating daily supper request pays 2 shells for sharing two of the day's species, once per day. Rebuild all four structures and complete both neighbour quests to hold the village celebration.
- Rest automatically shares an unshared catch. Found charms survive returns/reloads until handed back.
- New Game opens an accessible confirmation dialog and pauses play; cancelling preserves the save. Confirming clears only this game's browser save, then starts Day 1. Published leaderboard entries are untouched.

Interior art was generated with the built-in image tool from the approved town style. Source: `art/source/room-interiors.png`. Brief: three equal-height 16:9 interior panels stacked vertically—communal kitchen with stove and table; family home with beds and hammock; carpenter workshop with tool rack and canoe. Side-on stage, clear floor for actors, no people or text, same fun linocut palette and original geometric motifs. Export: `room-kitchen.webp`, `room-home.webp`, `room-workshop.webp` under `public/images/game/`.

Next priorities after this update: a richer fish collection journal, more reef layouts across days, and a proper save of an unfinished dive/night rather than only persistent village progress.
