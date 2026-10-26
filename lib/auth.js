// Accounts, sessions and login protection.
// - Passwords are hashed with bcrypt (never stored as plain text).
// - The session cookie holds a random token; only its SHA-256 hash is stored.
// - Failed logins are rate-limited per IP and per email.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 12;
const MAX_FAILS = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');

// Used to spend the same time on unknown emails as on wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validate(email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return 'Please enter a valid email address.';
  }
  if (password.length < 8) return 'Your password needs at least 8 characters.';
  if (password.length > 200) return 'That password is too long.';
  return null;
}

async function register(rawEmail, password) {
  const email = normalizeEmail(rawEmail);
  const problem = validate(email, String(password || ''));
  if (problem) return { error: problem };
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const result = await db.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash]);
    return { userId: result.insertId };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { error: 'An account with that email already exists. Try logging in.' };
    throw err;
  }
}

// --- rate limiting (in memory; resets when the app restarts) ---
const fails = new Map();

function isBlocked(key) {
  const entry = fails.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > FAIL_WINDOW_MS) { fails.delete(key); return false; }
  return entry.count >= MAX_FAILS;
}

function recordFail(key) {
  const entry = fails.get(key);
  if (!entry || Date.now() - entry.first > FAIL_WINDOW_MS) fails.set(key, { count: 1, first: Date.now() });
  else entry.count++;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of fails) if (now - entry.first > FAIL_WINDOW_MS) fails.delete(key);
}, FAIL_WINDOW_MS).unref();

async function login(rawEmail, password, ip) {
  const email = normalizeEmail(rawEmail);
  const keys = ['ip:' + ip, 'email:' + email];
  if (keys.some(isBlocked)) {
    return { error: 'Too many failed attempts. Please wait 15 minutes and try again.' };
  }
  const rows = await db.query('SELECT id, password_hash FROM users WHERE email = ?', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(String(password || ''), user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    keys.forEach(recordFail);
    return { error: 'That email and password don’t match.' };
  }
  keys.forEach(k => fails.delete(k));
  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  return { userId: user.id };
}

async function createSession(userId) {
  const token = randomToken();
  await db.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL ? DAY)',
    [sha256(token), userId, SESSION_DAYS]
  );
  return { token, maxAge: SESSION_DAYS * 86400 };
}

async function getUser(token) {
  if (!token) return null;
  const rows = await db.query(
    `SELECT u.id, u.email, u.created_at, u.last_login_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [sha256(token)]
  );
  return rows[0] || null;
}

async function destroySession(token) {
  if (token) await db.query('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)]);
}

async function purgeExpired() {
  await db.query('DELETE FROM sessions WHERE expires_at <= NOW()');
}

module.exports = { register, login, createSession, getUser, destroySession, purgeExpired, randomToken };
