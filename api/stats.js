// Returns the last 30 days of visit records to the admin page. Needs a Google sign-in from an allowed address.
import { listVisits, ready } from './_store.js';
import { signedIn, configured } from './_auth.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (!configured) return res.status(503).json({ error: 'Google sign-in has not been set up yet.' });
  const email = await signedIn(req);
  if (!email) return res.status(401).json({ error: 'That Google account is not allowed to view this page.' });
  if (!ready) return res.status(503).json({ error: 'Visit storage has not been set up yet.' });
  try {
    const since = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10);
    res.status(200).json({ now: Date.now(), email, visits: await listVisits(since) });
  } catch (err) {
    console.error('stats failed', err);
    res.status(500).json({ error: 'Could not read the visit records.' });
  }
}
