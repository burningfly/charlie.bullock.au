const GAME_SLUG = /^[a-z0-9-]{1,32}$/;
const MAX_SCORE = 1_000_000_000;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const game = url.searchParams.get("game") || "star-catcher";
  if (!GAME_SLUG.test(game)) return json({ error: "Invalid game." }, 400);

  const { results } = await env.DB.prepare(
    "SELECT nickname, score, created_at FROM scores WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT 10",
  ).bind(game).all();
  return json({ scores: results });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send score details as JSON." }, 400);
  }

  const game = typeof body.game === "string" ? body.game : "";
  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
  const score = body.score;

  if (!GAME_SLUG.test(game)) return json({ error: "Invalid game." }, 400);
  if (!nickname || [...nickname].length > 20 || /[<>\u0000-\u001f]/.test(nickname)) {
    return json({ error: "Use a nickname of 1–20 characters." }, 400);
  }
  if (!Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE) {
    return json({ error: "Invalid score." }, 400);
  }

  await env.DB.prepare(
    "INSERT INTO scores (game, nickname, score) VALUES (?, ?, ?)",
  ).bind(game, nickname, score).run();

  return json({ saved: true });
}
