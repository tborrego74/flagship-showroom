// Storage for visit records. On Vercel this is a Blob store (one small JSON file per visit).
// Locally, with no Blob token, it falls back to the .data folder so the admin page can be tested.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const token = process.env.BLOB_READ_WRITE_TOKEN;
const local = !token && !process.env.VERCEL;
const dir = path.join(process.cwd(), '.data');
export const ready = !!token || local;

export async function putVisit(day, id, data) {
  const body = JSON.stringify(data);
  if (local) { await fs.mkdir(path.join(dir, day), { recursive: true }); await fs.writeFile(path.join(dir, day, id + '.json'), body); return; }
  const { put } = await import('@vercel/blob');
  await put(`visits/${day}/${id}.json`, body, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60, token });
}

// every visit from `sinceDay` (YYYY-MM-DD) onwards, newest first, capped
export async function listVisits(sinceDay, cap = 1500) {
  const out = [];
  if (local) {
    let days = []; try { days = await fs.readdir(dir); } catch {}
    for (const d of days.filter((d) => d >= sinceDay).sort().reverse())
      for (const f of await fs.readdir(path.join(dir, d))) { if (out.length < cap) out.push(JSON.parse(await fs.readFile(path.join(dir, d, f), 'utf8'))); }
    return out;
  }
  const { list } = await import('@vercel/blob');
  let cursor, blobs = [];
  do {
    const r = await list({ prefix: 'visits/', limit: 1000, cursor, token });
    blobs.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor && blobs.length < 20000);
  blobs = blobs.filter((b) => b.pathname.slice(7, 17) >= sinceDay).sort((a, b) => (a.pathname < b.pathname ? 1 : -1)).slice(0, cap);
  for (let i = 0; i < blobs.length; i += 25) {
    const part = await Promise.all(blobs.slice(i, i + 25).map((b) => fetch(b.url + '?v=' + new Date(b.uploadedAt).getTime()).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    out.push(...part.filter(Boolean));
  }
  return out;
}
