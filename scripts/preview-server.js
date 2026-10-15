import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiRouter } from '../dist/server/server/router.js';
import { loadEnv } from '../dist/server/server/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const distPublic = path.join(root, 'dist', 'public');

const env = loadEnv();
const router = new ApiRouter(env);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

const port = process.env.PORT || 8888;

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://localhost:${port}`);
  const pathname = parsedUrl.pathname;

  // 1. API Route Handling
  if (pathname.startsWith('/api/') || pathname.startsWith('/.netlify/functions/api/')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const qParams = {};
      parsedUrl.searchParams.forEach((v, k) => { qParams[k] = v; });

      const apiReq = {
        httpMethod: req.method || 'GET',
        path: pathname,
        headers: req.headers,
        queryStringParameters: qParams,
        body: body || null
      };

      const apiRes = await router.handle(apiReq);
      res.writeHead(apiRes.statusCode, apiRes.headers);
      res.end(apiRes.body);
    });
    return;
  }

  // 2. Static File Serving
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(distPublic, relativePath);

  // Security: prevent path traversal
  if (!filePath.startsWith(distPublic)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback for non-API routes
  const indexPath = path.join(distPublic, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`Smart Bhumi Seba preview server running at http://localhost:${port}`);
});
