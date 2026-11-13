// A night city with live delivery routes. One hero route is scrubbed by scroll; the rest pulse on their own.
import * as THREE from 'three';

const P = 1.5, G = 13;                       // road pitch, half-size of the grid in blocks
const LIME = new THREE.Color(0xb8ff5a);
const rand = (() => { let s = 20417; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const ease = (t) => t * t * (3 - 2 * t);

function roadPath(nodes, r = 0.28) {
  const pts = nodes.map(([i, j]) => new THREE.Vector3(i * P, 0.06, j * P));
  const path = new THREE.CurvePath();
  let prev = pts[0];
  for (let k = 1; k < pts.length; k++) {
    const cur = pts[k], next = pts[k + 1];
    if (!next) { path.add(new THREE.LineCurve3(prev, cur)); break; }
    const a = cur.clone().add(prev.clone().sub(cur).setLength(r));
    const b = cur.clone().add(next.clone().sub(cur).setLength(r));
    path.add(new THREE.LineCurve3(prev, a));
    path.add(new THREE.QuadraticBezierCurve3(a, cur, b));
    prev = b;
  }
  return path;
}
const routeMat = (color, o) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uColor: { value: new THREE.Color(color) }, uHead: { value: 1 }, uTime: { value: 0 }, uBase: { value: 0.1 }, uPulse: { value: 1 }, uN: { value: 2 }, uSpeed: { value: 0.2 }, uGain: { value: 1 }, ...o },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform vec3 uColor; uniform float uHead,uTime,uBase,uPulse,uN,uSpeed,uGain; varying vec2 vUv;
    void main(){ float drawn = step(vUv.x, uHead);
      float tail = exp(-(uHead - vUv.x)*9.);
      float pulse = uPulse * pow(fract(vUv.x*uN - uTime*uSpeed), 9.);
      float a = (drawn*(uBase + tail*.9) + pulse*drawn) * uGain;
      gl_FragColor = vec4(uColor*a, a); }`,
});

export function createCity(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const small = innerWidth < 800;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080b);
  scene.fog = new THREE.FogExp2(0x06080b, 0.021);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
  scene.add(new THREE.HemisphereLight(0x6f88b8, 0x05070a, 2.2));
  const sun = new THREE.DirectionalLight(0xa9c4ff, 2.4); sun.position.set(-8, 12, 5); scene.add(sun);

  // ground + road lines
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const lines = [];
  for (let i = -G; i <= G; i++) { lines.push(i * P, 0.02, -G * P, i * P, 0.02, G * P, -G * P, 0.02, i * P, G * P, 0.02, i * P); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x34435a, transparent: true, opacity: 0.9 })));

  // buildings + window lights
  const cells = [];
  for (let i = -G; i < G; i++) for (let j = -G; j < G; j++) {
    if (rand() < 0.1) continue;
    const cx = (i + 0.5) * P, cz = (j + 0.5) * P, d2 = cx * cx + cz * cz;
    const h = Math.min(2.3, (0.18 + Math.pow(rand(), 2.4) * 1.25) * (1 + 1.1 * Math.exp(-d2 / 70)));
    cells.push({ cx, cz, h, w: 0.66 + rand() * 0.3, d: 0.66 + rand() * 0.3 });
  }
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMesh = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.35 }), cells.length);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  const wp = [], wc = [];
  cells.forEach((c, k) => {
    m.makeScale(c.w, c.h, c.d).setPosition(c.cx, 0, c.cz); bMesh.setMatrixAt(k, m);
    const v = 0.11 + rand() * 0.1; bMesh.setColorAt(k, col.setRGB(v * 0.8, v * 0.95, v * 1.25));
    const n = Math.floor(c.h * (small ? 5 : 10));
    for (let q = 0; q < n; q++) {
      const side = Math.floor(rand() * 4), u = (rand() - 0.5) * 0.86, y = 0.15 + rand() * (c.h - 0.25);
      const x = side < 2 ? c.cx + u * c.w : c.cx + (side === 2 ? 0.5 : -0.5) * c.w * 1.01;
      const z = side < 2 ? c.cz + (side === 0 ? 0.5 : -0.5) * c.d * 1.01 : c.cz + u * c.d;
      wp.push(x, y, z);
      const warm = rand() < 0.7, b = 0.35 + rand() * 0.65;
      wc.push((warm ? 1 : 0.6) * b, (warm ? 0.82 : 0.82) * b, (warm ? 0.55 : 1) * b);
    }
  });
  scene.add(bMesh);
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  wg.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
  scene.add(new THREE.Points(wg, new THREE.PointsMaterial({ size: 0.085, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));

  // hero route: driver → pickup → drop-off
  const NODES = [[-9, -6], [-5, -6], [-5, -2], [0, -2], [0, 3], [5, 3], [5, 7], [9, 7]];
  const hero = roadPath(NODES);
  const PICK = 4 * P / hero.getLength();        // fraction of the route where the pickup happens
  const heroCore = new THREE.Mesh(new THREE.TubeGeometry(hero, 500, 0.035, 6), routeMat(0xb8ff5a, { uBase: { value: 0.75 }, uPulse: { value: 0 } }));
  const heroGlow = new THREE.Mesh(new THREE.TubeGeometry(hero, 500, 0.16, 8), routeMat(0xb8ff5a, { uBase: { value: 0.09 }, uPulse: { value: 0 } }));
  const heroGhost = new THREE.Mesh(new THREE.TubeGeometry(hero, 300, 0.02, 4), routeMat(0xffffff, { uBase: { value: 0.1 }, uPulse: { value: 0 } }));
  for (const h of [heroGhost, heroGlow, heroCore]) { h.material.depthTest = false; h.renderOrder = 5; }
  heroGhost.material.uniforms.uBase.value = 0.16;
  scene.add(heroGhost, heroGlow, heroCore);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 20), new THREE.MeshBasicMaterial({ color: 0xeaffc4, depthTest: false }));
  head.renderOrder = 6;
  const headLight = new THREE.PointLight(0xb8ff5a, 14, 6, 1.5);
  head.add(headLight); scene.add(head);

  // ambient routes
  const ambient = [];
  const palette = [0x6fb7ff, 0xffffff, 0x6fb7ff, 0xffb86b, 0xffffff, 0x6fb7ff, 0xb8ff5a, 0xffffff, 0x6fb7ff];
  palette.forEach((c, k) => {
    let i = Math.floor(rand() * 2 * G) - G, j = Math.floor(rand() * 2 * G) - G, horiz = rand() < 0.5;
    const nodes = [[i, j]];
    for (let s = 0; s < 4 + Math.floor(rand() * 3); s++) {
      const len = (3 + Math.floor(rand() * 7)) * (rand() < 0.5 ? -1 : 1);
      if (horiz) i = THREE.MathUtils.clamp(i + len, -G, G); else j = THREE.MathUtils.clamp(j + len, -G, G);
      const last = nodes[nodes.length - 1];
      if (last[0] !== i || last[1] !== j) nodes.push([i, j]);
      horiz = !horiz;
    }
    if (nodes.length < 3) return;
    const mat = routeMat(c, { uBase: { value: 0.2 }, uPulse: { value: 1.6 }, uN: { value: 1 + Math.floor(rand() * 2) }, uSpeed: { value: 0.07 + rand() * 0.08 } });
    mat.uniforms.uTime.value = rand() * 10;
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(roadPath(nodes), 240, 0.04, 5), mat));
    ambient.push(mat);
  });

  // markers
  function marker(pos, color) {
    const g = new THREE.Group(); g.position.copy(pos); g.position.y = 0.04;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 48), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), new THREE.MeshBasicMaterial({ color, depthTest: false }));
    dot.renderOrder = 6; ring.material.depthTest = false; ring.renderOrder = 6;
    dot.rotation.x = -Math.PI / 2; dot.position.y = 0.01;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 4.2, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 2.1;
    g.add(ring, dot, beam); scene.add(g);
    return { g, ring, top: new THREE.Vector3(pos.x, 4.3, pos.z) };
  }
  const pick = marker(hero.getPointAt(PICK), 0xffffff);
  const drop = marker(hero.getPointAt(1), 0xb8ff5a);

  const st = { mix: 0, u: 0, p: 0, orbit: 0 };
  const camPos = new THREE.Vector3(18, 13, 18), camLook = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), la = new THREE.Vector3(), lb = new THREE.Vector3(), hp = new THREE.Vector3();
  let first = true;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  const proj = new THREE.Vector3();
  return {
    state: st, PICK, debug: { camera, scene, renderer },
    project(which) {
      proj.copy(which === 'pick' ? pick.top : drop.top).project(camera);
      return { x: (proj.x * 0.5 + 0.5) * canvas.clientWidth, y: (-proj.y * 0.5 + 0.5) * canvas.clientHeight, front: proj.z < 1 };
    },
    update(t, dt) {
      resize();
      const tall = camera.aspect < 0.8;
      // route + head
      const u = THREE.MathUtils.clamp(st.u, 0, 1);
      hero.getPointAt(u, hp); head.position.copy(hp); head.position.y = 0.16;
      heroCore.material.uniforms.uHead.value = u; heroGlow.material.uniforms.uHead.value = u;
      head.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
      for (const mt of ambient) mt.uniforms.uTime.value += dt;
      for (const [mk, ph] of [[pick, 0], [drop, 0.5]]) {
        const k = (t * 0.55 + ph) % 1;
        mk.ring.scale.setScalar(1 + k * 2.4); mk.ring.material.opacity = (1 - k) * 0.9;
      }
      // camera: 0 = orbiting overview, 1 = chasing the courier, 2 = top-down board
      st.orbit += dt * 0.035;
      const R = tall ? 30 : 22;
      a.set(Math.cos(st.orbit + 0.7) * R, tall ? 17 : 12.5, Math.sin(st.orbit + 0.7) * R); la.set(0, 0, 0);
      const ang = -0.7 + st.p * 1.5, back = tall ? 12 : 7.5;
      hero.getPointAt(Math.min(1, u + 0.05), lb); lb.lerp(hp, 0.5);
      b.set(lb.x + Math.sin(ang) * back, tall ? 10 : 6.6, lb.z + Math.cos(ang) * back);
      let k = THREE.MathUtils.clamp(st.mix, 0, 2);
      if (k <= 1) { k = ease(k); a.lerp(b, k); la.lerp(lb, k); }
      else { k = ease(k - 1); a.copy(b).lerp(proj.set(4, tall ? 44 : 30, 13), k); la.copy(lb).lerp(proj.set(0, 0, 1), k); }
      const l = 3.2; if (first) { camPos.copy(a); camLook.copy(la); first = false; }
      camPos.x = damp(camPos.x, a.x, l, dt); camPos.y = damp(camPos.y, a.y, l, dt); camPos.z = damp(camPos.z, a.z, l, dt);
      camLook.x = damp(camLook.x, la.x, l, dt); camLook.y = damp(camLook.y, la.y, l, dt); camLook.z = damp(camLook.z, la.z, l, dt);
      camera.position.copy(camPos); camera.lookAt(camLook);
      renderer.render(scene, camera);
    },
  };
}
