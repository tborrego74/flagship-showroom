import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

/* ------------------------------------------------------------------ config */
const SITES = [
  { id: 'luxury',   name: 'Solmère House', kind: 'Luxury hospitality', short: 'Luxury',   url: 'demos/luxury/',   finish: 0xd9cdb8, glow: 0xffb070 },
  { id: 'courier',  name: 'Relay Nine',    kind: 'Same-day courier',   short: 'Courier',  url: 'demos/courier/',  finish: 0x2a2b2f, glow: 0xb8ff5a },
  { id: 'plumbing', name: 'Halden & Pike', kind: 'Plumbing service',   short: 'Plumbing', url: 'demos/plumbing/', finish: 0xc9ccd1, glow: 0xfff0dc },
];
const SLOT_X = [-5.5, -0.45, 4.6];
const SLOT_Z = [0.4, 0, 0.4];
const SLOT_R = [0.17, 0, -0.17];
const OPEN = THREE.MathUtils.degToRad(104);
const W = 3.2, D = 2.2, BH = 0.11, LH = 0.06, SW = 2.96, SH = 1.85;
const FOV = 32;
const PW = 0.7, PH = 1.515, PHONE_X = 2.2;

const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const lite = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------------------------------------------------------------- renderer */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  showFallback();
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050506);
scene.fog = new THREE.Fog(0x050506, 16, 40);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 120);
scene.add(new THREE.HemisphereLight(0x8a93b0, 0x0a0a0c, 0.25));

/* ------------------------------------------------------------------- floor */
const tint = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140),
  new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.62, metalness: 0.1, transparent: true, opacity: lite ? 1 : 0.8 })
);
tint.rotation.x = -Math.PI / 2;
tint.position.y = 0.003;
tint.receiveShadow = true;
scene.add(tint);
if (!lite) {
  const mirror = new Reflector(new THREE.PlaneGeometry(140, 140), {
    textureWidth: Math.min(1400, innerWidth), textureHeight: Math.min(900, innerHeight), color: 0x8c8c8c, clipBias: 0.003,
  });
  mirror.rotation.x = -Math.PI / 2;
  const inner = mirror.onBeforeRender;
  mirror.onBeforeRender = function (...a) {
    tint.visible = false; beams.visible = false;
    inner.apply(this, a);
    tint.visible = true; beams.visible = true;
  };
  scene.add(mirror);
}

