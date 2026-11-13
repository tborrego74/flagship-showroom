// Polished copper pipework rendered over the page. Each 3D piece is pinned to a DOM anchor ([data-3d]) so it
// travels with the layout, while depth and rotation give it parallax against the text.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const Y = new THREE.Vector3(0, 1, 0);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function bent(pts, r = 0.4) {
  const path = new THREE.CurvePath(); const joints = [];
  let prev = pts[0];
  for (let k = 1; k < pts.length; k++) {
    const cur = pts[k], next = pts[k + 1];
    if (!next) { path.add(new THREE.LineCurve3(prev, cur)); break; }
    const a = cur.clone().add(prev.clone().sub(cur).setLength(r));
    const b = cur.clone().add(next.clone().sub(cur).setLength(r));
    path.add(new THREE.LineCurve3(prev, a)); path.add(new THREE.QuadraticBezierCurve3(a, cur, b));
    joints.push([a, cur.clone().sub(prev).normalize()], [b, next.clone().sub(cur).normalize()]);
    prev = b;
  }
  return { path, joints };
}

export function createPipes(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 800 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
  const DIST = 22, FOV = 28;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100); camera.position.z = DIST;
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.position.set(-6, 9, 10); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9cc8ff, 1.0); fill.position.set(8, -2, 6); scene.add(fill);

  const copper = new THREE.MeshStandardMaterial({ color: 0xcf7d4c, metalness: 1, roughness: 0.2, envMapIntensity: 1.25 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9b25a, metalness: 1, roughness: 0.26, envMapIntensity: 1.2 });
  const enamel = new THREE.MeshStandardMaterial({ color: 0xd8432e, metalness: 0.15, roughness: 0.32 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xe9edf0, metalness: 1, roughness: 0.14 });
  const water = new THREE.MeshStandardMaterial({ color: 0x4aa8e8, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.88, envMapIntensity: 1.6 });

  function collar(parent, pos, dir, r, mat = brass) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.3, r * 1.15, 28), mat);
    c.position.copy(pos); c.quaternion.setFromUnitVectors(Y, dir); parent.add(c); return c;
  }
  function pipe(parent, pts, r, mat = copper, seg = 160) {
    const { path, joints } = bent(pts, r * 2.1);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, seg, r, 24), mat); parent.add(mesh);
    for (const [p, d] of joints) collar(parent, p, d, r);
    collar(parent, pts[0], pts[1].clone().sub(pts[0]).normalize(), r);
    collar(parent, pts[pts.length - 1], pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize(), r);
    return { mesh, path };
  }
  function wheel(R, t) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R, t, 18, 64), enamel));
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(t * 0.7, t * 0.7, R, 12), enamel);
      s.geometry.translate(0, R / 2, 0); s.rotation.z = (i / 5) * Math.PI * 2; g.add(s);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(t * 2, t * 2, t * 2.4, 24), brass); hub.rotation.x = Math.PI / 2; g.add(hub);
    return g;
  }

  /* ---- hero assembly (roughly 7 units tall) ---- */
  const hero = new THREE.Group(); const heroSpin = new THREE.Group(); hero.add(heroSpin); scene.add(hero);
  pipe(heroSpin, [V(-3.4, 2.3), V(0.6, 2.3), V(0.6, -0.4), V(2.9, -0.4), V(2.9, -2.6)], 0.32);
  pipe(heroSpin, [V(-2.1, -3.5, -1.1), V(-2.1, 0.7, -1.1), V(1.9, 0.7, -1.1), V(1.9, 3.5, -1.1)], 0.26);
  pipe(heroSpin, [V(-3.4, -1.5, 0.9), V(-0.5, -1.5, 0.9), V(-0.5, -1.5, -0.1), V(-0.5, -3.5, -0.1)], 0.17, steel);
  // gate valve on the main run
  const valve = new THREE.Group(); valve.position.set(-1.3, 2.3, 0);
  const vb = new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 24), brass); vb.scale.set(1.15, 0.9, 0.9); valve.add(vb);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 16), steel); stem.position.set(0, 0, 0.75); stem.rotation.x = Math.PI / 2; valve.add(stem);
  const heroWheel = wheel(0.72, 0.085); heroWheel.position.z = 1.25; valve.add(heroWheel);
  heroSpin.add(valve);
  // pressure gauge
  const gauge = new THREE.Group(); gauge.position.set(-2.1, -1.5, -0.55);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.22, 48), brass); rim.rotation.x = Math.PI / 2; gauge.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.53, 48), new THREE.MeshStandardMaterial({ color: 0xfbf7ee, roughness: 0.5 })); face.position.z = 0.115; gauge.add(face);
  for (let i = 0; i < 9; i++) {
    const tk = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.1), new THREE.MeshBasicMaterial({ color: 0x12233d }));
    const a = Math.PI * (1.25 - i * 0.1875); tk.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.12); tk.rotation.z = a - Math.PI / 2; gauge.add(tk);
  }
  const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.44), new THREE.MeshBasicMaterial({ color: 0xd8432e }));
  needle.geometry.translate(0, 0.17, 0); needle.position.z = 0.125; gauge.add(needle);
  heroSpin.add(gauge);
  // drops from the open end
  const drops = [];
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), water); heroSpin.add(d); drops.push(d);
  }

  /* ---- big valve wheel for the guarantee band ---- */
  const big = new THREE.Group(); scene.add(big);
  const bigWheel = wheel(2.2, 0.2); big.add(bigWheel);
  const bigStem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 20), steel); bigStem.rotation.x = Math.PI / 2; bigStem.position.z = -1.2; big.add(bigStem);
  pipe(big, [V(-3.3, 0, -2.6), V(3.3, 0, -2.6)], 0.62);
  const bigBody = new THREE.Mesh(new THREE.SphereGeometry(1.15, 40, 30), brass); bigBody.position.z = -2.6; big.add(bigBody);

  /* ---- the line that grows through "how a visit works" ---- */
  const line = new THREE.Group(); scene.add(line);
  let lineKey = '', linePath = null, lineMesh = null, lineCount = 0, stations = [];
  const headCap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), brass);
  const lineDrops = [];
  function buildLine(W, H, vertical) {
    while (line.children.length) { const c = line.children.pop(); c.geometry && c.geometry.dispose(); }
    stations = [];
    const r = vertical ? 0.2 : 0.24;
    let pts, at;
    if (vertical) {
      pts = [V(0, H / 2 + 2), V(0, -H / 2 - 2)];
      at = [0.125, 0.375, 0.625, 0.875].map((f) => V(0, H / 2 - f * H));
    } else {
      const h = H * 0.26, xs = [-0.375, -0.125, 0.125, 0.375].map((f) => f * W), dx = W * 0.125;
      pts = [V(-W / 2 - 2, h), V(xs[0] + dx, h), V(xs[0] + dx, -h), V(xs[1] + dx, -h), V(xs[1] + dx, h), V(xs[2] + dx, h), V(xs[2] + dx, -h), V(xs[3] + dx, -h), V(xs[3] + dx, h), V(W / 2 + 2, h)];
      at = xs.map((x, i) => V(x, i % 2 ? -h : h));
    }
    const { path } = bent(pts, r * 2.4);
    linePath = path;
    lineMesh = new THREE.Mesh(new THREE.TubeGeometry(path, 700, r, 20), copper);
    lineCount = lineMesh.geometry.index.count; line.add(lineMesh);
    const samples = path.getSpacedPoints(600);
    for (const p of at) {
      let best = 0, bd = 1e9; samples.forEach((s, i) => { const d = s.distanceToSquared(p); if (d < bd) { bd = d; best = i; } });
      const g = new THREE.Group(); g.position.copy(p);
      const body = new THREE.Mesh(new THREE.SphereGeometry(r * 2.1, 28, 20), brass); g.add(body);
      const w = wheel(r * 3.0, r * 0.36); w.position.z = r * 3.2; g.add(w);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.4, r * 3, 12), steel); st.rotation.x = Math.PI / 2; st.position.z = r * 1.8; g.add(st);
      line.add(g); stations.push({ g, w, f: best / 600, pop: 0 });
    }
    line.add(headCap); headCap.scale.setScalar(r / 0.24);
    lineDrops.length = 0;
    for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 16, 12), water); line.add(d); lineDrops.push(d); }
  }

  const anchors = {};
  document.querySelectorAll('[data-3d]').forEach((el) => { anchors[el.dataset['3d']] = el; });
  const st = { grow: 0, mx: 0, my: 0, scroll: 0 };
  const tmp = new THREE.Vector3();
  let W = 0, H = 0, k = 1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w !== W || h !== H) {
      W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      k = (2 * DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / h;      // world units per CSS pixel at z = 0
    }
  }
  // put a group where its DOM anchor is; returns the anchor rect or null when off-screen
  function pinTo(group, el, size, drift = 0.12) {
    if (!el) { group.visible = false; return null; }
    const r = el.getBoundingClientRect();
    group.visible = r.bottom > -200 && r.top < H + 200 && r.width > 0;
    if (!group.visible) return null;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    group.position.set((cx - W / 2) * k, -(cy - H / 2) * k * (1 + drift), 0);
    if (size) group.scale.setScalar((Math.min(r.width, r.height) * k) / size);
    return r;
  }
  return {
    state: st, get stations() { return stations; },
    update(t, dt) {
      resize();
      // hero
      if (pinTo(hero, anchors.hero, 7.4)) {
        heroSpin.rotation.y = -0.5 + st.mx * 0.5 + Math.sin(t * 0.35) * 0.06 + st.scroll * 0.0009;
        heroSpin.rotation.x = 0.14 + st.my * 0.25;
        heroWheel.rotation.z = t * 0.5 + st.scroll * 0.004;
        needle.rotation.z = -0.4 + Math.sin(t * 1.3) * 0.25 + Math.sin(t * 7.1) * 0.03;
        drops.forEach((d, i) => {
          const f = (t * 0.55 + i / drops.length) % 1;
          d.position.set(2.9, -2.9 - f * f * 3.8, 0);
          const s = Math.min(1, f * 6) * (1 - f * f); d.scale.set(s * 0.85, s * (1 + f * 0.9), s * 0.85);
        });
      }
      // big valve
      if (pinTo(big, anchors.valve, 5.4, 0.2)) {
        big.rotation.y = -0.55 + st.mx * 0.2; big.rotation.x = 0.1;
        bigWheel.rotation.z = st.scroll * 0.0035 + t * 0.12;
      }
      // growing line
      const lr = pinTo(line, anchors.line, 0, 0);
      if (lr) {
        const vertical = lr.height > lr.width * 1.2;
        const keyNow = `${Math.round(lr.width)}x${Math.round(lr.height)}`;
        if (keyNow !== lineKey) { lineKey = keyNow; buildLine(lr.width * k, lr.height * k, vertical); }
        const g = THREE.MathUtils.clamp(st.grow, 0.001, 1);
        lineMesh.geometry.setDrawRange(0, Math.floor((g * lineCount) / 120) * 120);
        linePath.getPointAt(g, tmp); headCap.position.copy(tmp);
        lineDrops.forEach((d, i) => {
          const f = (t * 0.9 + i / lineDrops.length) % 1;
          d.position.set(tmp.x, tmp.y - 0.3 - f * f * 2.2, tmp.z); d.scale.setScalar(g > 0.995 ? 0 : (1 - f) * Math.min(1, f * 8));
        });
        for (const s of stations) {
          const on = g >= s.f ? 1 : 0;
          s.pop += (on - s.pop) * Math.min(1, dt * 7);
          s.g.scale.setScalar(0.001 + s.pop * (1 + 0.25 * Math.sin(Math.min(1, s.pop) * Math.PI)));
          s.w.rotation.z = s.pop * 3.2 + (on ? t * 0.4 : 0);
        }
      }
      renderer.render(scene, camera);
    },
  };
}
