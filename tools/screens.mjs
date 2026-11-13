// Captures the laptop + phone screen textures for the showroom from the live demos.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const jobs = [];
for (const id of ['luxury', 'courier', 'plumbing']) {
  for (const [suffix, w, h, scale] of [['', 1440, 900, 1], ['-m', 390, 844, 2]]) {
    jobs.push((async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
      const page = await ctx.newPage();
      await page.addInitScript(() => { Object.defineProperty(window, 'parent', { get: () => ({ postMessage() {} }) }); });
      await page.goto(`http://localhost:4173/demos/${id}/?embed=1`, { waitUntil: 'load' });
      await page.waitForTimeout(9000);
      await page.screenshot({ path: `site/assets/screens/${id}${suffix}.jpg`, type: 'jpeg', quality: 88 });
      await ctx.close();
    })());
  }
}
await Promise.all(jobs);
await browser.close();
