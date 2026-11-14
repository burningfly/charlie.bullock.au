# First Game Requirements: Reefkeeper

**Status:** Draft for the first playable build  
**Working title:** Reefkeeper  
**Audience:** Charlie, age 8, and family  
**Platform:** Responsive browser game at `charlie.bullock.au`

## 1. Game idea

The player is a young diver helping a small seaside village recover after a typhoon. During the day, the player explores a nearby reef, catches fish for the shared kitchen, and finds useful things washed away by the storm. At night, the player returns to shore, talks with villagers, and sees the community rebuild as people share food and help one another.

The game takes broad inspiration from the dive-and-return rhythm of *Dave the Diver*. Its characters, setting, story, art, interface, dialogue, and moment-to-moment mechanics must be original and must not copy that game's protected material.

## 2. Design goals

1. Make exploring the reef and catching fish feel fun, clear, and forgiving.
2. Make each return to shore show that the player's help mattered.
3. Give villagers short, warm conversations and practical requests.
4. Let the player discover a few species and keepsakes without needing long reading sessions.
5. Make it comfortable to play with keyboard or touch on a phone, tablet, or desktop.

## 3. Tone and audience guardrails

- Treat the typhoon as a past event. Do not show injury, death, frightening disaster scenes, or people in immediate danger.
- Show storm damage gently: patched roofs, driftwood to clear, a broken dock, and homes that become brighter and sturdier over time.
- Villagers are active helpers with names and personalities; they are not presented as helpless props.
- Reef predators are hazards the diver can spot and avoid while exploring.
- A spear gun may be offered as an optional fishing-tool upgrade, letting the player catch fish from a distance.
- Use simple instructions, short dialogue, readable text, large touch targets, and no punishment for running out of air or time.
- Sound is optional. Respect reduced-motion preferences.

## 4. Core play loop

1. **Day — prepare:** The player starts at the village dock and sees a short goal or reminder.
2. **Day — dive:** The player swims through one compact reef area, catches fish, and may find a washed-up object.
3. **Return:** The dive ends when the player chooses to return or the air meter runs low. The player always returns safely; a short dive is not a game over.
4. **Night — share:** The player gives fish to the village kitchen and any requested items to the villager who needs them.
5. **Night — connect:** The player can talk to villagers, accept or turn in a request, and occasionally visit a traveling merchant.
6. **Progress:** The shared kitchen, homes, and dock are repaired in visible stages. The next day begins when the player chooses to leave the night scene.

## 5. First playable slice (MVP)

The first playable build must include:

- One 2D side-view reef scene and one village-at-night scene.
- Keyboard controls: arrow keys or WASD to swim, Space to catch/interact, Escape to pause or return where safe.
- Touch controls: large on-screen swim controls plus a catch/interact button.
- A short dive with a clearly visible air meter and a safe return when it runs low.
- Three visually distinct, friendly fish species with simple names and catch feedback.
- One washed-up keepsake that can be found and returned to a villager.
- A small carrying limit so the player chooses what to bring back, without losing items on a safe return.
- Two or three villagers with brief dialogue; at least one asks for a specific keepsake or a small number of a fish species.
- A shared kitchen that visibly improves after contributions. Show a clear before/after change on the first completed night.
- A basic best-haul leaderboard using the existing `/api/scores` endpoint. Submit only a nickname, game slug, score, and timestamp as already supported by the site.
- Progress saved locally in the browser so the village does not reset between visits on the same device.
- A pause/restart path and a clear explanation of controls before the first dive.

## 6. Follow-up features after the MVP

These are part of the intended game, but should follow the first complete day/night cycle:

### Villager requests

- Requests may ask for a named lost object or a small count of a particular fish species.
- Requests remain understandable without a journal full of text; show a simple icon, short sentence, and progress count.
- Completing a request gives thanks and a visible community improvement or helpful reward.
- Players can accept, ignore, or complete a request later without penalty.

### Traveling merchant

- The merchant appears on some nights, not every night.
- Offer one or two items at a time, such as a larger fish basket, a better net, a spear gun, or a faster/safely upgraded boat.
- Prices and effects are explained in child-friendly language; buying is optional.
- Currency must be earned in play and never bought with real money.

### Village restoration

- Add visible stages for shared spaces such as the kitchen, homes, and dock.
- Improvements reflect contributions from the player and villagers working together.
- Keep progress feedback celebratory but low-pressure; there is no deadline or failure state for rebuilding.

## 7. Controls and usability

- The full game must be playable using keyboard alone or touch alone.
- Controls must be visible during the first dive and available from a help button later.
- The game must pause when the browser tab is hidden and resume safely.
- Avoid rapid flashing, forced camera shake, tiny targets, and color-only indicators.
- Dialogue can be advanced at the player's pace; no timed response choices.
- Responsive layout must keep the reef, player, air meter, and controls visible on a phone screen.

## 8. Progress, data, and privacy

- Save game progress in local browser storage; no account is required.
- The optional best-haul leaderboard uses the site's existing Cloudflare D1 score API.
- Ask for a nickname only. Do not request a real name, email, location, age, or other personal details.
- Scores are casual browser-submitted records and are not cheat-proof.
- If the score service is unavailable, the dive remains playable and the game explains that the score could not be saved.

## 9. Art direction

- Use a bold, handmade printmaking art style inspired by traditional Neo-Polynesian tribal tattoo art: simplified shapes, confident black contours, carved or dry-ink texture, and visible paper grain.
- Use original geometric rhythms and flowing ornamental bands on the frame, reef, dock, boat, and gear to carry that influence through the game's visual design.
- Keep the diver's skin and faces unmarked. Do not reproduce sacred, identity-specific, or recognizable traditional tattoo motifs or layouts.
- Use a small palette of deep ink, warm paper, sea-glass teal, coral red, and ochre.
- Keep gentle storm-recovery details: patched roofs, cleared driftwood, and lanterns being rehung.
- The diver has an original, recognizable silhouette and equipment. Do not imitate existing game characters or promotional art.
- Key art may show a single scene across the waterline: villagers rebuilding at dusk above, with the diver returning below carrying fish past a reef and a found keepsake.
- No embedded text, logos, copied UI, or recognizable copyrighted characters in generated artwork.

## 10. First-build acceptance criteria

The MVP is ready for a child to try when:

1. The player can understand the controls and start a dive without adult explanation.
2. The player can swim, catch each of the three fish types, and find the keepsake using keyboard and touch.
3. A safe return works both when the player chooses it and when air runs low.
4. At night, the player can deliver the haul, talk to villagers, and complete the first request.
5. At least one village structure visibly changes after the first successful contribution.
6. Progress remains after refreshing or revisiting the site on the same device.
7. The leaderboard can be read and a nickname/score submitted; failure of the API does not block play.
8. Build output remains `public/`, and the repository's build check continues to reject `.md`, `.markdown`, and `.mdx` files under that directory.

## 11. Decisions assumed for this draft

- Use a 2D side-view reef for easy keyboard and touch controls.
- Make the first outing short and forgiving; air is a gentle return cue, not a life system.
- Fish are shared as meals; the core reward is visible village recovery, not combat or selling food for profit.
- Use local storage for progress and the existing score service for an optional best-haul table.
- Keep merchant upgrades and multiple restoration chains for a follow-up slice after the first day/night cycle is fun.
