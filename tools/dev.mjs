// Local server: static files plus the /api functions, so the admin page can be tested without Vercel.
// usage: node tools/dev.mjs [port]
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
const root = process.cwd(), port = +process.argv[2] || 4173;
const types = { html: 'text/html; charset=utf-8', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', txt: 'text/plain' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      const mod = await import(path.join(root, url.pathname + '.js'));
      const chunks = []; for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString('utf8');
      try { req.body = raw ? JSON.parse(raw) : undefined; } catch { req.body = raw; }
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
      return await mod.default(req, res);
    }
    let p = path.join(root, decodeURIComponent(url.pathname));
    if ((await fs.stat(p)).isDirectory()) p = path.join(p, 'index.html');
    res.setHeader('content-type', types[p.split('.').pop()] || 'application/octet-stream');
    res.end(await fs.readFile(p));
  } catch (e) { res.statusCode = e.code === 'ENOENT' ? 404 : 500; res.end(String(e.message)); }
}).listen(port, () => console.log('http://localhost:' + port));
