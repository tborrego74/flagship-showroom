// Small scroll + motion kit shared by the three demo sites.
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
export const embedded = window.parent !== window;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// progress (0..1) of a tall section with a sticky child: 0 when it pins, 1 when it releases
export function pin(el) {
  const r = el.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - innerHeight));
}
// progress of any element through the viewport: 0 entering from below, 1 leaving at top
export function through(el) {
  const r = el.getBoundingClientRect();
  return clamp((innerHeight - r.top) / (innerHeight + r.height));
}
export function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  return words.map((w) => {
    const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
    el.append(s, ' '); return s;
  });
}
export function splitChars(el) {
  const text = el.textContent; el.textContent = ''; el.setAttribute('aria-label', text);
  let i = 0;
  for (const word of text.split(' ')) {
    const w = document.createElement('span'); w.className = 'word'; w.setAttribute('aria-hidden', 'true');
    for (const ch of word) { const c = document.createElement('span'); c.className = 'ch'; c.style.setProperty('--i', i++); c.textContent = ch; w.append(c); }
    el.append(w, ' ');
  }
}
export function countUp(el) {
  const to = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
  const t0 = performance.now(), dur = 1600;
  const step = (now) => {
    const k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = (to * e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function initKit() {
  document.documentElement.classList.toggle('embedded', embedded);
  // reveal on enter
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) {
      e.target.classList.add('in');
      if (e.target.dataset.count) countUp(e.target);
      io.unobserve(e.target);
    }
  }, { threshold: 0.18 });
  document.querySelectorAll('[data-reveal],[data-count]').forEach((el) => io.observe(el));
  document.querySelectorAll('[data-chars]').forEach(splitChars);
  requestAnimationFrame(() => document.documentElement.classList.add('loaded'));
  // Esc returns to the showroom when embedded
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && embedded) parent.postMessage({ type: 'showroom-exit' }, '*'); });
  // demo forms never submit
  document.querySelectorAll('form[data-demo]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = f.querySelector('.demo-note'); if (note) note.classList.add('show');
  }));
  if (!embedded) {
    const a = document.createElement('a');
    a.href = '../../'; a.className = 'kit-back'; a.textContent = '← Back to the showroom';
    document.body.appendChild(a);
  }
}

// one rAF loop: gives raw + smoothed scroll, time, dt
export function loop(cb) {
  let sy = scrollY, last = performance.now(), t = 0;
  const frame = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; t += dt;
    sy = reduced ? scrollY : damp(sy, scrollY, 9, dt);
    cb({ y: scrollY, sy, t, dt, vh: innerHeight, vw: innerWidth });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
