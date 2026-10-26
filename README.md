# nodejswithclaude

A beginner guide — "Build a website with Claude Code + WebPros MCP" — served by a small Node.js app, with email/password accounts stored in MySQL.

- `app.js` — the server and routes
- `lib/db.js` — MySQL connection and table setup (tables are created automatically)
- `lib/auth.js` — accounts, sessions, login rate limiting
- `lib/views.js` — login, register and account pages
- `public/index.html` — the guide page

## Pages

| URL | What it does |
| --- | --- |
| `/` | The guide |
| `/register` | Create an account |
| `/login` | Log in |
| `/account` | Members-only page (must be logged in) |
| `POST /logout` | Log out |
| `/api/status` | JSON health check (status, Node version, database) |

## Security

- Passwords are hashed with bcrypt — never stored as plain text.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production; only a SHA-256 hash of the session token is stored.
- Forms are protected against cross-site requests with a CSRF token.
- Failed logins are limited to 10 per 15 minutes per IP and per email.

## Environment variables

| Name | Example | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | |
| `DB_NAME` | `beetroot_app` | |
| `DB_USER` | `beetroot_appuser` | |
| `DB_PASSWORD` | — | Keep it out of Git (`.env` is ignored) |
| `DB_HOST` | `host.containers.internal` | Optional; comma-separated hosts are tried in order |
| `DB_PORT` | `3306` | Optional |

## Run locally

```
npm install
DB_NAME=... DB_USER=... DB_PASSWORD=... DB_HOST=127.0.0.1 node app.js
```

Then open http://localhost:3000
