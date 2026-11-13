import { initKit, loop, pin, through, clamp, lerp, smooth, damp, splitWords } from '../shared/kit.js';
import { createSea } from './sea.js';

initKit();
const sea = createSea(document.getElementById('sea'));
const $ = (s) => document.querySelector(s);
const hero = $('.hero'), heroIn = $('.hero-in'), day = $('.day'), veil = $('.veil');
const chapters = [...document.querySelectorAll('.chapter')];
const clock = $('#clock'), rail = $('#rail');
const manifesto = $('#manifesto'), words = manifesto ? splitWords(manifesto) : [];
const suites = $('.suites'), track = $('#track'), tableArt = $('#tableArt img');
const dayPh = [...document.querySelectorAll('.day-ph')];
const arrival = $('.arrival'), arrivalPh = $('#arrivalPh'), arrivalCopy = $('#arrivalCopy');
const cove = $('.cove'), coveImg = $('#covePh img');
const mosaic = [...document.querySelectorAll('.mo')];
const nav = $('.nav'), darkZones = [...document.querySelectorAll('[data-nav=dark]')];
const pageDay = document.body.dataset.day;   // sub-pages fix the time of day

const TIMES = [370, 790, 1180, 1395];        // 06:10, 13:10, 19:40, 23:15
let mx = 0, my = 0, dayS = pageDay ? +pageDay : 2;
addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

let lastY = scrollY;
loop(({ y, sy, t, dt, vh, vw }) => {
  if (Math.abs(y - lastY) > 4) { nav.classList.toggle('hide', y > lastY && y > 200); lastY = y; }
  let dayV = pageDay ? +pageDay : 2, veilV = 0, horizon = 0.44;

  if (hero) {
    const q = clamp(sy / vh);
    heroIn.style.transform = `translate3d(0,${(-sy * 0.32).toFixed(1)}px,0) scale(${1 + q * 0.06})`;
    heroIn.style.opacity = clamp(1 - q * 1.7);
    heroIn.style.filter = q > 0.01 ? `blur(${(q * 10).toFixed(1)}px)` : 'none';
    horizon = 0.44 + q * 0.1;
    veilV = smooth(0.5, 0.97, q);
    if (day) {
      const p = pin(day);
      veilV *= 1 - smooth(0, 0.06, p);
      if (q > 0.985) {
        const d = smooth(0.17, 0.31, p) + smooth(0.42, 0.56, p) + smooth(0.67, 0.81, p);
        dayV = d; horizon = lerp(0.54, 0.4, smooth(0, 0.1, p));
        // chapters
        chapters.forEach((c, i) => {
          const a = i * 0.25, b = a + 0.25;
          const inn = i === 0 ? smooth(0, 0.03, p) : smooth(a - 0.015, a + 0.045, p);
          const out = i === 3 ? 1 : 1 - smooth(b - 0.06, b - 0.01, p);
          const o = inn * out;
          c.style.opacity = o;
          c.style.transform = `translate3d(0,${((1 - inn) * 40 - (1 - out) * 40).toFixed(1)}px,0)`;
          c.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
          const ph = dayPh[i];
          if (ph) {
            const k = clamp((p - a) / 0.25);
            ph.style.opacity = o;
            ph.style.transform = `translate3d(0,${((1 - inn) * 70 - (1 - out) * 50).toFixed(1)}px,0)`;
            ph.firstElementChild.style.transform = `scale(${(1.22 - k * 0.18).toFixed(4)})`;
          }
        });
        const i = Math.min(2, Math.floor(d)), f = d - i;
        const mins = Math.round(lerp(TIMES[i], TIMES[i + 1], f));
        clock.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
        rail.style.transform = `scaleX(${p.toFixed(4)})`;
      }
    }
  }
  // snap the sky instantly while it is hidden behind the veil, glide otherwise
  dayS = veilV > 0.9 ? dayV : damp(dayS, dayV, 6, dt);

  if (arrival) {
    const p = pin(arrival), e = smooth(0, 0.62, p);
    const ix = lerp(vw > 820 ? 30 : 14, 0, e), iy = lerp(16, 0, e), r = lerp(vw > 820 ? 340 : 200, 0, e);
    arrivalPh.style.clipPath = `inset(${iy.toFixed(2)}% ${ix.toFixed(2)}% round ${r.toFixed(0)}px ${r.toFixed(0)}px ${(r * 0.03).toFixed(0)}px ${(r * 0.03).toFixed(0)}px)`;
    arrivalPh.firstElementChild.style.transform = `scale(${(1.3 - p * 0.24).toFixed(4)})`;
    const c = smooth(0.55, 0.8, p);
    arrivalCopy.style.opacity = c;
    arrivalCopy.style.transform = `translate3d(0,${((1 - c) * 40).toFixed(1)}px,0)`;
  }
  if (cove) coveImg.style.transform = `scale(${(1.04 + through(cove) * 0.2).toFixed(4)})`;
  mosaic.forEach((m) => { m.style.transform = `translate3d(0,${((through(m) - 0.5) * +m.dataset.par).toFixed(1)}px,0)`; });
  if (words.length) {
    const r = manifesto.getBoundingClientRect();
    const k = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.36));
    const n = Math.floor(k * (words.length + 1));
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }
  if (suites) {
    const p = pin(suites);
    const max = Math.max(0, track.scrollWidth - innerWidth);
    track.style.transform = `translate3d(${(-p * max).toFixed(1)}px,0,0)`;
  }
  if (tableArt) tableArt.style.transform = `translate3d(0,${((through(tableArt.parentElement) - 0.5) * -90).toFixed(1)}px,0)`;

  nav.classList.toggle('dark', darkZones.some((z) => { const r = z.getBoundingClientRect(); return r.top < 46 && r.bottom > 46; }));
  veil.style.setProperty('--veil', veilV.toFixed(3));
  if (sea) {
    sea.state.day = dayS; sea.state.horizon = horizon;
    sea.state.mx = damp(sea.state.mx, mx, 3, dt); sea.state.my = my;
    sea.render(t);
  }
});
