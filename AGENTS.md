# Agent notes

## Project shape

- This is a static Cloudflare Pages site. Public files live only in `public/`.
- Cloudflare Pages Functions live in `functions/` and provide the score API.
- High scores are stored in Cloudflare D1 through the `DB` binding.
- Keep the game approachable for a child: avoid accounts, tracking, and collection of identifying details.

## Publishing safety

- **Never put Markdown documentation in `public/`.** Cloudflare Pages publishes `public/`; Markdown files must remain at the repository root or elsewhere outside that directory.
- `npm run build` checks recursively that `public/` contains no `.md`, `.markdown`, or `.mdx` files. Keep this check in place.
- `wrangler.toml`, migrations, `functions/`, and repository docs are outside the published directory.

## Score API

- `GET /api/scores?game=<slug>` returns up to 10 scores.
- `POST /api/scores` accepts `{ "game": "star-catcher", "nickname": "...", "score": 12 }`.
- Validate all browser input on the server. Scores are casual and client-submitted, so do not present them as cheat-proof.
- Apply schema changes as new SQL migrations under `migrations/`; do not edit an already-applied migration.
- A Pages D1 binding named `DB` must be configured in the Cloudflare project. Follow `README.md` before the first deployment.

## Local work

- Run `npm run build` after changing static files or the publishing check.
- Run the Pages Functions locally with Wrangler after configuring the local D1 binding as described in `README.md`.