/* ------------------------------------------------------------------ lights */
const beams = new THREE.Group();
scene.add(beams);
const beamMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: { uColor: { value: new THREE.Color(0xfff0d8) }, uPower: { value: 0 } },
  vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV;
    void main(){ vH = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uPower; varying float vH; varying vec3 vN; varying vec3 vV;
    void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float h = smoothstep(0.,.25,vH)*pow(vH,1.6);
      gl_FragColor = vec4(uColor, f*h*uPower); }`,
});
const spots = SLOT_X.map((x, i) => {
  const s = new THREE.SpotLight(0xfff0dc, 0, 34, 0.3, 0.85, 1.6);
  s.position.set(x * 0.92, 10.5, 2.2);
  s.target.position.set(x, 0, SLOT_Z[i] - 0.1);
  s.castShadow = true;
  s.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
  s.shadow.bias = -0.0004; s.shadow.radius = 6;
  s.shadow.camera.near = 4; s.shadow.camera.far = 16;
  scene.add(s, s.target);
  // visible light cone
  const h = 11.2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.5, h, 64, 1, true), beamMat());
  cone.geometry.translate(0, -h / 2, 0);
  cone.position.copy(s.position);
  cone.lookAt(s.target.position);
  cone.rotateX(-Math.PI / 2);
  beams.add(cone);
  return { light: s, cone, power: 0, target: 0 };
});
const rim = new THREE.DirectionalLight(0x6f86ff, 0.5);
rim.position.set(-6, 5, -9);
scene.add(rim);

/* -------------------------------------------------------------------- dust */
const DUST = lite ? 90 : 240;
const dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) {
  dustPos[i * 3] = SLOT_X[i % 3] + (Math.random() - 0.5) * 3.6;
  dustPos[i * 3 + 1] = Math.random() * 7;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 3.4;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0xffe9c8, size: 0.022, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending,
}));
scene.add(dust);

/* ----------------------------------------------------------------- laptops */
const texLoader = new THREE.TextureLoader();
function placeholder(site, tall) {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 800;
  if (tall) { c.width = 390; c.height = 844; }
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1280, 800);
  g.addColorStop(0, '#16161a'); g.addColorStop(1, '#050506');
  x.fillStyle = g; x.fillRect(0, 0, 1280, 800);
  x.fillStyle = '#ECEAE4'; x.textAlign = 'center';
  const cx = c.width / 2, cy = c.height / 2, k = tall ? 0.42 : 1;
  x.font = `400 ${110 * k}px Georgia, serif`; x.fillText(site.name, cx, cy);
  x.font = `500 ${26 * k}px sans-serif`; x.globalAlpha = 0.6; x.fillText(site.kind.toUpperCase(), cx, cy + 70 * k);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const keyGeo = new THREE.BoxGeometry(0.168, 0.018, 0.148);
const keyMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.55, metalness: 0.1 });
const blackMat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.18, metalness: 0.3 });

function buildLaptop(site, index) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: site.finish, metalness: 0.92, roughness: 0.34 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, BH, D, 5, 0.045), metal);
  base.position.y = BH / 2 + 0.012;
  base.castShadow = base.receiveShadow = true;
  base.userData.part = 'base';
  g.add(base);
  const top = BH + 0.012;

  const well = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.34, 1.02), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.7 }));
  well.rotation.x = -Math.PI / 2; well.position.set(0, top + 0.002, -0.42);
  g.add(well);
  const rows = 5, cols = 14, n = rows * cols;
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, n + 1);
  const m = new THREE.Matrix4(); let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === rows - 1 && c >= 4 && c <= 8) continue;
    m.makeTranslation((c - (cols - 1) / 2) * 0.2, top + 0.011, -0.82 + r * 0.2);
    keys.setMatrixAt(k++, m);
  }
  m.makeScale(5.6, 1, 1).setPosition(0.2 * -0.5, top + 0.011, -0.82 + 4 * 0.2);
  keys.setMatrixAt(k++, m);
  keys.count = k;
  g.add(keys);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.66),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(site.finish).multiplyScalar(0.82), metalness: 0.9, roughness: 0.2 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, top + 0.002, 0.62);
  g.add(pad);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, W - 0.7, 20), blackMat);
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, top + 0.01, -D / 2 + 0.03);
  g.add(hinge);

  const pivot = new THREE.Group();
  pivot.position.set(0, top + 0.014, -D / 2 + 0.03);
  g.add(pivot);
  const zc = D / 2 - 0.03;
  const lid = new THREE.Mesh(new RoundedBoxGeometry(W, LH, D, 5, 0.028), metal);
  lid.position.set(0, LH / 2, zc);
  lid.castShadow = true; lid.userData.part = 'lid';
  pivot.add(lid);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, D - 0.05), blackMat);
  bezel.rotation.x = Math.PI / 2; bezel.position.set(0, -0.004, zc);
  pivot.add(bezel);
  const screenMat = new THREE.MeshBasicMaterial({ map: placeholder(site), toneMapped: false });
  texLoader.load(`assets/screens/${site.id}.jpg`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    screenMat.map = t; screenMat.needsUpdate = true;
  }, undefined, () => {});
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat);
  screen.rotation.x = Math.PI / 2; screen.position.set(0, -0.008, zc + 0.03);
  screen.userData.part = 'lid';
  pivot.add(screen);
  const mark = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1, roughness: 0.12 }));
  mark.rotation.x = -Math.PI / 2; mark.position.set(0, LH + 0.002, zc);
  pivot.add(mark);
  const glow = new THREE.PointLight(site.glow, 0, 4.5, 2);
  glow.position.set(0, -0.9, zc);
  pivot.add(glow);

  // phone on a small puck stand, travels with its laptop
  const phone = new THREE.Group();
  phone.position.set(PHONE_X, 0, 0.62); phone.rotation.y = -0.2;
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.07, 48), new THREE.MeshStandardMaterial({ color: 0x141416, metalness: 0.85, roughness: 0.3 }));
  puck.position.y = 0.035; puck.castShadow = puck.receiveShadow = true;
  phone.add(puck);
  const tilt = new THREE.Group(); tilt.position.set(0, 0.07, -0.05); tilt.rotation.x = -0.2;
  phone.add(tilt);
  const body = new THREE.Mesh(new RoundedBoxGeometry(PW + 0.07, PH + 0.07, 0.075, 6, 0.036), metal);
  body.position.y = (PH + 0.07) / 2; body.castShadow = true; body.userData.part = 'phone';
  tilt.add(body);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(PW + 0.035, PH + 0.035), blackMat);
  glass.position.set(0, body.position.y, 0.0385);
  tilt.add(glass);
  const pScreenMat = new THREE.MeshBasicMaterial({ map: placeholder(site, true), toneMapped: false });
  texLoader.load(`assets/screens/${site.id}-m.jpg`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    pScreenMat.map = t; pScreenMat.needsUpdate = true;
  }, undefined, () => {});
  const pScreen = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), pScreenMat);
  pScreen.position.set(0, body.position.y, 0.0405); pScreen.userData.part = 'phone';
  tilt.add(pScreen);
  g.add(phone);

  const L = {
    site, index, group: g, pivot, screen, screenMat, glow, hit: [base, lid, screen, body, pScreen],
    screens: { laptop: screen, phone: pScreen }, pScreenMat,
    lid: 0, lidTarget: 0, lift: 0,
    pos: new THREE.Vector3(SLOT_X[index] * 1.6, 0, -34), rotY: SLOT_R[index] * 2,
    tpos: new THREE.Vector3(SLOT_X[index] * 1.6, 0, -34), trotY: SLOT_R[index], speed: 2.0,
  };
  for (const h of L.hit) h.userData.laptop = L;
  g.position.copy(L.pos);
  scene.add(g);
  return L;
}
const laptops = SITES.map(buildLaptop);
let order = [0, 1, 2]; // slot -> laptop index
const slotOf = (L) => order.indexOf(L.index);

/* ------------------------------------------------------------------ labels */
const labelsEl = $('#labels');
for (const L of laptops) {
  const el = document.createElement('div');
  el.className = 'label';
  el.innerHTML = `<div class="n">${L.site.kind}</div><div class="t">${L.site.name}</div><button class="e">Step inside</button>`;
  el.querySelector('button').addEventListener('click', () => enter(L));
  labelsEl.appendChild(el);
  L.label = el;
}
const hudSites = $('#hud-sites');
for (const L of laptops) {
  const b = document.createElement('button');
  b.innerHTML = `${L.site.short}`;
  b.title = L.site.name;
  b.addEventListener('click', () => enter(L, dev));
  hudSites.appendChild(b);
  L.hudBtn = b;
}

/* ------------------------------------------------------------------ camera */
let portrait = false, active = 1;
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
const desk = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
const tmpCam = new THREE.PerspectiveCamera();
function computeDesk() {
  const aspect = innerWidth / innerHeight;
  const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const halfW = portrait ? 2.6 : 8.9;
  const dist = Math.max(portrait ? 9 : 11.5, halfW / (tanH * aspect));
  const cx = portrait ? SLOT_X[active] + 0.55 : 0;
  const target = new THREE.Vector3(cx + mouseS.x * 0.25, (portrait ? 1.3 : 2.3) + dist * 0.02, 0);
  const dir = new THREE.Vector3(mouseS.x * 0.06, 0.36 + mouseS.y * 0.03, 1).normalize();
  desk.pos.copy(target).addScaledVector(dir, dist);
  tmpCam.position.copy(desk.pos); tmpCam.lookAt(target);
  desk.quat.copy(tmpCam.quaternion);
}
const sPos = new THREE.Vector3(), sQuat = new THREE.Quaternion(), sNorm = new THREE.Vector3();
function screenPose(L, out, dev = 'laptop') {
  L.group.updateMatrixWorld(true);
  const mesh = L.screens[dev];
  mesh.getWorldPosition(sPos);
  mesh.getWorldQuaternion(sQuat);
  sNorm.set(0, 0, 1).applyQuaternion(sQuat);
  const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  let d = Math.min(SH, SW / camera.aspect) / (2 * tanH) * 0.985;
  if (dev === 'phone') d = portrait ? Math.min(PH, PW / camera.aspect) / (2 * tanH) * 0.985
    : Math.max(PH / 0.84, PW / 0.84 / camera.aspect) / (2 * tanH);
  out.pos.copy(sPos).addScaledVector(sNorm, d);
  out.quat.copy(sQuat);
  if (dev === 'phone' && !portrait) out.pos.addScaledVector(sNorm.set(0, 1, 0).applyQuaternion(sQuat), -0.07); // leave room for the nav pill
}

/* ------------------------------------------------------------ state machine */
let mode = 'intro';            // intro | desk | fly | inside
let current = null;            // laptop we are inside / flying to
let dev = 'laptop';            // which of its screens: laptop | phone
let fly = null;
const viewer = $('#viewer');
let frame = null;
const poseA = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
const poseB = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
const ctrl = new THREE.Vector3();

function setBody() {
  document.body.classList.toggle('inside', mode === 'inside');
  document.body.classList.toggle('flying', mode === 'fly');
}
function loadFrame(L) {
  if (frame) frame.remove();
  frame = document.createElement('iframe');
  frame.title = `${L.site.name} demo site`;
  frame.dataset.loaded = '';
  frame.addEventListener('load', () => { frame && (frame.dataset.loaded = '1'); });
  frame.src = `${L.site.url}?embed=1`;
  viewer.appendChild(frame);
}
const corner = new THREE.Vector3();
function placeFrame() {
  if (!frame || !current) return;
  const phoneRect = dev === 'phone' && !portrait;
  viewer.classList.toggle('phone', phoneRect);
  if (!phoneRect) { frame.style.cssText = ''; return; }
  camera.updateMatrixWorld(true);
  const m = current.screens.phone;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    corner.set(sx * PW / 2, sy * PH / 2, 0); m.localToWorld(corner); corner.project(camera);
    const x = (corner.x * 0.5 + 0.5) * innerWidth, y = (-corner.y * 0.5 + 0.5) * innerHeight;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  // render the page at a true phone width, then scale it onto the 3D screen
  const scale = (x1 - x0) / 390;
  frame.style.cssText = `left:${x0}px;top:${y0}px;width:390px;height:${(y1 - y0) / scale}px;transform:scale(${scale});transform-origin:0 0;border-radius:26px`;
}
function enter(L, device = 'laptop') {
  if (mode === 'fly' || mode === 'intro' || (mode === 'inside' && current === L && dev === device)) return;
  const from = mode;
  const sameSite = from === 'inside' && current === L;
  const start = () => {
    current = L; dev = device;
    L.lidTarget = OPEN; L.lift = 0;
    poseA.pos.copy(camera.position); poseA.quat.copy(camera.quaternion);
    fly = { t: 0, dur: sameSite ? 1.2 : from === 'inside' ? 2.0 : 1.55, to: 'inside', arc: from === 'inside' && !sameSite, started: performance.now() };
    mode = 'fly'; setBody();
    loadFrame(L);
    for (const o of laptops) o.hudBtn.classList.toggle('on', o === L);
    $('#dev-laptop').classList.toggle('on', dev === 'laptop');
    $('#dev-phone').classList.toggle('on', dev === 'phone');
    history.replaceState(null, '', `#${L.site.id}${dev === 'phone' ? '-mobile' : ''}`);
  };
  if (from === 'inside') {
    viewer.classList.remove('on');
    setTimeout(start, 380);
  } else start();
}
function exit() {
  if (mode !== 'inside') return;
  viewer.classList.remove('on');
  history.replaceState(null, '', location.pathname + location.search);
  setTimeout(() => {
    if (frame) { frame.remove(); frame = null; }
    poseA.pos.copy(camera.position); poseA.quat.copy(camera.quaternion);
    fly = { t: 0, dur: 1.5, to: 'desk' };
    if (portrait && current) active = slotOf(current);
    mode = 'fly'; setBody();
  }, 380);
}
viewer.addEventListener('click', (e) => { if (e.target === viewer) exit(); });
$('#dev-laptop').addEventListener('click', () => current && enter(current, 'laptop'));
$('#dev-phone').addEventListener('click', () => current && enter(current, 'phone'));
$('#hud-exit').addEventListener('click', exit);
addEventListener('keydown', (e) => { if (e.key === 'Escape') exit(); });
addEventListener('message', (e) => { if (e.data && e.data.type === 'showroom-exit') exit(); });

