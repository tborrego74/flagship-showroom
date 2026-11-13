// usage: node tools/multi.mjs <url-path> <out-prefix> <width> <height> <selector|y>[+offset] ...
import { chromium } from 'playwright';
const [, , path, out, w, h, ...ys] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
p.on('requestfailed', (r) => console.log('[failed]', r.url()));
await p.goto('http://localhost:4173/' + path); await p.waitForTimeout(2500);
let i = 0;
for (const t of ys) {
  const [sel, off = '0'] = t.split('+');
  await p.evaluate(([sel, off]) => scrollTo(0, (isNaN(+sel) ? document.querySelector(sel).getBoundingClientRect().top + scrollY : +sel) + +off), [sel, off]);
  await p.waitForTimeout(2200); await p.screenshot({ path: `${out}-${i++}.jpg`, quality: 80 });
}
await b.close();
