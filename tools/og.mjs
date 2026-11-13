// Renders the share images (1200x630) for the showroom and each demo.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const shot = async (url, out, ready) => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { if (location.pathname.includes('/demos/')) Object.defineProperty(window, 'parent', { get: () => ({ postMessage() {} }) }); });
  await page.goto('http://localhost:4173/' + url, { waitUntil: 'load' });
  if (ready) await page.waitForFunction(ready, null, { timeout: 180000 });
  await page.waitForTimeout(12000);
  await page.screenshot({ path: out, type: 'png' });
  await ctx.close();
};
await Promise.all([
  shot('?skip&og', 'assets/og/_showroom.png', () => window.__showroom && window.__showroom.mode === 'desk'),
  shot('demos/luxury/', 'assets/og/_luxury.png'),
  shot('demos/courier/', 'assets/og/_courier.png'),
  shot('demos/plumbing/', 'assets/og/_plumbing.png'),
]);
await browser.close();
