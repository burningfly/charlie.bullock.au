const GAME = "star-catcher";
const ROUND_SECONDS = 15;
const scoreNode = document.querySelector("#score");
const timeNode = document.querySelector("#time");
const playButton = document.querySelector("#play-button");
const messageNode = document.querySelector("#game-message");
const scoreForm = document.querySelector("#score-form");
const scoreList = document.querySelector("#score-list");
let score = 0;
let timer = null;
let playing = false;

function renderScores(scores) {
  scoreList.replaceChildren();
  if (!scores.length) {
    const empty = document.createElement("li");
    empty.className = "empty-score";
    empty.textContent = "No scores yet. Be the first to play!";
    scoreList.append(empty);
    return;
  }
  scores.forEach((entry, index) => {
    const row = document.createElement("li");
    const name = document.createElement("span");
    name.className = "rank-name";
    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = ["🥇", "🥈", "🥉"][index] || `${index + 1}.`;
    const nickname = document.createElement("span");
    nickname.textContent = entry.nickname;
    const points = document.createElement("span");
    points.className = "score-value";
    points.textContent = `${entry.score} ✦`;
    name.append(rank, nickname);
    row.append(name, points);
    scoreList.append(row);
  });
}

async function loadScores() {
  try {
    const response = await fetch(`/api/scores?game=${GAME}`);
    if (!response.ok) throw new Error("Score service unavailable");
    const data = await response.json();
    renderScores(data.scores);
  } catch {
    const unavailable = document.createElement("li");
    unavailable.className = "empty-score";
    unavailable.textContent = "The scoreboard will appear when it is connected.";
    scoreList.replaceChildren(unavailable);
  }
}

function finishRound() {
  playing = false;
  clearInterval(timer);
  timeNode.textContent = "0";
  playButton.disabled = false;
  playButton.textContent = "Play again";
  messageNode.textContent = `Time's up! You caught ${score} star${score === 1 ? "" : "s"}.`;
  scoreForm.hidden = false;
  document.querySelector("#nickname").focus();
}

playButton.addEventListener("click", () => {
  if (playing) {
    score += 1;
    scoreNode.textContent = String(score);
    return;
  }
  score = 0;
  playing = true;
  scoreNode.textContent = "0";
  timeNode.textContent = String(ROUND_SECONDS);
  scoreForm.hidden = true;
  playButton.disabled = false;
  playButton.textContent = "Catch a star! ✨";
  messageNode.textContent = "Tap as fast as you can!";
  const stopAt = Date.now() + ROUND_SECONDS * 1000;
  timer = setInterval(() => {
    const secondsLeft = Math.max(0, Math.ceil((stopAt - Date.now()) / 1000));
    timeNode.textContent = String(secondsLeft);
    if (secondsLeft === 0) finishRound();
  }, 100);
});

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = scoreForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  messageNode.textContent = "Saving your score…";
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game: GAME,
        nickname: new FormData(scoreForm).get("nickname"),
        score,
      }),
    });
    if (!response.ok) throw new Error("Could not save score");
    scoreForm.hidden = true;
    messageNode.textContent = "Score saved. Great catching!";
    await loadScores();
  } catch {
    messageNode.textContent = "Couldn't reach the scoreboard. Please try again later.";
  } finally {
    submitButton.disabled = false;
  }
});

loadScores();
