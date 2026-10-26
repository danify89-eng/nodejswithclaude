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
  const right = user
    ? `<a href="/account">My account</a>
       <form method="post" action="/logout"><input type="hidden" name="csrf" value="${esc(csrf)}"><button type="submit">Log out</button></form>`
    : `<a href="/login">Log in</a><a href="/register">Create account</a>`;
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

module.exports = { loginPage, registerPage, accountPage, unavailablePage, nav, NAV_STYLE };
