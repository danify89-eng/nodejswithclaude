// Guide: build a website with Claude Code + WebPros MCP, served by Node.js,
// with email/password accounts stored in MySQL.

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');
const auth = require('./lib/auth');
const views = require('./lib/views');

const PORT = process.env.PORT || 3000;
const PRODUCTION = process.env.NODE_ENV === 'production';
// Sub-path the app is mounted at in cPanel (e.g. "/nodejswithclaude"). Passenger
// may pass requests with or without it, so we strip it when present.
const BASE_URI = (process.env.BASE_URI || '').replace(/\/+$/, '');
const MAX_BODY = 10 * 1024;
const startedAt = new Date();

const guide = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
  .replace('</style>', views.NAV_STYLE + '</style>');

// --- small HTTP helpers ---

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

const html = (res, body, status = 200, headers) => send(res, status, 'text/html; charset=utf-8', body, headers);

function redirect(res, location, headers = {}) {
  res.writeHead(303, { Location: location, 'Cache-Control': 'no-store', ...headers });
  res.end();
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookie(name, value, { maxAge, sameSite = 'Lax' } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${sameSite}`;
  if (PRODUCTION) c += '; Secure';
  if (maxAge !== undefined) c += `; Max-Age=${maxAge}`;
  return c;
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('BODY_TOO_LARGE')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')))));
    req.on('error', reject);
  });
}

function clientIp(req) {
  // Behind cPanel's proxy the visitor's address is the first X-Forwarded-For entry.
  const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'unknown';
}

// Double-submit CSRF token: the same random value in a cookie and a hidden field.
function csrfFor(req, setCookies) {
  let token = parseCookies(req).csrf;
  if (!token || token.length < 20) {
    token = auth.randomToken();
    setCookies.push(cookie('csrf', token, { sameSite: 'Strict' }));
  }
  return token;
}

function csrfOk(req, form) {
  const token = parseCookies(req).csrf;
  return !!token && token === form.csrf;
}

// --- routes ---

async function handle(req, res) {
  let url = new URL(req.url, 'http://localhost').pathname;

  // "/nodejswithclaude" -> "/nodejswithclaude/" so relative links resolve.
  if (BASE_URI && url === BASE_URI) {
    res.writeHead(301, { Location: BASE_URI + '/' });
    return res.end();
  }
  if (BASE_URI && url.startsWith(BASE_URI + '/')) {
    url = url.slice(BASE_URI.length);
  }

  const method = req.method;
  const sid = parseCookies(req).sid;
  const setCookies = [];
  const dbUp = db.status().connected;
  let user = null;
  if (dbUp && sid) {
    try { user = await auth.getUser(sid); } catch (err) { console.error('Session lookup failed:', err.message); }
  }

  if (url === '/api/status' && method === 'GET') {
    return send(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      status: 'running',
      node: process.version,
      env: process.env.NODE_ENV || 'development',
      database: db.status().connected ? 'connected' : 'unavailable',
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime())
    }));
  }

  if ((url === '/' || url === '/index.html') && (method === 'GET' || method === 'HEAD')) {
    const csrf = csrfFor(req, setCookies);
    const page = guide.replace('<body>', '<body>\n' + views.nav(user, csrf));
    return html(res, page, 200, { 'Set-Cookie': setCookies });
  }

  const authRoutes = ['/login', '/register', '/account', '/logout'];
  if (!authRoutes.includes(url)) return send(res, 404, 'text/plain; charset=utf-8', 'Page not found');

  const csrf = csrfFor(req, setCookies);
  if (!dbUp) return html(res, views.unavailablePage(user, csrf), 503, { 'Set-Cookie': setCookies });

  if (method === 'GET') {
    if (url === '/login') {
      if (user) return redirect(res, '/account');
      const notice = new URL(req.url, 'http://localhost').searchParams.get('bye') ? 'You’ve been logged out.' : null;
      return html(res, views.loginPage({ csrf, notice }), 200, { 'Set-Cookie': setCookies });
    }
    if (url === '/register') {
      if (user) return redirect(res, '/account');
      return html(res, views.registerPage({ csrf }), 200, { 'Set-Cookie': setCookies });
    }
    if (url === '/account') {
      if (!user) return redirect(res, '/login');
      const notice = new URL(req.url, 'http://localhost').searchParams.get('welcome') ? 'Your account is ready. Welcome!' : null;
      return html(res, views.accountPage({ user, csrf, notice }), 200, { 'Set-Cookie': setCookies });
    }
    return redirect(res, '/');
  }

  if (method !== 'POST') return send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed');

  let form;
  try { form = await readForm(req); } catch { return send(res, 413, 'text/plain; charset=utf-8', 'Request too large'); }

  if (!csrfOk(req, form)) {
    // Usually an expired page; show the form again with a fresh token.
    const error = 'Your page expired. Please try again.';
    if (url === '/register') return html(res, views.registerPage({ csrf, error, email: form.email }), 403, { 'Set-Cookie': setCookies });
    if (url === '/login') return html(res, views.loginPage({ csrf, error, email: form.email }), 403, { 'Set-Cookie': setCookies });
    return redirect(res, '/');
  }

  if (url === '/register') {
    const result = await auth.register(form.email, form.password || '');
    if (result.error) return html(res, views.registerPage({ csrf, error: result.error, email: form.email }), 400);
    const session = await auth.createSession(result.userId);
    return redirect(res, '/account?welcome=1', { 'Set-Cookie': cookie('sid', session.token, { maxAge: session.maxAge }) });
  }

  if (url === '/login') {
    const result = await auth.login(form.email, form.password || '', clientIp(req));
    if (result.error) return html(res, views.loginPage({ csrf, error: result.error, email: form.email }), 401);
    const session = await auth.createSession(result.userId);
    return redirect(res, '/account', { 'Set-Cookie': cookie('sid', session.token, { maxAge: session.maxAge }) });
  }

  if (url === '/logout') {
    await auth.destroySession(sid);
    return redirect(res, '/login?bye=1', { 'Set-Cookie': cookie('sid', '', { maxAge: 0 }) });
  }

  return redirect(res, '/');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(err => {
    console.error('Request failed:', err.message);
    if (!res.headersSent) send(res, err.message === 'DB_UNAVAILABLE' ? 503 : 500, 'text/plain; charset=utf-8', 'Something went wrong. Please try again.');
  });
});

server.listen(PORT, () => {
  console.log(`Guide app listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  db.connect();
  setInterval(() => { if (db.status().connected) auth.purgeExpired().catch(() => {}); }, 6 * 3600 * 1000).unref();
});