/* ------------------------------------------------------------- interaction */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPt = new THREE.Vector3();
const hitMeshes = laptops.flatMap((L) => L.hit);
let hovered = null, press = null;
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(hitMeshes, false)[0];
  return h ? { L: h.object.userData.laptop, part: h.object.userData.part } : null;
}
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'desk') return;
  const p = pick(e);
  if (!p) return;
  canvas.setPointerCapture(e.pointerId);
  ray.ray.intersectPlane(plane, hitPt);
  press = { ...p, x: e.clientX, y: e.clientY, kind: null, off: hitPt.x - p.L.pos.x, offZ: hitPt.z - p.L.pos.z, lid0: p.L.lidTarget, moved: false };
});
canvas.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  if (mode !== 'desk') return;
  if (!press) {
    const p = pick(e);
    hovered = p ? p.L : null;
    canvas.classList.toggle('is-point', !!hovered);
    return;
  }
  const dx = e.clientX - press.x, dy = e.clientY - press.y;
  if (!press.kind && Math.hypot(dx, dy) > 7) {
    press.kind = press.part === 'lid' && press.L.lidTarget >= 0 && Math.abs(dy) > Math.abs(dx) * 1.1 ? 'lid' : 'move';
    if (portrait && press.kind === 'move') press.kind = 'swipe';
    canvas.classList.add('is-drag');
  }
  if (press.kind === 'lid') {
    press.L.lidTarget = THREE.MathUtils.clamp(press.lid0 - dy * 0.0085, 0, THREE.MathUtils.degToRad(128));
  } else if (press.kind === 'move') {
    const L = press.L;
    ndc.set(mouse.x, -mouse.y); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hitPt)) {
      L.tpos.x = THREE.MathUtils.clamp(hitPt.x - press.off, -7, 7);
      L.tpos.z = THREE.MathUtils.clamp(hitPt.z - press.offZ, -1.4, 1.6);
      L.lift = 0.22; L.speed = 16; L.trotY = -L.tpos.x * 0.045;
      L.label.classList.add('dragging');
      // live reorder
      let best = 0, bd = 1e9;
      SLOT_X.forEach((x, i) => { const d = Math.abs(x - L.tpos.x); if (d < bd) { bd = d; best = i; } });
      const cur = slotOf(L);
      if (best !== cur) { order.splice(cur, 1); order.splice(best, 0, L.index); settle(L); }
    }
  }
});
function settle(except) {
  order.forEach((li, slot) => {
    const L = laptops[li];
    if (L === except) return;
    L.tpos.set(SLOT_X[slot], 0, SLOT_Z[slot]); L.trotY = SLOT_R[slot]; L.speed = 7;
  });
}
function release(e) {
  if (!press) return;
  const { L, kind, part } = press;
  canvas.classList.remove('is-drag');
  L.label.classList.remove('dragging');
  if (kind === 'lid') {
    if (L.lidTarget < THREE.MathUtils.degToRad(28)) L.lidTarget = 0;
  } else if (kind === 'move') {
    L.lift = 0; settle(null);
  } else if (kind === 'swipe') {
    const dx = e.clientX - press.x;
    if (Math.abs(dx) > 36) step(dx < 0 ? 1 : -1);
  } else {
    if (portrait && slotOf(L) !== active) active = slotOf(L);
    else if (part === 'phone') enter(L, 'phone');
    else if (L.lidTarget < THREE.MathUtils.degToRad(40)) L.lidTarget = OPEN;
    else enter(L);
  }
  press = null;
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', () => { if (press) { press.L.lift = 0; settle(null); press = null; canvas.classList.remove('is-drag'); } });
canvas.addEventListener('pointerleave', () => { hovered = null; });
function step(d) { active = THREE.MathUtils.clamp(active + d, 0, 2); }
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));

