// Guide: build a website with Claude Code + WebPros MCP, served by Node.js.
// No npm dependencies — only Node's built-in modules — so it runs on cPanel
// Application Manager (Passenger) without an install step.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
// Sub-path the app is mounted at in cPanel (e.g. "/nodejswithclaude"). Passenger
// may pass requests with or without it, so we strip it when present.
const BASE_URI = (process.env.BASE_URI || '').replace(/\/+$/, '');
const startedAt = new Date();

const pagePath = path.join(__dirname, 'public', 'index.html');
const page = fs.readFileSync(pagePath);

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let url = new URL(req.url, 'http://localhost').pathname;

  // "/nodejswithclaude" -> "/nodejswithclaude/" so relative links resolve.
  if (BASE_URI && url === BASE_URI) {
    res.writeHead(301, { Location: BASE_URI + '/' });
    return res.end();
  }
  if (BASE_URI && url.startsWith(BASE_URI + '/')) {
    url = url.slice(BASE_URI.length);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed');
  }

  if (url === '/' || url === '/index.html') {
    return send(res, 200, 'text/html; charset=utf-8', page);
  }

  if (url === '/api/status') {
    return send(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      status: 'running',
      node: process.version,
      env: process.env.NODE_ENV || 'development',
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime())
    }));
  }

  send(res, 404, 'text/plain; charset=utf-8', 'Page not found');
});

server.listen(PORT, () => {
  console.log(`Guide app listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});
