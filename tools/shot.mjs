// usage: node tools/shot.mjs <url-path> <out.png> [width] [height] [waitMs] [scrollY] [evalJs]
import { chromium } from 'playwright';
const [, , path = '', out = 'out.png', w = '1440', h = '900', wait = '5000', scroll = '0', js = ''] = process.argv;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 600)));
page.on('requestfailed', (r) => console.log('[failed]', r.url().slice(0, 120)));
await page.goto('http://localhost:4173/' + path, { waitUntil: 'load' });
await page.waitForTimeout(+wait);
if (+scroll) { await page.evaluate((y) => window.scrollTo(0, y), +scroll); await page.waitForTimeout(1600); }
if (js) { await page.evaluate(js); await page.waitForTimeout(3500); }
await page.screenshot({ path: out });
await browser.close();