/* ------------------------------------------------------------------ resize */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  portrait = w / h < 0.95;
  document.body.classList.toggle('portrait', portrait);
  if (mode === 'inside' && current) {
    screenPose(current, poseB, dev);
    camera.position.copy(poseB.pos); camera.quaternion.copy(poseB.quat);
    renderer.render(scene, camera); placeFrame();
  }
}
addEventListener('resize', resize);
resize();

/* -------------------------------------------------------------------- loop */
const clock = new THREE.Clock();
let introT = -1;
const v = new THREE.Vector3();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = clock.elapsedTime;
  if (mode === 'inside') return;

  // intro choreography
  if (mode === 'intro' && introT >= 0) {
    introT += dt;
    laptops.forEach((L, i) => {
      const slot = slotOf(L);
      if (introT > 0.15 + i * 0.28) { L.tpos.set(SLOT_X[slot], 0, SLOT_Z[slot]); L.trotY = SLOT_R[slot]; }
      if (introT > 2.1 + i * 0.32) L.lidTarget = OPEN;
    });
    spots.forEach((s, i) => { if (introT > 1.2 + i * 0.3) s.target = 1; });
    if (introT > 3.6) {
      mode = 'desk'; document.body.classList.add('ready');
      const [hid, hdev] = location.hash.slice(1).split('-');
      const want = laptops.find((L) => L.site.id === hid);
      if (want) setTimeout(() => enter(want, hdev === 'mobile' ? 'phone' : 'laptop'), 500);
    }
  }

  // laptops
  for (const L of laptops) {
    L.pos.x = damp(L.pos.x, L.tpos.x, L.speed, dt);
    L.pos.z = damp(L.pos.z, L.tpos.z, L.speed, dt);
    const lift = L.lift || (hovered === L && mode === 'desk' && !press ? 0.07 : 0);
    L.pos.y = damp(L.pos.y, lift, 9, dt);
    L.rotY = damp(L.rotY, L.trotY, 6, dt);
    L.group.position.copy(L.pos);
    L.group.rotation.y = L.rotY;
    L.lid = damp(L.lid, L.lidTarget, 5.5, dt);
    L.pivot.rotation.x = -L.lid;
    const on = THREE.MathUtils.smoothstep(L.lid, 0.25, 0.9);
    L.screenMat.color.setScalar(on);
    L.glow.intensity = on * 2.2;
  }
  // spotlights follow slots, brighten on hover
  spots.forEach((s, slot) => {
    const L = laptops[order[slot]];
    const boost = hovered === L || current === L ? 1.3 : 1;
    s.power = damp(s.power, s.target * boost, 2.2, dt);
    s.light.intensity = s.power * 900;
    s.cone.material.uniforms.uPower.value = s.power * 0.3;
  });
  // dust drift
  const p = dustGeo.attributes.position;
  for (let i = 0; i < DUST; i++) {
    let y = p.getY(i) + dt * (0.05 + (i % 7) * 0.012);
    if (y > 7) y = 0;
    p.setY(i, y);
    p.setX(i, p.getX(i) + Math.sin(now * 0.3 + i) * dt * 0.02);
  }
  p.needsUpdate = true;

  // camera
  mouseS.x = damp(mouseS.x, mouse.x, 3, dt); mouseS.y = damp(mouseS.y, mouse.y, 3, dt);
  computeDesk();
  if (mode === 'fly') {
    fly.t = Math.min(1, fly.t + dt / fly.dur);
    const k = ease(fly.t);
    if (fly.to === 'inside') screenPose(current, poseB, dev);
    else { poseB.pos.copy(desk.pos); poseB.quat.copy(desk.quat); }
    if (fly.arc) {
      ctrl.copy(desk.pos).lerp(poseA.pos, 0.25).lerp(poseB.pos, 0.2);
      const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
      camera.position.set(0, 0, 0).addScaledVector(poseA.pos, a).addScaledVector(ctrl, b).addScaledVector(poseB.pos, c);
    } else camera.position.lerpVectors(poseA.pos, poseB.pos, k);
    camera.quaternion.slerpQuaternions(poseA.quat, poseB.quat, k);
    if (fly.t >= 1) {
      if (fly.to === 'inside') {
        const waited = performance.now() - fly.started;
        if (frame && (frame.dataset.loaded || waited > 4500)) {
          renderer.render(scene, camera); placeFrame();
          mode = 'inside'; setBody(); viewer.classList.add('on'); fly = null;
        }
      } else { mode = 'desk'; current = null; setBody(); fly = null; }
    }
  } else {
    const l = mode === 'intro' ? 50 : 4;
    camera.position.x = damp(camera.position.x, desk.pos.x, l, dt);
    camera.position.y = damp(camera.position.y, desk.pos.y, l, dt);
    camera.position.z = damp(camera.position.z, desk.pos.z, l, dt);
    camera.quaternion.slerp(desk.quat, 1 - Math.exp(-l * dt));
  }

  // labels
  if (mode !== 'fly') {
    for (const L of laptops) {
      v.set(0, 0, D / 2 + 0.35).applyAxisAngle(THREE.Object3D.DEFAULT_UP, L.rotY).add(L.pos); v.y = 0;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
      L.label.style.transform = `translate(-50%,0) translate(${x.toFixed(1)}px,${(y + 14).toFixed(1)}px)`;
      L.label.classList.toggle('hot', hovered === L);
      L.label.classList.toggle('active', slotOf(L) === active);
    }
    if (portrait) $('#carousel-name').textContent = `${active + 1} / 3`;
  }
  renderer.render(scene, camera);
}

function showFallback() {
  const f = $('#fallback'); f.hidden = false;
  f.querySelector('.fallback-cards').innerHTML = SITES.map((s) => `<a href="${s.url}">${s.name}<br><small>${s.kind}</small></a>`).join('');
  $('#loader').classList.add('done');
}

computeDesk();
camera.position.copy(desk.pos); camera.quaternion.copy(desk.quat);
renderer.compile(scene, camera);
tick();
if (new URLSearchParams(location.search).has('og')) document.body.classList.add('og');
const begin = () => {
  $('#loader').classList.add('done'); introT = 0;
  if (new URLSearchParams(location.search).has('skip')) {
    introT = 9;
    laptops.forEach((L) => { const s = slotOf(L); L.pos.set(SLOT_X[s], 0, SLOT_Z[s]); L.tpos.copy(L.pos); L.rotY = L.trotY = SLOT_R[s]; L.lid = L.lidTarget = OPEN; });
    spots.forEach((s) => { s.power = s.target = 1; });
  }
};
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve()).then(() => setTimeout(begin, 350));
window.__showroom = { laptops, enter, exit, get mode() { return mode; } };
const pressOf = () => press;
