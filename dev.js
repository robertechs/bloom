// the site on this machine: the static files, plus api/eye.js answering at /api/eye.
// frames sent to it are kept in memory only.
//
//   EYE_KEY=anything npm run dev     then open http://127.0.0.1:47615

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as eye from './api/eye.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 47615;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2',
};

async function api(req, res) {
  const handler = eye[req.method];
  if (!handler) { res.writeHead(405).end(); return; }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const answer = await handler(new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
  }));
  res.writeHead(answer.status, Object.fromEntries(answer.headers));
  res.end(Buffer.from(await answer.arrayBuffer()));
}

async function file(req, res) {
  let name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (name.endsWith('/')) name += 'index.html';
  const full = path.join(root, path.normalize(name));
  const info = full.startsWith(root + path.sep) ? await stat(full).catch(() => null) : null;
  if (!info?.isFile()) { res.writeHead(404).end('not found'); return; }
  const head = { 'content-type': TYPES[path.extname(full)] ?? 'application/octet-stream', 'accept-ranges': 'bytes' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range && (range[1] || range[2])) { // video seeks ask for a part of the file
    const start = range[1] ? Number(range[1]) : info.size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    res.writeHead(206, { ...head, 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 });
    createReadStream(full, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...head, 'content-length': info.size });
    createReadStream(full).pipe(res);
  }
}

http.createServer((req, res) => {
  const work = req.url.split('?')[0] === '/api/eye' ? api(req, res) : file(req, res);
  work.catch((e) => { console.error(e); if (!res.headersSent) res.writeHead(500); res.end(); });
}).listen(port, '127.0.0.1', () => console.log(`bloom on http://127.0.0.1:${port}`));
