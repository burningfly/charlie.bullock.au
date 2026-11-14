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
