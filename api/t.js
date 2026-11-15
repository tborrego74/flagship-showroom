// Receives one visit record from js/track.js and stores it.
import { putVisit, ready } from './_store.js';

const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, n) : '');
const num = (v, max) => (Number.isFinite(+v) ? Math.max(0, Math.min(max, Math.round(+v))) : 0);
const head = (req, k) => { try { return decodeURIComponent(String(req.headers[k] || '')).slice(0, 60); } catch { return ''; } };

function device(ua) {
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  return { os, br };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!ready) return res.status(503).end();
  try {
    let b = req.body;
    if (typeof b === 'string') b = JSON.parse(b);
    if (Buffer.isBuffer(b)) b = JSON.parse(b.toString('utf8'));
    if (!b || !/^[a-f0-9-]{36}$/.test(b.id || '') || JSON.stringify(b).length > 16000) return res.status(400).end();
    const ua = String(req.headers['user-agent'] || '');
    if (/bot|crawl|spider|preview|headless|lighthouse/i.test(ua)) return res.status(204).end();
    const now = Date.now();
    const t0 = Math.abs(now - +b.t0) < 864e5 ? +b.t0 : now;
    const rec = {
      id: b.id, vid: /^[a-f0-9-]{36}$/.test(b.vid || '') ? b.vid : '', back: !!b.back, t0,
      dur: num(((+b.now || now) - (+b.t0 || now)) / 1000, 86400),
      ref: str(b.ref, 60), src: str(b.src, 40), camp: str(b.camp, 40), land: str(b.land, 80),
      w: num(b.w, 10000), h: num(b.h, 10000), touch: !!b.touch, tz: str(b.tz, 40),
      ...device(ua),
      country: head(req, 'x-vercel-ip-country'), region: head(req, 'x-vercel-ip-country-region'), city: head(req, 'x-vercel-ip-city'),
      ev: (Array.isArray(b.ev) ? b.ev : []).slice(0, 150).filter((e) => Array.isArray(e)).map((e) => [num(e[0], 86400), str(e[1], 16), str(e[2], 60)]),
    };
    await putVisit(new Date(t0).toISOString().slice(0, 10), rec.id, rec);
    res.status(204).end();
  } catch (err) {
    console.error('track failed', err);
    res.status(500).end();
  }
}
