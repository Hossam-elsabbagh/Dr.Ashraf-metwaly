const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleTasks } = require('./supabaseProxy.cjs');

const PORT = Number(process.env.PORT || 8081);
const DIST = path.resolve(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendFile(filePath, res) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/tasks')) {
    await handleTasks(req, res);
    return;
  }

  if (req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const requestUrl = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/index.html';

  const candidate = path.resolve(DIST, `.${pathname}`);
  if (!candidate.startsWith(DIST)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    sendFile(candidate, res);
    return;
  }

  // SPA fallback.
  sendFile(path.join(DIST, 'index.html'), res);
});

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[planner-web] dist/index.html not found. Run: npm run build:web');
  process.exit(1);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[planner-web] Ready: http://localhost:${PORT}`);
  console.log('[planner-web] Supabase is accessed server-side through /api/tasks.');
});
