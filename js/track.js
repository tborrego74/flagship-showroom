// Anonymous visit tracking for the showroom and its demo sites.
// No cookies, no names, no IP addresses stored. Results show on /admin/.
(() => {
  const KEY = 'bbs_s', q = new URLSearchParams(location.search);
  let ls = null;
  try { ls = localStorage; if (q.has('notrack')) ls.setItem('bbs_owner', '1'); if (ls.getItem('bbs_owner')) return; sessionStorage.getItem(KEY); } catch { return; }
  if (navigator.webdriver || q.has('og') || /bot|crawl|spider|preview|headless|lighthouse|pingdom|monitor/i.test(navigator.userAgent)) return;
  if (location.pathname.startsWith('/admin')) return;

  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } };
  const save = (s) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const start = () => {
    let ref = '';
    try { const h = new URL(document.referrer).hostname; if (h && h !== location.hostname) ref = h.replace(/^www\./, ''); } catch {}
    let vid = ls.getItem('bbs_v'), back = !!vid;
    if (!vid) { vid = uuid(); ls.setItem('bbs_v', vid); }
    const s = {
      id: uuid(), vid, back, t0: Date.now(), ref,
      src: (q.get('utm_source') || q.get('ref') || '').slice(0, 40), camp: (q.get('utm_campaign') || '').slice(0, 40),
      land: (location.pathname + location.hash).slice(0, 80),
      w: screen.width, h: screen.height, touch: matchMedia('(pointer:coarse)').matches,
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40), ev: [],
    };
    save(s); return s;
  };
  if (!load()) start();

  let timer = 0;
  const flush = () => {
    clearTimeout(timer); timer = 0;
    const s = load(); if (!s) return;
    const body = JSON.stringify({ ...s, now: Date.now() });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/t', new Blob([body], { type: 'application/json' }))))
        fetch('/api/t', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
    } catch {}
  };
  const track = (name, detail = '') => {
    const s = load() || start();
    if (s.ev.length >= 150) return;
    s.ev.push([Math.round((Date.now() - s.t0) / 1000), String(name).slice(0, 16), String(detail).slice(0, 60)]);
    save(s);
    if (!timer) timer = setTimeout(flush, 2500);
  };
  window.bbsTrack = track;

  // which page: "showroom" or "luxury", "luxury/suites", ...
  const m = location.pathname.match(/\/demos\/([^/]+)\/?([^/.]*)/);
  const page = m ? m[1] + (m[2] && m[2] !== 'index' ? '/' + m[2] : '') : 'showroom';
  let framed = false; try { framed = window.top !== window; } catch { framed = true; }
  track('page', page + (m && !framed ? ' direct' : ''));

  if (m) {
    const marks = [25, 50, 75, 100]; let hit = 0;
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight; if (max < 200) return;
      const pct = (scrollY / max) * 100;
      while (hit < marks.length && pct >= marks[hit] - 1) track('depth', page + ' ' + marks[hit++]);
    }, { passive: true });
    document.addEventListener('submit', () => track('form', page), true);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    if (/borregobusinesssystems\.com\/start/.test(a.href)) { track('cta', a.closest('#hud') ? 'inside ' + (location.hash.slice(1) || 'demo') : page); flush(); }
    else if (/^https:\/\/borregobusinesssystems\.com\/?$/.test(a.href)) { track('main', page); flush(); }
  }, true);
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
})();
