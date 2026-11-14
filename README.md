# Charlie's Game Lab

Charlie's Game Lab is a small home for games made by Charlie. Its first game is **Reefkeeper**, a short, friendly island adventure about diving for fish and helping a village rebuild after a storm.

## Play Reefkeeper

- Swim with **WASD** or the **arrow keys**. On small touch screens, use the on-screen direction pad; you can also tap the water to swim that way.
- Swim near a fish and press **Space** or **Catch** to add it to your basket. Find a shell charm on the reef, too.
- Bring your diver home with **Escape** or by swimming to the **Boat / Home** marker. If the air gauge runs low, the boat brings you back safely.
- At night, share fish with the village, talk to neighbours, and rest until morning. Your progress saves on this device.
- A travelling fisher sometimes visits the night market. Save shells for a spear gun upgrade that lets you catch fish from farther away.
- If a large reef fish swims close, give it room and swim around it. A bump sends you safely back a little way and uses some air.

The optional **Biggest baskets** board stores a nickname and fish count in Cloudflare D1. Use a nickname rather than a real name. The score is a casual browser-submitted record, not a secure competition. The adventure still works when the scoreboard is unavailable.

## Hosting and data

This is a static Cloudflare Pages site. Public files live in `public/`; Pages Functions live in `functions/`, and the score endpoint is at `/api/scores`. The existing D1 binding is named `DB`.

The repository's Markdown documentation is kept outside `public/`. `npm run build` rejects `.md`, `.markdown`, and `.mdx` files under the published directory. Cloudflare Pages is connected to the GitHub `main` branch, builds with `npm run build`, and publishes `public/`.

## Local development

```sh
npm install
npm run build
npm run dev
```

The local site runs at `http://localhost:8788`. The Pages Function needs a local D1 database to serve scores; without it, the game remains playable and shows a friendly scoreboard message. To exercise the score API with Wrangler, configure local D1 as described in Cloudflare's Pages Functions docs.

## Browser checks

```sh
npm run test:e2e
```

The Playwright smoke checks launch Chromium headlessly against the local Pages preview. They cover the first dive, catching, returning to shore, village sharing, saved progress, responsive layout, and an unavailable score API.

## Project files

- `public/` — static site files and artwork published by Cloudflare Pages
- `functions/api/scores.js` — leaderboard API
- `migrations/` — D1 schema migrations
- `docs/first-game-requirements.md` — game requirements
- `AGENTS.md` — instructions for coding agents
