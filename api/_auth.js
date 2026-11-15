// Google sign-in check for the admin page. The page sends the Google ID token;
// we verify Google's signature, that it was issued for our client ID, and that
// the signed-in address is on the allowed list (ADMIN_EMAILS, comma separated).
import { createPublicKey, verify } from 'node:crypto';

export const clientId = process.env.GOOGLE_CLIENT_ID || '';
const allowed = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
export const local = !process.env.VERCEL;          // local testing skips sign-in
export const configured = local || (!!clientId && allowed.length > 0);

let keys = null, keysAt = 0;
async function googleKeys() {
  if (!keys || Date.now() - keysAt > 36e5) {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!r.ok) throw new Error('could not load Google keys');
    keys = (await r.json()).keys; keysAt = Date.now();
  }
  return keys;
}
const b64 = (s) => Buffer.from(s, 'base64url');

// returns the signed-in email when the token is valid and allowed, otherwise null
export async function signedIn(req) {
  if (local) return 'local';
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64(parts[0])), claims = JSON.parse(b64(parts[1]));
    if (header.alg !== 'RS256') return null;
    const jwk = (await googleKeys()).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const ok = verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), createPublicKey({ key: jwk, format: 'jwk' }), b64(parts[2]));
    if (!ok) return null;
    if (claims.aud !== clientId) return null;
    if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') return null;
    if (!(claims.exp * 1000 > Date.now())) return null;
    const email = String(claims.email || '').toLowerCase();
    if (claims.email_verified !== true || !allowed.includes(email)) return null;
    return email;
  } catch { return null; }
}
