import { initKit, loop, pin, damp, smooth } from '../shared/kit.js';
import { createPipes } from './pipes.js';

initKit();
const $ = (s) => document.querySelector(s);
const pipes = createPipes($('#pipes'));
const nav = $('.nav'), visit = $('.visit');
const cards = [...document.querySelectorAll('#steps article')];

// price estimator
const chips = $('#chips');
if (chips) {
  const jobs = [['Leaky faucet', 185, 340, 'Most are done in under 2 hours.'], ['Clogged drain', 160, 420, 'Usually cleared in a single visit.'], ['Water heater', 1450, 2900, 'Installed and hauled away in one day.'],
    ['Running toilet', 140, 290, 'Typically a 45-minute fix.'], ['Burst pipe', 380, 1150, 'We stop the water first, then talk price.'], ['Whole-home repipe', 6800, 14500, 'Three to five days, walls patched.']];
  const lo = $('#lo'), hi = $('#hi'), note = $('#estNote');
  const cur = { lo: 185, hi: 340 }; let raf;
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const pick = (i) => {
    [...chips.children].forEach((c, k) => c.classList.toggle('on', k === i));
    const [, a, b, n] = jobs[i]; note.textContent = n;
    const from = { ...cur }, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - k, 3);
      cur.lo = from.lo + (a - from.lo) * e; cur.hi = from.hi + (b - from.hi) * e;
      lo.textContent = money(cur.lo); hi.textContent = money(cur.hi);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  jobs.forEach(([name], i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.addEventListener('click', () => pick(i)); chips.appendChild(b); });
  chips.children[0].classList.add('on');
}

let mx = 0, my = 0;
addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
loop(({ y, sy, t, dt }) => {
  nav.classList.toggle('stuck', y > 60);
  let grow = 0;
  if (visit) {
    grow = smooth(0.04, 0.92, pin(visit));
    const st = pipes ? pipes.stations : [];
    cards.forEach((c, i) => c.classList.toggle('on', st[i] ? grow >= st[i].f : grow > (i + 0.5) / 4.6));
  }
  if (pipes) {
    const s = pipes.state;
    s.grow = grow; s.scroll = sy; s.mx = damp(s.mx, mx, 3, dt); s.my = damp(s.my, my, 3, dt);
    pipes.update(t, dt);
  }
});
