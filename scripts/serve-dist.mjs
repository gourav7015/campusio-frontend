// Serves dist/ the way production does: with the headers from dist/_headers, a fallback to index.html, and (optionally) /api forwarded to the API.
// Used to check the site works under its real Content-Security-Policy:  PORT=5190 API_PROXY=http://localhost:4010 node scripts/serve-dist.mjs
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 5190);
const proxy = process.env.API_PROXY ? new URL(process.env.API_PROXY) : null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
// _headers: a path pattern line, then indented "Name: value" lines
const rules = []; let cur = null;
for (const line of readFileSync(join(root, '_headers'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  if (!line.startsWith(' ')) { cur = { pattern: line.trim(), headers: [] }; rules.push(cur); } else { const i = line.indexOf(':'); cur.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
}
const matches = (pattern, path) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern);

http.createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  if (proxy && (path.startsWith('/api/') || path === '/health')) {
    const up = http.request({ host: proxy.hostname, port: proxy.port, path: req.url, method: req.method, headers: { ...req.headers, host: proxy.host } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on('error', () => { res.writeHead(502); res.end('API unreachable'); });
    return req.pipe(up);
  }
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  const isAsset = existsSync(file) && statSync(file).isFile();
  if (!isAsset) file = join(root, 'index.html'); // single-page app: any other address is the app
  for (const r of rules) if (matches(r.pattern, isAsset ? path : '/index.html')) for (const [k, v] of r.headers) res.setHeader(k, v);
  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
