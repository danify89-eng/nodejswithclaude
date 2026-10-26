// HTML for the login, register and account pages. Same look as the guide.

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const STYLE = `
:root{--bg:#fbf8f6;--surface:#fff;--ink:#22201f;--muted:#6b6461;--line:#ece4df;--accent:#9b2c50;--accent-soft:#f7e6ec;--bad:#a12a2a;--bad-soft:#fbe9e9;--ok:#2f7a4f;--ok-soft:#e5f3ea}
@media (prefers-color-scheme: dark){:root{--bg:#161314;--surface:#201c1d;--ink:#efe9e6;--muted:#a69d99;--line:#342d2f;--accent:#f08aab;--accent-soft:#3a2129;--bad:#ff9b9b;--bad-soft:#3a1d1d;--ok:#7fd3a0;--ok-soft:#1d2e24}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;flex-direction:column}
a{color:var(--accent)}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 16px}
.card{width:100%;max-width:420px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:32px 28px}
h1{font-size:1.7rem;margin:0 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 24px}
label{display:block;font-weight:600;font-size:.95rem;margin:16px 0 6px}
input{width:100%;font:inherit;padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink)}
input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:transparent}
.hint{font-size:.85rem;color:var(--muted);margin-top:4px}
button{width:100%;margin-top:24px;font:600 1rem system-ui,sans-serif;padding:12px;border:0;border-radius:10px;background:var(--accent);color:#fff;cursor:pointer}
@media (prefers-color-scheme: dark){button{color:#1a1213}}
button.link{background:none;color:var(--accent);width:auto;margin:0;padding:0;font-weight:600;text-decoration:underline}
.msg{border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:.95rem}
.msg.bad{background:var(--bad-soft);color:var(--bad)}
.msg.ok{background:var(--ok-soft);color:var(--ok)}
.alt{text-align:center;margin:20px 0 0;color:var(--muted);font-size:.95rem}
dl{margin:0}dt{color:var(--muted);font-size:.85rem;margin-top:14px}dd{margin:2px 0 0;font-weight:600;word-break:break-all}
`;

const NAV_STYLE = `
.topnav{display:flex;justify-content:space-between;align-items:center;gap:12px;max-width:820px;margin:0 auto;padding:14px 16px;font-size:.95rem}
.topnav .brand{font-weight:700;text-decoration:none;color:inherit}
.topnav .links{display:flex;gap:16px;align-items:center}
.topnav form{margin:0}
.topnav button{background:none;border:0;padding:0;font:inherit;color:var(--accent);cursor:pointer;text-decoration:underline}
`;

function nav(user, csrf) {
  const right = '<a href="/snake">Play Snake</a>' + (user
    ? `<a href="/account">My account</a>
       <form method="post" action="/logout"><input type="hidden" name="csrf" value="${esc(csrf)}"><button type="submit">Log out</button></form>`
    : `<a href="/login">Log in</a><a href="/register">Create account</a>`);
  return `<nav class="topnav"><a class="brand" href="/">Beetroot</a><div class="links">${right}</div></nav>`;
}

function layout(title, user, csrf, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}${NAV_STYLE}</style></head>
<body>${nav(user, csrf)}<main>${body}</main></body></html>`;
}

function message(error, notice) {
  if (error) return `<div class="msg bad" role="alert">${esc(error)}</div>`;
  if (notice) return `<div class="msg ok" role="status">${esc(notice)}</div>`;
  return '';
}

function loginPage({ csrf, error, notice, email }) {
  return layout('Log in', null, csrf, `
<div class="card">
  <h1>Welcome back</h1>
  <p class="sub">Log in to your account.</p>
  ${message(error, notice)}
  <form method="post" action="/login">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" required value="${esc(email)}">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Log in</button>
  </form>
  <p class="alt">New here? <a href="/register">Create an account</a></p>
</div>`);
}

function registerPage({ csrf, error, email }) {
  return layout('Create account', null, csrf, `
<div class="card">
  <h1>Create your account</h1>
  <p class="sub">It takes less than a minute.</p>
  ${message(error)}
  <form method="post" action="/register">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" required value="${esc(email)}">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required>
    <div class="hint">At least 8 characters.</div>
    <button type="submit">Create account</button>
  </form>
  <p class="alt">Already have an account? <a href="/login">Log in</a></p>
</div>`);
}

function accountPage({ user, csrf, notice }) {
  const when = d => d ? new Date(d).toUTCString().replace(' GMT', ' UTC') : 'First time';
  return layout('My account', user, csrf, `
