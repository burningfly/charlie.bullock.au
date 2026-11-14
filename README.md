# Charlie's Game Lab

A small, playful home for games made by Charlie. The first page contains a tiny star-catching game and a shared high-score table.

## Hosting and data

The site is designed for Cloudflare Pages, with static files in `public/`, a Pages Function at `/api/scores`, and a Cloudflare D1 database. The repository's Markdown documentation is outside `public/`, so it is not included in the deployed site. `npm run build` fails if a Markdown file is added under `public/`.

### First-time Cloudflare setup

1. Create a Cloudflare Pages project connected to this GitHub repository. Set the build command to `npm run build` and the build output directory to `public`.
2. Create a D1 database named `charlie-game-scores` (for example, with `npx wrangler d1 create charlie-game-scores`).
3. Apply the schema with `npx wrangler d1 migrations apply charlie-game-scores --remote`.
4. In the Pages project's Settings → Bindings, add a D1 database binding with variable name `DB` and select `charlie-game-scores`. Redeploy after adding the binding.
5. Attach `charlie.bullock.au` to the Pages project if it is not already configured.

Cloudflare's Workers Free plan currently includes 100,000 Worker requests per day. D1's Free plan currently includes 5 million rows read and 100,000 rows written per day, plus 5 GB total storage. Keep the account on the Free plan to avoid opting into usage-based Workers charges; at free limits requests or database queries may fail until the quota resets. Check current Cloudflare pricing before changing plans.

### Local development

Install Wrangler with `npm install` if needed. Run `npx wrangler pages dev public --d1 DB=<database-id>` to serve the site and Functions locally with a local D1 database. Wrangler persists local state under `.wrangler/`, which is ignored by Git.

## Privacy and score integrity

Only a nickname, game slug, score, and timestamp are stored. Ask players to use a nickname rather than a full name or other personal details. Scores come from the browser, so a determined player can submit a made-up score; this is suitable for a casual family leaderboard, not a competitive one.

## Repository layout

- `public/` — website assets that Cloudflare Pages publishes
- `functions/api/scores.js` — score list and submission endpoint
- `migrations/` — D1 SQL schema migrations
- `AGENTS.md` — working instructions for coding agents
