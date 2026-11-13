import { initKit, loop, pin, clamp, lerp, smooth } from '../shared/kit.js';
import { createCity } from './city.js';

initKit();
const $ = (s) => document.querySelector(s);
const city = createCity($('#city'));

const nav = $('.nav'), heroCopy = $('.hero-copy'), story = $('.story');
const steps = [...document.querySelectorAll('.step')];
const lis = [...document.querySelectorAll('#stepper li')];
const elapsed = $('#elapsed'), bar = $('#bar'), tagPick = $('#tagPick'), tagDrop = $('#tagDrop');
const trackMode = document.body.dataset.track;

// hero ticker
const ticker = $('#ticker');
if (ticker) {
  const items = [['R9-20417', 'Delivered', '47 min'], ['R9-20418', 'En route', 'ETA 12 min'], ['R9-20419', 'Picked up', 'Northgate Labs'], ['R9-20420', 'Delivered', '38 min'],
    ['R9-20421', 'Driver assigned', '0.6 mi away'], ['R9-20422', 'Delivered', '52 min'], ['R9-20423', 'En route', 'ETA 4 min'], ['R9-20424', 'Delivered', '41 min']];
  const html = items.map(([a, b, c]) => `<span><u>${a}</u> · <b>${b}</b> · ${c}</span>`).join('');
  ticker.innerHTML = html + html;
}
// card hover: spotlight + tilt
document.querySelectorAll('.card').forEach((c) => {
  c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', `${x * 100}%`); c.style.setProperty('--my', `${y * 100}%`);
    c.style.transform = `rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateZ(6px)`;
  });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});
// live dispatch board
const rows = $('#rows');
if (rows) {
  const places = ['Northgate Labs → St. Aldric', 'Harlow & Finch LLP → County Court', 'Apex Auto Parts → Bay 4 Garage', 'Lumen Pharmacy → Cedar Clinic', 'Print House → Meridian Tower', 'Vault Dental → Summit Lab', 'Kiln Bakery → Hotel Orrin'];
  const status = [['a', 'Assigned'], ['b', 'En route'], ['b', 'En route'], ['c', 'Delivered']];
  let id = 20431;
  const data = places.map((p, i) => ({ id: id - i, p, s: (i * 3) % 4, eta: 4 + ((i * 7) % 19) }));
  const draw = (flash) => {
    rows.innerHTML = data.map((d, i) => `<div class="trow${i === flash ? ' flash' : ''}"><span>R9-${d.id}</span><span>${d.p}</span><span class="st ${status[d.s][0]}">${status[d.s][1]}</span><span>${d.s === 3 ? 'Done' : d.eta + ' min'}</span></div>`).join('');
    if (flash >= 0) requestAnimationFrame(() => requestAnimationFrame(() => rows.children[flash] && rows.children[flash].classList.remove('flash')));
  };
  draw(-1);
  let n = 0;
  setInterval(() => {
    const i = (n++ * 3) % data.length, d = data[i];
    if (d.s === 3) { data.splice(i, 1); data.unshift({ id: ++id, p: d.p, s: 0, eta: 9 + (n % 14) }); draw(0); return; }
    d.s++; d.eta = Math.max(1, d.eta - 3); draw(i);
  }, 1700);
}

const fmt = (m) => `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`;
function setOrder(p, u) {
  // minutes since the order was placed, tied to the story beats
  const mins = p < 0.2 ? lerp(0, 2, p / 0.2) : p < 0.44 ? lerp(2, 9, (p - 0.2) / 0.24) : lerp(9, 47, smooth(0.44, 0.86, p));
  elapsed.textContent = fmt(mins);
  bar.style.transform = `scaleX(${clamp(mins / 47).toFixed(4)})`;
  const stage = p < 0.2 ? 0 : p < 0.44 ? 1 : p < 0.86 ? 2 : 3;
  lis.forEach((li, i) => li.classList.toggle('on', i <= stage));
  return stage;
}
function place(el, which, show) {
  const s = city.project(which);
  el.style.opacity = show && s.front ? 1 : 0;
  el.style.transform = `translate(-50%,-100%) translate(${s.x.toFixed(1)}px,${(s.y - 8).toFixed(1)}px)`;
}

let lastY = scrollY;
loop(({ y, sy, t, dt, vh }) => {
  if (Math.abs(y - lastY) > 4) { nav.classList.toggle('hide', y > lastY && y > 300); lastY = y; }
  nav.classList.toggle('stuck', y > 40);
  if (trackMode) {
    // tracking page: the delivery replays on a loop
    const p = (t * 0.045) % 1.15;
    const pp = clamp(p);
    const u = lerp(0, city ? city.PICK : 0.2, smooth(0.1, 0.36, pp)) + (1 - (city ? city.PICK : 0.2)) * smooth(0.44, 0.9, pp);
    setOrder(pp, u);
    if (city) { city.state.mix = 1; city.state.u = u; city.state.p = pp; city.update(t, dt); }
    return;
  }
  const q = clamp(sy / vh);
  heroCopy.style.transform = `translate3d(0,${(-sy * 0.22).toFixed(1)}px,0)`;
  heroCopy.style.opacity = clamp(1 - q * 1.6);
  const r = story.getBoundingClientRect();
  const p = pin(story);
  const mix = smooth(vh * 0.9, 0, r.top) + smooth(0, -vh * 0.8, r.bottom - vh);
  const PICK = city ? city.PICK : 0.2;
  const u = lerp(0, PICK, smooth(0.1, 0.36, p)) + (1 - PICK) * smooth(0.44, 0.9, p);
  steps.forEach((s, i) => {
    const a = i * 0.25, b = a + 0.25;
    const inn = i === 0 ? smooth(-0.06, 0.0, p + (r.top > 0 ? -1 : 0)) : smooth(a - 0.02, a + 0.04, p);
    const out = i === 3 ? 1 - smooth(0, -vh * 0.5, r.bottom - vh) : 1 - smooth(b - 0.07, b - 0.02, p);
    const o = inn * out;
    s.style.opacity = o; s.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    s.style.transform = `translate3d(0,${((1 - inn) * 46 - (1 - out) * 46).toFixed(1)}px,0)`;
  });
  setOrder(p, u);
  if (city) {
    city.state.mix = mix; city.state.u = u; city.state.p = p;
    city.update(t, dt);
    const inStory = r.top <= 0 && r.bottom >= vh;
    place(tagPick, 'pick', inStory && p > 0.02 && p < 0.62);
    place(tagDrop, 'drop', inStory && p > 0.5);
  }
});
