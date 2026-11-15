// Tells the admin page which Google client ID to use (not a secret).
import { clientId, local, configured } from './_auth.js';
export default function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({ clientId, local, configured });
}
