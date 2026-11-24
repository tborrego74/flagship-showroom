// Receives a free-website waitlist signup from /waitlist and stores it.
// Public on purpose (anyone can join), but it only ever writes. Signups are read back by /api/signups, which needs the admin sign-in.
import { randomBytes } from 'node:crypto';
import { putSignup, ready } from './_store.js';

const clean = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, n) : '');
const head = (req, k) => { try { return decodeURIComponent(String(req.headers[k] || '')).slice(0, 60); } catch { return ''; } };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!ready) return res.status(503).json({ error: 'The waitlist is not taking signups right now. Please try again later.' });
  let b = req.body;
  try {
    if (Buffer.isBuffer(b)) b = b.toString('utf8');
    if (typeof b === 'string') b = JSON.parse(b);
  } catch { return res.status(400).json({ error: 'Something went wrong. Please try again.' }); }
  if (!b || typeof b !== 'object' || JSON.stringify(b).length > 20000) return res.status(400).json({ error: 'Something went wrong. Please try again.' });

  // spam guard: the hidden "company_motto" field is invisible to people, and a real person takes more than a few seconds to fill the form.
  // Bots get a normal-looking success so they do not retry, but nothing is saved.
  const elapsed = Number(b.elapsed) || 0;
  if (clean(b.company_motto, 200) || (elapsed > 0 && elapsed < 2500)) return res.status(200).json({ ok: true });

  const rec = {
    id: randomBytes(16).toString('hex'),
    at: Date.now(),
    name: clean(b.name, 120),
    business: clean(b.business, 160),
    email: clean(b.email, 160).toLowerCase(),
    phone: clean(b.phone, 40),
    website: clean(b.website, 200),
    industry: clean(b.industry, 600),
    goals: clean(b.goals, 3000),
    src: clean(b.src, 60), camp: clean(b.camp, 60), ref: clean(b.ref, 80),
    country: head(req, 'x-vercel-ip-country'), region: head(req, 'x-vercel-ip-country-region'), city: head(req, 'x-vercel-ip-city'),
  };
  const missing = [];
  if (!rec.name) missing.push('your name');
  if (!rec.business) missing.push('your business name');
  if (!EMAIL.test(rec.email)) missing.push('a valid email');
  if (!rec.industry) missing.push('what your business does');
  if (!rec.goals) missing.push('what you want from a new site');
  if (missing.length) return res.status(400).json({ error: `Please add ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` });

  try {
    await putSignup(rec);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('waitlist save failed', err);
    res.status(500).json({ error: 'We could not save that just now. Please try again in a minute.' });
  }
}
