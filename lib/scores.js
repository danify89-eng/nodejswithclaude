// Snake high scores. The game runs in the browser, so scores can't be fully
// trusted; we reject impossible ones (too high, or faster than the snake can
// move) and limit how often one account can submit.

const db = require('./db');

const MAX_SCORE = 400;           // a full 20x20 board
const MIN_MS_PER_APPLE = 300;    // at top speed the snake needs at least this long per apple
const SUBMIT_GAP_MS = 5000;

const lastSubmit = new Map();

function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  return name.slice(0, 2) + '***@' + (domain || '');
}

function check(score, durationMs) {
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) return 'That score isn’t valid.';
  if (!Number.isInteger(durationMs) || durationMs < score * MIN_MS_PER_APPLE || durationMs > 6 * 3600 * 1000) {
    return 'That score isn’t valid.';
  }
  return null;
}

async function submit(userId, score, durationMs) {
  const problem = check(score, durationMs);
  if (problem) return { error: problem };
  const last = lastSubmit.get(userId) || 0;
  if (Date.now() - last < SUBMIT_GAP_MS) return { error: 'Slow down a little and try again.' };
  lastSubmit.set(userId, Date.now());
  await db.query('INSERT INTO snake_scores (user_id, score, duration_ms) VALUES (?, ?, ?)', [userId, score, durationMs]);
  return { ok: true, best: await personalBest(userId) };
}

async function personalBest(userId) {
  const rows = await db.query('SELECT MAX(score) AS best FROM snake_scores WHERE user_id = ?', [userId]);
  return rows[0].best || 0;
}

// Best score per player, top 10.
async function leaderboard() {
  const rows = await db.query(
    `SELECT u.email, MAX(s.score) AS score
       FROM snake_scores s JOIN users u ON u.id = s.user_id
      GROUP BY s.user_id
      ORDER BY score DESC, MIN(s.created_at) ASC
      LIMIT 10`
  );
  return rows.map(r => ({ player: maskEmail(r.email), score: r.score }));
}

setInterval(() => {
  const cutoff = Date.now() - SUBMIT_GAP_MS;
  for (const [id, t] of lastSubmit) if (t < cutoff) lastSubmit.delete(id);
}, 60000).unref();

module.exports = { submit, personalBest, leaderboard };