<div class="card">
  <h1>My account</h1>
  <p class="sub">You're logged in. Only you can see this page.</p>
  ${message(null, notice)}
  <dl>
    <dt>Email</dt><dd>${esc(user.email)}</dd>
    <dt>Member since</dt><dd>${esc(when(user.created_at))}</dd>
    <dt>Previous login</dt><dd>${esc(when(user.last_login_at))}</dd>
  </dl>
  <form method="post" action="/logout">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <button type="submit">Log out</button>
  </form>
</div>`);
}

function unavailablePage(user, csrf) {
  return layout('Temporarily unavailable', user, csrf, `
<div class="card">
  <h1>Back soon</h1>
  <p class="sub">Accounts are temporarily unavailable. Please try again in a few minutes.</p>
  <p class="alt"><a href="/">Back to the guide</a></p>
</div>`);
}

const SNAKE_STYLE = `
main{align-items:flex-start}
.game{width:100%;max-width:880px;display:grid;grid-template-columns:minmax(0,440px) minmax(0,1fr);gap:24px;align-items:start}
@media (max-width:760px){.game{grid-template-columns:1fr}}
.board{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px}
.hud{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
.hud .big{font-size:1.6rem;font-weight:700}
.hud .small{color:var(--muted);font-size:.9rem}
canvas{display:block;width:100%;aspect-ratio:1;border-radius:10px;background:var(--bg);touch-action:none}
.overlay-msg{text-align:center;margin:12px 0 0;min-height:1.6em;color:var(--muted)}
.overlay-msg.bad{color:var(--bad)}.overlay-msg.ok{color:var(--ok)}
.pad{display:grid;grid-template-columns:repeat(3,56px);grid-template-rows:repeat(2,48px);gap:8px;justify-content:center;margin-top:12px}
.pad button{margin:0;padding:0;font-size:1.2rem;border-radius:10px}
.pad .up{grid-column:2}.pad .left{grid-column:1;grid-row:2}.pad .down{grid-column:2;grid-row:2}.pad .right{grid-column:3;grid-row:2}
@media (hover:hover) and (pointer:fine){.pad{display:none}}
.side h1{font-size:1.7rem;margin:0 0 6px}
.side .sub{margin-bottom:16px}
.side .card{max-width:none;padding:20px 22px}
.side h2{font-size:1.1rem;margin:0 0 10px}
ol.scores{margin:0;padding-left:22px}
ol.scores li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line)}
ol.scores li span:last-child{font-weight:700}
.keys{color:var(--muted);font-size:.9rem;margin:16px 0 0}
kbd{font:600 .8rem ui-monospace,monospace;background:var(--accent-soft);padding:1px 6px;border-radius:5px}
`;

function snakePage({ user, csrf, best }) {
  const data = JSON.stringify({ loggedIn: !!user, csrf }).replace(/</g, '\\u003c');
  return layout('Snake', user, csrf, `
<style>${SNAKE_STYLE}</style>
<div class="game">
  <div class="board">
    <div class="hud">
      <div><div class="small">Score</div><div class="big" id="score">0</div></div>
      <div style="text-align:right"><div class="small">${user ? 'Your best' : 'Best this visit'}</div><div class="big" id="best">${esc(best)}</div></div>
    </div>
    <canvas id="c" width="400" height="400" aria-label="Snake game board"></canvas>
    <p class="overlay-msg" id="msg" role="status">Press an arrow key or tap Start to play.</p>
    <button type="button" id="start">Start</button>
    <div class="pad" aria-label="Direction buttons">
      <button type="button" class="up" data-dir="up" aria-label="Up">&#9650;</button>
      <button type="button" class="left" data-dir="left" aria-label="Left">&#9664;</button>
      <button type="button" class="down" data-dir="down" aria-label="Down">&#9660;</button>
      <button type="button" class="right" data-dir="right" aria-label="Right">&#9654;</button>
    </div>
  </div>
  <div class="side">
    <h1>Snake</h1>
    <p class="sub">Eat the apples, grow longer, and don't hit the walls or yourself.</p>
    <div class="card">
      <h2>Top 10</h2>
      <ol class="scores" id="board"><li><span>Loading…</span><span></span></li></ol>
      ${user ? '' : '<p class="alt"><a href="/login">Log in</a> or <a href="/register">create an account</a> to save your scores.</p>'}
    </div>
    <p class="keys">Move: <kbd>&larr;</kbd> <kbd>&uarr;</kbd> <kbd>&rarr;</kbd> <kbd>&darr;</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · Pause: <kbd>Space</kbd> · On phones: swipe or use the buttons.</p>
  </div>
</div>
<script>window.SNAKE = ${data};</script>
<script src="/snake.js" defer></script>`);
}

module.exports = { loginPage, registerPage, accountPage, unavailablePage, snakePage, nav, NAV_STYLE };
