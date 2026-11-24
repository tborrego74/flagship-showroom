// Returns every waitlist signup to the admin page. Needs a Google sign-in from an allowed address.
import { listSignups, ready } from './_store.js';
import { signedIn, configured } from './_auth.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (!configured) return res.status(503).json({ error: 'Google sign-in has not been set up yet.' });
  const email = await signedIn(req);
  if (!email) return res.status(401).json({ error: 'That Google account is not allowed to view this page.' });
  if (!ready) return res.status(503).json({ error: 'Storage has not been set up yet.' });
  try {
    res.status(200).json({ signups: await listSignups() });
  } catch (err) {
    console.error('signups failed', err);
    res.status(500).json({ error: 'Could not read the waitlist.' });
  }
}
