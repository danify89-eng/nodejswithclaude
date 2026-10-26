# nodejswithclaude

A beginner guide — "Build a website with Claude Code + WebPros MCP" — served by a tiny Node.js app.

- `app.js` — the server (built-in Node modules only, no `npm install` needed)
- `public/index.html` — the guide page
- `GET /api/status` — JSON health check (status, Node version, uptime)

## Run locally

```
node app.js
```

Then open http://localhost:3000

## On cPanel (Application Manager)

- Application root: the folder this repo is cloned into
- Startup file: `app.js`
- Environment variables: `NODE_ENV=production`, `BASE_URI=/nodejswithclaude` (the app's URL path)
