import * as THREE from './vendor/three.module.js';

/* =====================================================================
   APEX RIDER GP — prototype jouable (Three.js)
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const rad = d => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const G = 9.81;
let seed = 20240611;
const srand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + Math.random() * (b - a);

/* ---------------------------------------------------------------- données */
const PARTS = {
  engine: [
    { n: 'Bloc d’origine · 200 ch', hp: 0, cost: 0, d: 'Fiable, sans surprise.' },
    { n: 'Sport · 225 ch', hp: 25, cost: 2500, d: 'Cartographie sport, + vitesse de pointe.' },
    { n: 'Course · 245 ch', hp: 45, cost: 6500, d: 'Bloc usine, le sommet de la gamme.' },
  ],
  exhaust: [
    { n: 'Ligne d’origine', hp: 0, acc: 0, cost: 0, d: 'Silencieux homologué.' },
    { n: 'Inox sport', hp: 6, acc: 0.04, cost: 1200, d: '+ accélération et + vitesse de pointe.' },
    { n: 'Titane racing', hp: 12, acc: 0.08, cost: 3200, d: 'Collecteur libre, gain maximal.' },
  ],
  suspension: [
    { n: 'Suspension d’origine', stab: 0, cost: 0, d: 'Confortable, flotte à l’angle.' },
    { n: 'Réglable', stab: 0.5, cost: 1800, d: '+ stabilité à l’inclinaison max.' },
    { n: 'Bras oscillant racing', stab: 1, cost: 4200, d: 'Stabilité maximale, angle max + 4°.' },
  ],
  brakes: [
    { n: 'Disques acier', f: 1.0, fade: 1.0, cost: 0, d: 'Fading marqué en fin de course.' },
    { n: 'Étriers sport', f: 1.06, fade: 0.65, cost: 1500, d: 'Meilleur mordant, moins de fading.' },
    { n: 'Freins carbone', f: 1.12, fade: 0.22, cost: 4000, d: 'Endurance thermique supérieure.' },
  ],
};
const TYRES = [
  { n: 'Tendre', dry: 1.08, wet: 0.7, wear: 1.6, heat: 1.15, col: '#ff3b3b', d: 'Adhérence max, s’use vite.' },
  { n: 'Medium', dry: 1.0, wet: 0.66, wear: 1.0, heat: 1.0, col: '#ffd23b', d: 'Le compromis.' },
  { n: 'Dur', dry: 0.95, wet: 0.62, wear: 0.6, heat: 0.85, col: '#f2f2f2', d: 'Endurant, chauffe lentement.' },
  { n: 'Pluie', dry: 0.84, wet: 1.0, wear: 1.3, heat: 1.0, col: '#2aa8ff', d: 'Indispensable sur piste détrempée.' },
];
const FINISHES = {
  carbon: { n: 'Fibre de carbone', met: 0.35, rough: 0.35 },
  gloss: { n: 'Brillante', met: 0.25, rough: 0.12 },
  matte: { n: 'Mate', met: 0.0, rough: 0.85 },
  chrome: { n: 'Chrome', met: 1.0, rough: 0.1 },
  pearl: { n: 'Nacré', met: 0.6, rough: 0.28 },
};
const SPONSORS = [
  { n: 'NEXUS', pay: 400, need: 12, scale: 0.7 },
  { n: 'AURA', pay: 250, need: 12, scale: 0.65 },
  { n: 'ENERGY FUEL', pay: 600, need: 10, scale: 0.8 },
  { n: 'QUANTUM', pay: 900, need: 6, scale: 0.95 },
  { n: 'CYBERNETICS', pay: 1400, need: 3, scale: 1.1 },
];
const STRIPES = ['Aucun', 'Pré-défini', 'Géométrique', 'Classique', 'Moderne'];
const PALETTE = ['#0f1218', '#1b1f2a', '#f2f4f8', '#d92b2b', '#ff7a1a', '#ffd23b', '#37e07a', '#19d3ff', '#2f6bff', '#8a4dff', '#ff3bb0', '#7d8794'];
const CLASSES = [
  { n: '300cc', v: 0.74, a: 0.72, ai: 0.88, pay: 1.0 },
  { n: '600cc', v: 0.88, a: 0.86, ai: 0.94, pay: 1.7 },
  { n: '1000cc Apex GP', v: 1.0, a: 1.0, ai: 1.0, pay: 2.6 },
];
const SKILLS = [
  { id: 'agi', n: 'Agilité', d: 'Bascule plus vite dans les chicanes.' },
  { id: 'tyre', n: 'Gestion des pneus', d: 'Réduit l’usure de la gomme.' },
  { id: 'brake', n: 'Freinage tardif', d: 'Plus de stabilité aux freinages extrêmes.' },
  { id: 'res', n: 'Résistance', d: 'Moins de risque de chute au contact.' },
];
const PRIZES = [1500, 1100, 850, 650, 500, 400, 300, 250, 200, 150, 100, 50];
const AI_NAMES = ['M. Hale', 'F. Okoro', 'B. Lindqvist', 'G. Moretti', 'L. Bahia', 'K. Tanaka', 'S. Novak', 'R. Duarte', 'A. Petrov', 'J. Whitlock', 'T. Abara'];
const ASSIST = [0.78, 0.55, 0.32, 0.1];

/* ---------------------------------------------------------------- portail CrazyGames (SDK v3, optionnel) */
let cgOn = false, gpOn = false;
const CGS = () => (window.CrazyGames && window.CrazyGames.SDK) || null;
(function cgInit() {
  try { const s = CGS(); if (s && s.init) s.init().then(() => { cgOn = true; }).catch(() => {}); } catch (e) { /* hors CrazyGames */ }
})();
// gameplayStart / gameplayStop : appelés uniquement quand l'état change réellement
function gp(on) {
  if (gpOn === on) return; gpOn = on;
  try { const s = CGS(); if (cgOn && s && s.game) on ? s.game.gameplayStart() : s.game.gameplayStop(); } catch (e) { /* ignore */ }
}

/* ---------------------------------------------------------------- sauvegarde */
const KEY = 'apexRiderGP.v3';
const DEFAULT = {
  credits: 4000, xp: 2, skills: { agi: 0, tyre: 0, brake: 0, res: 0 }, races: 0, wins: 0, podiums: 0, cls: 0, unlocked: 1,
  bestLap: null, board: [],
  bike: { main: '#d92b2b', accent: '#2f6bff', neon: '#19d3ff', finish: 'gloss', number: '88', sponsor: 0, stripes: 0, engine: 0, exhaust: 0, suspension: 0, brakes: 0, tyre: 1 },
  owned: { engine: [0], exhaust: [0], suspension: [0], brakes: [0] },
  settings: { weather: 'dynamic', laps: 3, assist: 1, volume: 0.6 },
};
function merge(t, s) {
  for (const k in s) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) t[k] = merge(t[k] && typeof t[k] === 'object' ? t[k] : {}, s[k]);
    else t[k] = s[k];
  }
  return t;
}
let save = JSON.parse(JSON.stringify(DEFAULT));
try { const raw = localStorage.getItem(KEY); if (raw) merge(save, JSON.parse(raw)); } catch (e) { /* stockage indisponible */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

/* ---------------------------------------------------------------- rendu */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const raceScene = new THREE.Scene();
const garScene = new THREE.Scene();
const raceCam = new THREE.PerspectiveCamera(65, 1, 0.3, 4000);
const garCam = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  raceCam.aspect = garCam.aspect = w / h;
  raceCam.updateProjectionMatrix(); garCam.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* ---------------------------------------------------------------- textures utilitaires */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function neonGlyph(k, col, w = 512, h = 160) {
  const [c, x] = cv(w, h);
  x.fillStyle = '#05070d'; x.fillRect(0, 0, w, h);
  x.strokeStyle = col; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
  x.shadowColor = col; x.shadowBlur = 24; x.lineWidth = 12; x.lineJoin = 'round'; x.lineCap = 'round';
  const cx = w / 2, cy = h / 2, s = h * 0.28;
  for (let pass = 0; pass < 2; pass++) {
    x.strokeStyle = pass ? '#fff' : col; x.lineWidth = pass ? 4 : 12; x.beginPath();
    switch (k % 6) {
      case 0: for (let i = -1; i <= 1; i++) { x.moveTo(cx + i * 70 - 28, cy - s); x.lineTo(cx + i * 70 + 12, cy); x.lineTo(cx + i * 70 - 28, cy + s); } break;
      case 1: x.arc(cx, cy, s, 0, TAU); x.moveTo(cx + 8, cy - s * 0.7); x.lineTo(cx - 14, cy + 4); x.lineTo(cx + 12, cy + 4); x.lineTo(cx - 8, cy + s * 0.7); break;
      case 2: x.moveTo(cx, cy - s); x.lineTo(cx + s * 1.1, cy + s * 0.8); x.lineTo(cx - s * 1.1, cy + s * 0.8); x.closePath(); break;
      case 3: x.moveTo(cx, cy - s); x.lineTo(cx + s * 1.3, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s * 1.3, cy); x.closePath(); break;
      case 4: for (let i = 0; i < 6; i++) { const a = i * TAU / 6; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * s * 1.2, cy + Math.sin(a) * s * 1.2); } x.closePath(); break;
      default: for (let i = -2; i <= 2; i++) { x.moveTo(cx + i * 50 - 16, cy + s); x.lineTo(cx + i * 50 + 16, cy - s); } break;
    }
    x.stroke();
  }
  return tex(c);
}

/* ================================================================ CIRCUIT */
const CP = [[0, 0], [140, -20], [300, 10], [420, 100], [400, 230], [300, 300], [170, 280], [110, 200], [10, 180], [-110, 230], [-250, 190], [-290, 80], [-210, -20], [-100, -70]]
  .map(([x, z]) => new THREE.Vector3(x * 1.55, 0, z * 1.55));
const curve = new THREE.CatmullRomCurve3(CP, true, 'centripetal');
const TL = curve.getLength();
const N = Math.round(TL / 3.2);
const DS = TL / N;
const W = 16; // largeur de piste
const pts = curve.getSpacedPoints(N);
const px = new Float32Array(N), pz = new Float32Array(N), tx = new Float32Array(N), tz = new Float32Array(N);
let kap = new Float32Array(N);
for (let i = 0; i < N; i++) { px[i] = pts[i].x; pz[i] = pts[i].z; }
for (let i = 0; i < N; i++) {
  const a = (i - 1 + N) % N, b = (i + 1) % N;
  const dx = px[b] - px[a], dz = pz[b] - pz[a], l = Math.hypot(dx, dz);
  tx[i] = dx / l; tz[i] = dz / l;
}
function smoothArr(arr, w) {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) { let s = 0; for (let k = -w; k <= w; k++) s += arr[(i + k + N * 4) % N]; out[i] = s / (2 * w + 1); }
  return out;
}
for (let i = 0; i < N; i++) {
  const j = (i + 1) % N;
  const cr = tz[i] * tx[j] - tx[i] * tz[j];
  kap[i] = Math.asin(clamp(cr, -1, 1)) / DS;
}
kap = smoothArr(kap, 3);
const kapWide = smoothArr(kap, 8);
const _at = { x: 0, z: 0, tx: 0, tz: 0, nx: 0, nz: 0, k: 0, i: 0 };
function at(s, o = _at) {
  s = ((s % TL) + TL) % TL;
  const f = s / DS, i0 = Math.floor(f), u = f - i0, i = i0 % N, j = (i + 1) % N;
  o.x = lerp(px[i], px[j], u); o.z = lerp(pz[i], pz[j], u);
  const a = lerp(tx[i], tx[j], u), b = lerp(tz[i], tz[j], u), l = Math.hypot(a, b) || 1;
  o.tx = a / l; o.tz = b / l; o.nx = o.tz; o.nz = -o.tx; // normale gauche
  o.k = lerp(kap[i], kap[j], u); o.i = i;
  return o;
}
// zone des stands (voie à gauche de la ligne de départ)
const iPitA = Math.floor((TL - 330) / DS), iPitB = Math.floor(260 / DS);
const inPit = i => i >= iPitA || i <= iPitB;
const PIT_D = W / 2 + 5.75;
const PIT_BOX_S = 30; // arrêt à 30 m après la ligne

// profil de vitesse des pilotes IA
const vProf = new Float32Array(N);
(function buildProfile() {
  for (let i = 0; i < N; i++) vProf[i] = Math.min(86, Math.sqrt((1.38 * G) / Math.max(Math.abs(kapWide[i]), 0.0006)));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = N * 2 - 1; i >= 0; i--) { const a = i % N, b = (i + 1) % N; vProf[a] = Math.min(vProf[a], Math.sqrt(vProf[b] * vProf[b] + 2 * 12 * DS)); }
    for (let i = 0; i < N * 2; i++) { const a = i % N, b = (i + 1) % N; vProf[b] = Math.min(vProf[b], Math.sqrt(vProf[a] * vProf[a] + 2 * 9 * DS)); }
  }
})();

/* ---------------------------------------------------------------- monde de course */
const world = {};
function buildWorld() {
  const sc = raceScene;
  sc.fog = new THREE.FogExp2(0x080c18, 0.0042);
  sc.add(new THREE.HemisphereLight(0x6f8cd8, 0x1a0f2a, 0.75));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.8); moon.position.set(-300, 400, 200); sc.add(moon);

  // ciel
  const [sk, sx] = cv(8, 256);
  const gr = sx.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#03050c'); gr.addColorStop(0.55, '#10142e'); gr.addColorStop(0.85, '#3a1a52'); gr.addColorStop(1, '#6a2a6a');
  sx.fillStyle = gr; sx.fillRect(0, 0, 8, 256);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 24, 16), new THREE.MeshBasicMaterial({ map: tex(sk), side: THREE.BackSide, fog: false, depthWrite: false }));
  sc.add(sky); world.sky = sky;

  // sol
  const [gc, gx] = cv(256, 256);
  gx.fillStyle = '#0a0e17'; gx.fillRect(0, 0, 256, 256); gx.strokeStyle = 'rgba(40,90,160,.35)'; gx.lineWidth = 2;
  gx.strokeRect(0, 0, 256, 256);
  const gt = tex(gc, true); gt.repeat.set(120, 120);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.9, metalness: 0.1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06; sc.add(ground);

  // piste (asphalte)
  const [ac, ax] = cv(256, 256);
  ax.fillStyle = '#2b2f38'; ax.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { const g = 30 + Math.random() * 28; ax.fillStyle = `rgb(${g},${g + 2},${g + 8})`; ax.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  ax.fillStyle = 'rgba(255,255,255,.55)'; ax.fillRect(6, 0, 4, 256); ax.fillRect(246, 0, 4, 256);
  ax.fillStyle = 'rgba(255,255,255,.28)'; ax.fillRect(126, 0, 4, 128);
  const at_ = tex(ac, true);
  world.roadMat = new THREE.MeshStandardMaterial({ map: at_, roughness: 0.9, metalness: 0.05 });

  function strip(lo, hi, y, mat, o = {}) {
    const list = o.list || Array.from({ length: N }, (_, i) => i);
    const pos = [], nor = [], uv = [], col = [], idx = [];
    let v = 0, q = 0;
    for (const a of list) {
      const b = (a + 1) % N;
      const vs = [[a, lo], [a, hi], [b, lo], [b, hi]];
      vs.forEach(([i, off], k) => {
        pos.push(px[i] + tz[i] * off, y, pz[i] - tx[i] * off); nor.push(0, 1, 0);
        uv.push(k % 2, (v + (k >= 2 ? DS : 0)) / 8);
      });
      const c = o.colorFn ? o.colorFn(a) : [1, 1, 1];
      for (let k = 0; k < 4; k++) col.push(...c);
      idx.push(q, q + 2, q + 1, q + 2, q + 3, q + 1); q += 4; v += DS;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, mat); sc.add(m); return m;
  }
  strip(-W / 2, W / 2, 0, world.roadMat);

  // trajectoire séchante : bande plus claire / accrochante, visible sous la pluie
  world.lineMat = new THREE.MeshBasicMaterial({ color: 0x9aa4b8, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  strip(-1.7, 1.7, 0.01, world.lineMat);

  const neonL = new THREE.MeshBasicMaterial({ color: 0x19d3ff, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const neonR = new THREE.MeshBasicMaterial({ color: 0xff7a1a, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  strip(W / 2 - 0.55, W / 2 - 0.2, 0.02, neonL);
  strip(-W / 2 + 0.2, -W / 2 + 0.55, 0.02, neonR);
  const kerbMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const kc = i => ((i >> 1) & 1 ? [0.85, 0.12, 0.14] : [0.92, 0.92, 0.95]);
  strip(-W / 2 - 1.3, -W / 2, 0.015, kerbMat, { colorFn: kc });
  const notPit = Array.from({ length: N }, (_, i) => i).filter(i => !inPit(i));
  strip(W / 2, W / 2 + 1.3, 0.015, kerbMat, { colorFn: kc, list: notPit });

  // voie des stands
  const pitList = Array.from({ length: N }, (_, i) => i).filter(inPit);
  strip(W / 2 + 2.5, W / 2 + 9, 0.005, new THREE.MeshStandardMaterial({ color: 0x343a48, roughness: 0.8 }), { list: pitList });
  strip(W / 2 + 2.5, W / 2 + 2.9, 0.02, new THREE.MeshBasicMaterial({ color: 0xffd23b, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), { list: pitList });

  // ligne de départ
  const [lc, lx] = cv(128, 32);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { lx.fillStyle = (i + j) % 2 ? '#fff' : '#111'; lx.fillRect(i * 8, j * 8, 8, 8); }
  const line = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.4), new THREE.MeshBasicMaterial({ map: tex(lc), polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  line.rotation.x = -Math.PI / 2;
  const s0 = at(0, {}); line.position.set(s0.x, 0.03, s0.z);
  line.rotation.set(-Math.PI / 2, 0, 0); line.rotation.order = 'YXZ'; line.rotation.y = Math.atan2(s0.tx, s0.tz);
  sc.add(line);

  // barrières
  const wallGeo = new THREE.BoxGeometry(0.4, 1.1, 1);
  const wallMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 });
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, N * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), vv = new THREE.Vector3(), ss = new THREE.Vector3(), cc = new THREE.Color();
  let wi = 0;
  for (let i = 0; i < N; i += 1) {
    for (const side of [1, -1]) {
      const off = side * (side === 1 && inPit(i) ? W / 2 + 11 : W / 2 + 5.5);
      vv.set(px[i] + tz[i] * off, 0.55, pz[i] - tx[i] * off);
      q.setFromEuler(new THREE.Euler(0, Math.atan2(-tx[i], -tz[i]), 0));
      ss.set(1, 1, DS + 0.1);
      m4.compose(vv, q, ss); walls.setMatrixAt(wi, m4);
      cc.set(((i >> 2) & 1) ? '#d62a35' : '#e8ecf4'); walls.setColorAt(wi, cc); wi++;
    }
  }
  walls.count = wi; sc.add(walls);

  // lampadaires + panneaux néon
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.16, 9, 6); lampGeo.translate(0, 4.5, 0);
  const headGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x20242e }), 160);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xcfe6ff, toneMapped: false }), 160);
  let li = 0;
  for (let i = 0; i < N; i += 12) for (const side of [1, -1]) {
    const off = side * (W / 2 + (side === 1 && inPit(i) ? 13 : 8));
    vv.set(px[i] + tz[i] * off, 0, pz[i] - tx[i] * off); q.identity(); ss.set(1, 1, 1);
    m4.compose(vv, q, ss); lamps.setMatrixAt(li, m4);
    vv.y = 9.3; m4.compose(vv, q, ss); heads.setMatrixAt(li, m4); li++;
  }
  lamps.count = heads.count = li; sc.add(lamps, heads);

    const cols = ['#19d3ff', '#ff3bb0', '#ff7a1a', '#37e07a', '#8a4dff', '#ffd23b'];
  for (let k = 0; k < 26; k++) {
    const i = Math.floor((k / 26) * N + 6) % N, side = k % 2 ? 1 : -1;
    const s = at(i * DS, {});
    const off = side * (W / 2 + 20 + srand() * 8);
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(22, 7), new THREE.MeshBasicMaterial({ map: neonGlyph(k, cols[k % cols.length], 512, 160), toneMapped: false, side: THREE.DoubleSide }));
    bb.position.set(s.x + s.nx * off, 11 + srand() * 5, s.z + s.nz * off);
    bb.rotation.y = Math.atan2(s.nx * -side, s.nz * -side);
    sc.add(bb);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, bb.position.y, 0.6), new THREE.MeshStandardMaterial({ color: 0x151922 }));
    post.position.set(bb.position.x, bb.position.y / 2 - 2, bb.position.z); sc.add(post);
  }

  // portiques
  const gateMat = new THREE.MeshBasicMaterial({ color: 0x19d3ff, toneMapped: false });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x12151d, roughness: 0.6, metalness: 0.5 });
  for (let k = 0; k < 7; k++) {
    const s = at((k / 7) * TL, {});
    const g = new THREE.Group();
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9, 0.7), darkMat); p.position.set(sd * (W / 2 + 3), 4.5, 0); g.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(W + 6.7, 0.7, 0.7), k === 0 ? new THREE.MeshBasicMaterial({ map: (() => { const [cc, cx] = cv(1024, 128); for (let i = 0; i < 64; i++) for (let j = 0; j < 8; j++) { cx.fillStyle = (i + j) % 2 ? '#ff7a1a' : '#10131c'; cx.fillRect(i * 16, j * 16, 16, 16); } return tex(cc); })(), toneMapped: false }) : gateMat);
    bar.position.y = 9; if (k === 0) { bar.geometry = new THREE.BoxGeometry(W + 6.7, 2.4, 0.7); bar.position.y = 9.5; }
    g.add(bar);
    g.position.set(s.x, 0, s.z); g.rotation.y = Math.atan2(s.tx, s.tz) + Math.PI / 2 - Math.PI / 2;
    // l'axe local x du groupe doit suivre la normale de piste
    g.rotation.y = Math.atan2(s.tz, -s.tx) ;
    g.rotation.y = Math.atan2(s.tx, s.tz);
    sc.add(g);
  }

  // tribunes à l’avant du départ
  const [cc2, cx2] = cv(256, 64);
  cx2.fillStyle = '#10141e'; cx2.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 900; i++) { cx2.fillStyle = `hsl(${Math.random() * 360},70%,${40 + Math.random() * 30}%)`; cx2.fillRect(Math.random() * 256, Math.random() * 64, 3, 3); }
  const stand = new THREE.MeshStandardMaterial({ map: tex(cc2), roughness: 0.8, emissive: 0x111111 });
  const sA = at(60, {});
  const gs = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 140), stand);
  gs.position.set(sA.x - sA.nx * (W / 2 + 18), 4.5, sA.z - sA.nz * (W / 2 + 18));
  gs.rotation.y = Math.atan2(-sA.tx, -sA.tz); sc.add(gs);

  // stands : boxes d’équipe
  const sB = at(0, {});
  for (let k = 0; k < 9; k++) {
    const s = at(15 + k * 18, {});
    const bx = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 12), new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.6, emissive: new THREE.Color(cols[k % cols.length]).multiplyScalar(0.18) }));
    bx.position.set(s.x + s.nx * (W / 2 + 16), 2.5, s.z + s.nz * (W / 2 + 16));
    bx.rotation.y = Math.atan2(-s.tx, -s.tz); sc.add(bx);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[k % cols.length]), toneMapped: false }));
    door.position.set(s.x + s.nx * (W / 2 + 9.9), 2.2, s.z + s.nz * (W / 2 + 9.9));
    door.rotation.y = Math.atan2(-s.nx * -1, -s.nz * -1) + Math.PI; sc.add(door);
  }

  // ville
  const [wc, wx] = cv(128, 256);
  wx.fillStyle = '#000'; wx.fillRect(0, 0, 128, 256);
  for (let y = 4; y < 252; y += 10) for (let x = 4; x < 124; x += 9) if (Math.random() < 0.55) {
    wx.fillStyle = ['#ffd48a', '#7ee8ff', '#ff8be0', '#fff1c8'][Math.floor(Math.random() * 4)];
    wx.globalAlpha = 0.4 + Math.random() * 0.6; wx.fillRect(x, y, 5, 6);
  }
  const winTex = tex(wc, true);
  const bMat = new THREE.MeshStandardMaterial({ color: 0x0e121c, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.1, roughness: 0.7, map: null });
  const variants = [];
  for (let v = 0; v < 5; v++) {
    const w = 18 + v * 6, h = 50 + v * 38, d = 18 + ((v * 7) % 5) * 5;
    const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
    const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * w / 14, uvA.getY(i) * h / 14);
    variants.push({ g, list: [] });
  }
  const cen = new THREE.Vector3(); for (const p of CP) cen.add(p); cen.divideScalar(CP.length);
  let tries = 0;
  while (tries++ < 3000 && variants.reduce((a, b) => a + b.list.length, 0) < 380) {
    const x = cen.x + (srand() - 0.5) * 2600, z = cen.z + (srand() - 0.5) * 2200;
    let md = 1e9; for (let i = 0; i < N; i += 4) md = Math.min(md, Math.hypot(px[i] - x, pz[i] - z));
    if (md < 55) continue;
    variants[Math.floor(srand() * 5)].list.push([x, z, srand() * TAU]);
  }
  for (const v of variants) {
    const im = new THREE.InstancedMesh(v.g, bMat, v.list.length);
    v.list.forEach(([x, z, r], i) => { vv.set(x, 0, z); q.setFromEuler(new THREE.Euler(0, r, 0)); ss.set(1, 1, 1); m4.compose(vv, q, ss); im.setMatrixAt(i, m4); });
    sc.add(im);
  }

  // éclairages dynamiques liés à la moto
  world.spot = new THREE.SpotLight(0xdff2ff, 90, 120, 0.5, 0.6, 1.2); sc.add(world.spot, world.spot.target);
  world.pc = new THREE.PointLight(0x19d3ff, 40, 40, 1.6); world.po = new THREE.PointLight(0xff7a1a, 30, 40, 1.6); sc.add(world.pc, world.po);

  // pluie
  const RN = 2600; world.rn = RN;
  world.rainPos = new Float32Array(RN * 6);
  for (let i = 0; i < RN; i++) { world.rainPos[i * 6] = (Math.random() - 0.5) * 120; world.rainPos[i * 6 + 1] = Math.random() * 40; world.rainPos[i * 6 + 2] = (Math.random() - 0.5) * 120; }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RN * 6), 3));
  world.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xa8c8ff, transparent: true, opacity: 0.4, fog: false }));
  world.rain.frustumCulled = false; sc.add(world.rain);
  // équipe du stand
  world.crew = [];
  for (let k = 0; k < 4; k++) {
    const gp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0xd92b2b, roughness: 0.6 }));
    body.position.y = 0.85; const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf0d0b0 })); head.position.y = 1.7;
    gp.add(body, head); sc.add(gp); world.crew.push(gp);
  }
  // minimap hors-écran
  const [mc, mx] = cv(230, 160);
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  for (let i = 0; i < N; i++) { minx = Math.min(minx, px[i]); maxx = Math.max(maxx, px[i]); minz = Math.min(minz, pz[i]); maxz = Math.max(maxz, pz[i]); }
  const sc2 = Math.min(190 / (maxx - minx), 110 / (maxz - minz));
  world.mapT = (x, z) => [115 + (x - (minx + maxx) / 2) * sc2, 88 + (z - (minz + maxz) / 2) * sc2];
  mx.strokeStyle = '#d6e6ff'; mx.lineWidth = 5; mx.lineJoin = 'round'; mx.beginPath();
  for (let i = 0; i <= N; i += 3) { const [a, b] = world.mapT(px[i % N], pz[i % N]); i ? mx.lineTo(a, b) : mx.moveTo(a, b); }
  mx.closePath(); mx.stroke();
  mx.strokeStyle = '#2a3a58'; mx.lineWidth = 2; mx.stroke();
  world.mapCanvas = mc;
}

/* ================================================================ MOTO */
// La moto et le pilote viennent de l'image fournie (assets/bike.png, vue de dos détourée) : aucun modèle généré.
const bikeImg = new Image(); bikeImg.src = 'assets/bike.png';
let BASE = null;
function prepBase() {
  const [c, x] = cv(bikeImg.naturalWidth, bikeImg.naturalHeight); x.drawImage(bikeImg, 0, 0);
  BASE = { w: c.width, h: c.height, img: x.getImageData(0, 0, c.width, c.height) };
}
function toHsl(hex) {
  const c = new THREE.Color(hex), o = {}; c.getHSL(o); return { h: o.h * 360, s: o.s, l: o.l };
}
const liveryCache = new Map();
// recolore les zones rouges (couleur principale) et bleues (accent) de l'image
function livery(cfg, flip) {
  const key = `${cfg.main}|${cfg.accent}|${flip ? 1 : 0}`;
  if (liveryCache.has(key)) return liveryCache.get(key);
  const hm = toHsl(cfg.main), ha = toHsl(cfg.accent);
  const src = BASE.img.data, out = new Uint8ClampedArray(src.length), col = new THREE.Color(), hs = {};
  for (let i = 0; i < src.length; i += 4) {
    out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2]; out[i + 3] = src[i + 3];
    if (!src[i + 3]) continue;
    col.setRGB(src[i] / 255, src[i + 1] / 255, src[i + 2] / 255, THREE.SRGBColorSpace); col.getHSL(hs, THREE.SRGBColorSpace);
    let h = hs.h * 360, s = hs.s, l = hs.l, tgt = null;
    if (s > 0.3 && l > 0.1 && l < 0.88) { if (h < 22 || h > 338) tgt = hm; else if (h > 195 && h < 265) tgt = ha; }
    if (!tgt) continue;
    if (tgt.s < 0.15) { s *= tgt.s * 3; l = clamp(l + (tgt.l - 0.45) * 0.7, 0, 1); }
    else { h = tgt.h; s = Math.min(1, s * Math.max(0.6, tgt.s / 0.75)); l = clamp(l + (tgt.l - 0.5) * 0.35, 0, 1); }
    col.setHSL(h / 360, s, l, THREE.SRGBColorSpace);
    const rgb = col.getRGB({}, THREE.SRGBColorSpace);
    out[i] = rgb.r * 255; out[i + 1] = rgb.g * 255; out[i + 2] = rgb.b * 255;
  }
  const [c, x] = cv(BASE.w, BASE.h);
  const id = new ImageData(out, BASE.w, BASE.h);
  if (flip) { const [t, tx] = cv(BASE.w, BASE.h); tx.putImageData(id, 0, 0); x.translate(BASE.w, 0); x.scale(-1, 1); x.drawImage(t, 0, 0); } else x.putImageData(id, 0, 0);
  const t = tex(c); liveryCache.set(key, t); return t;
}
function makeBike(cfg, flip = false) {
  const g = new THREE.Group(), lean = new THREE.Group(); g.add(lean);
  const w = 1.35, h = w * (BASE.h / BASE.w);
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.06, side: THREE.DoubleSide, color: 0xdde3f5 });
  const mesh = new THREE.Mesh(geo, mat); lean.add(mesh);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(0.36, 0.7, 1); g.add(sh);
  const b = { group: g, lean, wheels: [], rider: new THREE.Group(), M: { paint: new THREE.MeshStandardMaterial({ color: cfg.main }) }, helmet: null, cfg, mat, flip };
  lean.add(b.rider);
  applyLivery(b, cfg);
  return b;
}
function applyLivery(b, cfg) {
  b.cfg = cfg; b.mat.map = livery(cfg, b.flip); b.mat.needsUpdate = true; b.M.paint.color.set(cfg.main);
}
// les motos sont toujours vues de dos : le sprite se tourne vers la caméra
function faceCam(b, cam) {
  const p = b.group.position; b.group.rotation.y = Math.atan2(cam.x - p.x, cam.z - p.z);
}

/* ================================================================ GARAGE (scène) */
const gar = { ang: 0, dist: 4.2, h: 1.1, drag: false, bike: null };
function buildGarage() {
  const sc = garScene;
  sc.background = new THREE.Color(0x05070c); sc.fog = new THREE.Fog(0x05070c, 10, 34);
  sc.add(new THREE.HemisphereLight(0x5b78c8, 0x10121a, 0.6));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x151922, roughness: 0.45, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2; sc.add(floor);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 0.5), new THREE.MeshStandardMaterial({ color: 0x0d1018, roughness: 0.8 }));
  wall.position.set(0, 7, -12); sc.add(wall);
  const neonC = new THREE.MeshBasicMaterial({ color: 0x19d3ff, toneMapped: false });
  const neonB = new THREE.MeshBasicMaterial({ color: 0x3a6bff, toneMapped: false });
  for (let k = -2; k <= 2; k++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 0.12), k % 2 ? neonC : neonB); s.position.set(k * 7, 9, -4 + k * 0.01); sc.add(s);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, 0.12), neonC); s2.position.set(k * 7 + 3.5, 3, -11.6); sc.add(s2);
  }
  for (let k = 0; k < 4; k++) {
    const bx = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 1), new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.4, metalness: 0.5 }));
    bx.position.set(-7 + k * 2.1, 0.8, -9); sc.add(bx);
  }
  const mat = new THREE.Mesh(new THREE.BoxGeometry(7, 0.05, 3.2), new THREE.MeshStandardMaterial({ color: 0x0a0c11, roughness: 0.9 }));
  mat.position.y = 0.025; sc.add(mat);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.03, 0.05), neonC); rim.position.set(0, 0.06, 1.62); sc.add(rim);
  const k1 = new THREE.SpotLight(0xffffff, 140, 30, 0.5, 0.6, 1.2); k1.position.set(4, 8, 5); k1.target.position.set(0, 0.5, 0); sc.add(k1, k1.target);
  const k2 = new THREE.PointLight(0x19d3ff, 60, 18, 1.5); k2.position.set(-4, 2, 2); sc.add(k2);
  const k3 = new THREE.PointLight(0xff7a1a, 40, 18, 1.5); k3.position.set(4, 2, -3); sc.add(k3);
  gar.bike = makeBike(save.bike); sc.add(gar.bike.group);
  gar.bike.group.position.set(0, 0.05, 0.3);
}

/* ================================================================ STATS */
function bikeStats(b = save.bike) {
  const e = PARTS.engine[b.engine], x = PARTS.exhaust[b.exhaust], s = PARTS.suspension[b.suspension], br = PARTS.brakes[b.brakes], c = CLASSES[save.cls];
  const hp = 200 + e.hp + x.hp;
  const vmax = (78 + (hp - 200) * 0.17) * c.v;
  const accel = (9 + (hp - 200) * 0.06 + x.acc * 10) * c.a;
  return { hp, vmax, accel, brake: br.f, fade: br.fade, stab: s.stab, cls: c, hpShown: Math.round(hp * (0.45 + 0.55 * c.v)) };
}
const dynoHp = (hp, rpm) => hp * Math.exp(-Math.pow((rpm - 11200) / 4300, 2));

/* ================================================================ ENTRÉES / AUDIO */
const keys = new Set();
const justPressed = [];
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) justPressed.push(e.code);
  if (!e.repeat && R && R.P.pit && R.P.pit.qte) qteKey(e.code); // le QTE accepte une touche déjà enfoncée
  keys.add(e.code); initAudio();
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
const pad = { steer: 0, thr: 0, bf: 0, br: 0, mass: 0, on: false };
function pollPad() {
  const gp = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find(Boolean);
  pad.on = !!gp; if (!gp) return;
  const dz = v => (Math.abs(v) < 0.12 ? 0 : v);
  pad.steer = -dz(gp.axes[0] || 0); pad.mass = -dz(gp.axes[3] || 0);
  pad.thr = gp.buttons[7] ? gp.buttons[7].value : 0; pad.bf = gp.buttons[6] ? gp.buttons[6].value : 0; pad.br = gp.buttons[0] && gp.buttons[0].pressed ? 1 : 0;
}
let audio = null;
function initAudio() {
  if (audio || !(window.AudioContext || window.webkitAudioContext)) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination); o1.start(); o2.start();
    audio = { ac, o1, o2, f, g };
  } catch (e) { audio = null; }
}
function audioUpdate(on, rpm, thr) {
  if (!audio) return;
  const t = audio.ac.currentTime, vol = save.settings.volume;
  const fr = 28 + rpm / 60 * 1.6;
  audio.o1.frequency.setTargetAtTime(fr, t, 0.05); audio.o2.frequency.setTargetAtTime(fr * 0.5, t, 0.05);
  audio.f.frequency.setTargetAtTime(500 + rpm * 0.18 + thr * 900, t, 0.08);
  audio.g.gain.setTargetAtTime(on ? vol * (0.025 + 0.05 * thr) : 0, t, 0.1);
}

/* ================================================================ COURSE */
let R = null;
const ICO = {
  rain: '<path d="M14 28a8 8 0 0 1 1-16 11 11 0 0 1 21 3 7 7 0 0 1-1 13z"/><path d="M16 36l-2 6M24 36l-2 6M32 36l-2 6"/>',
  sun: '<circle cx="24" cy="24" r="8"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/>',
  crash: '<path d="M24 5l4 10 10-5-5 10 10 4-10 4 5 10-10-5-4 10-4-10-10 5 5-10-10-4 10-4-5-10 10 5z"/>',
  wall: '<path d="M4 16h40v9H4zM4 29h40v9H4zM16 16v9M30 29v9M34 16v9"/>',
  contact: '<circle cx="17" cy="24" r="10"/><circle cx="31" cy="24" r="10"/>',
  flag: '<path d="M12 6v38"/><path d="M12 8h26l-6 9 6 9H12"/>',
  trophy: '<path d="M14 8h20v10a10 10 0 0 1-20 0zM14 12H7v3a7 7 0 0 0 7 7M34 12h7v3a7 7 0 0 1-7 7M24 28v8M16 40h16M19 36h10"/>',
  stopwatch: '<circle cx="24" cy="27" r="14"/><path d="M24 27V18M19 6h10M24 6v7M38 12l-3 3"/>',
  wrench: '<path d="M33 8a8 8 0 0 0-9 11L9 34a4 4 0 0 0 5 5l15-15a8 8 0 0 0 11-9l-5 5-5-1-1-5z"/>',
  tyre: '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="8"/><path d="M24 7v9M24 32v9M7 24h9M32 24h9"/>',
  cross: '<path d="M12 12l24 24M36 12L12 36"/>',
  check: '<path d="M10 25l9 9 19-20"/>',
  unlock: '<rect x="10" y="22" width="28" height="20" rx="3"/><path d="M16 22v-6a8 8 0 0 1 15-4"/>',
  pitin: '<path d="M6 24h26M22 12l12 12-12 12M42 8v32"/>',
  play: '<path d="M14 8l26 16-26 16z" fill="currentColor"/>',
  pause: '<path d="M16 10v28M32 10v28"/>',
  restart: '<path d="M38 20a14 14 0 1 0 2 8"/><path d="M40 8v12H28"/>',
  home: '<path d="M6 24L24 8l18 16M12 21v21h24V21"/>',
  drop: '<path d="M24 5C16 16 12 22 12 29a12 12 0 0 0 24 0c0-7-4-13-12-24z"/>',
  warn: '<path d="M24 6L5 40h38z"/><path d="M24 18v11M24 34v1"/>',
  coin: '<circle cx="24" cy="24" r="16"/><path d="M24 13v22M18 19c0-4 12-4 12 0s-12 4-12 8 12 4 12 0"/>',
  star: '<path d="M24 5l5.5 12 13 1.5-9.6 9 2.6 13L24 33l-11.5 6.5 2.6-13-9.6-9 13-1.5z"/>',
  people: '<circle cx="18" cy="16" r="6"/><circle cx="33" cy="18" r="5"/><path d="M6 40c0-9 6-13 12-13s12 4 12 13M30 29c6 0 12 3 12 11"/>',
  engine: '<path d="M8 20h4v-6h8v6h8v-6h8v6h4v14H8z"/><path d="M14 34v6h20v-6"/>',
  exhaust: '<path d="M4 28h20c8 0 8-10 0-10h-6"/><rect x="30" y="20" width="14" height="16" rx="3"/>',
  palette: '<path d="M24 5C13 5 5 13 5 23s8 19 17 19c4 0 5-3 3-6s0-6 4-6h6c5 0 8-3 8-8C43 13 35 5 24 5z"/><circle cx="14" cy="22" r="2.2"/><circle cx="22" cy="14" r="2.2"/><circle cx="32" cy="16" r="2.2"/>',
  spring: '<path d="M14 6h20M14 42h20M16 10l16 5-16 5 16 5-16 5 16 5"/>',
  disc: '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="5"/><path d="M24 9v3M24 36v3M9 24h3M36 24h3"/>',
  helmet: '<path d="M8 28a16 16 0 0 1 32 0v8a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z"/><path d="M8 28h18l8 4h6"/>',
  sticker: '<path d="M8 8h24l8 8v24H8z"/><path d="M32 8v8h8"/><path d="M16 28l5 5 9-11"/>',
  gear: '<circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="14"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/>',
  bolt: '<path d="M27 4L10 27h12l-3 17 19-25H26z"/>',
  gauge: '<path d="M8 36a16 16 0 1 1 32 0"/><path d="M24 36l8-12"/>',
  shield: '<path d="M24 5l16 6v12c0 10-7 17-16 20C15 40 8 33 8 23V11z"/>',
  plus: '<path d="M24 10v28M10 24h28"/>',
  lock: '<rect x="10" y="22" width="28" height="20" rx="3"/><path d="M16 22v-6a8 8 0 0 1 16 0v6"/>',
  back: '<path d="M30 8L14 24l16 16"/>',
  trash: '<path d="M8 12h32M18 12V7h12v5M12 12l2 30h20l2-30M20 20v16M28 20v16"/>',
  cloudsun: '<circle cx="17" cy="16" r="6"/><path d="M17 4v3M5 16h3M8 7l2 2M26 7l-2 2"/><path d="M16 40a8 8 0 0 1 1-16 11 11 0 0 1 21 3 7 7 0 0 1-1 13z"/>',
  hash: '<path d="M18 8l-4 32M34 8l-4 32M8 18h32M6 30h32"/>',
  stripes: '<path d="M8 40L22 8M20 40L34 8M32 40L44 12"/>',
  glow: '<circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="16" stroke-dasharray="3 5"/>',
  thermo: '<path d="M20 28V10a4 4 0 0 1 8 0v18a8 8 0 1 1-8 0z"/>',
  medal: '<circle cx="24" cy="30" r="11"/><path d="M16 4l6 14M32 4l-6 14M24 25v10"/>',
  spk0: '<path d="M6 19h8l10-8v26l-10-8H6z"/><path d="M32 18l12 12M44 18L32 30"/>',
  spk1: '<path d="M6 19h8l10-8v26l-10-8H6z"/><path d="M30 18a8 8 0 0 1 0 12"/>',
  spk2: '<path d="M6 19h8l10-8v26l-10-8H6z"/><path d="M30 18a8 8 0 0 1 0 12M35 13a15 15 0 0 1 0 22"/>',
  spk3: '<path d="M6 19h8l10-8v26l-10-8H6z"/><path d="M30 18a8 8 0 0 1 0 12M35 13a15 15 0 0 1 0 22M40 8a22 22 0 0 1 0 32"/>',
  s0: '<path d="M10 10l28 28M38 10L10 38"/>',
  s1: '<path d="M8 40L18 8M18 40L28 8M28 40L38 8"/>',
  s2: '<path d="M6 38l8-14 8 14zM22 38l8-14 8 14zM38 38l4-8"/>',
  s3: '<path d="M6 28h36M6 38h36"/>',
  s4: '<path d="M6 38c14 0 22-14 36-18M6 28c14 0 22-12 36-16"/>',
  bike: '<circle cx="11" cy="34" r="7"/><circle cx="37" cy="34" r="7"/><path d="M11 34l9-14h11l6 14M20 20l-3-6h-5M31 20l3-6"/>',
};
const ic = (k, s = 40) => `<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;
const dot = c => `<i class="dot" style="background:${c}"></i>`;
const toast = (kind, ms = 1800, col, extra = '') => {
  const t = $('#toast'); t.innerHTML = ic(kind, 46) + (extra ? `<span>${extra}</span>` : ''); t.style.color = col || '#fff'; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms);
};
const fmt = t => { if (t == null || !isFinite(t)) return '--:--.---'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`; };
const curTyre = () => TYRES[save.bike.tyre];

function aiLivery(i) {
  const pal = ['#d92b2b', '#2f6bff', '#37e07a', '#ffd23b', '#8a4dff', '#ff3bb0', '#f2f4f8', '#ff7a1a', '#19d3ff', '#7d8794', '#0f1218'];
  const neons = ['#ff5a3c', '#19d3ff', '#ffd23b', '#ff3bb0', '#37e07a', '#ff7a1a'];
  return { main: pal[i % pal.length], accent: pal[(i * 3 + 4) % pal.length], neon: neons[i % neons.length], finish: ['gloss', 'pearl', 'matte', 'carbon'][i % 4], number: String(10 + i * 7 % 90), sponsor: i % 5, stripes: i % 5 };
}

function disposeRace() {
  gp(false);
  if (!R) return;
  for (const a of R.ai) raceScene.remove(a.bike.group);
  if (R.pb) raceScene.remove(R.pb.group);
  if (R.ragdoll) { raceScene.remove(R.rider); }
  R.debris && R.debris.forEach(d => raceScene.remove(d.m));
  R = null;
}

function startRace(mode) {
  disposeRace(); showAd();
  const st = bikeStats();
  R = {
    mode, laps: mode === 'tt' ? Math.max(3, save.settings.laps) : save.settings.laps, t: 0, state: 'countdown', cd: 4.2, st, stage: 0,
    rain: 0, wet: 0, ai: [], debris: [], contactCd: 0, over: 0, finishT: 0, shown: false, hudT: 0,
  };
  const sw = save.settings.weather;
  R.rainTarget = () => (sw === 'wet' ? 1 : sw === 'dry' ? 0 : (P.sTotal > TL * 0.95 && P.sTotal < TL * (R.laps - 0.4) ? 1 : 0));
  if (sw === 'wet') { R.rain = 1; R.wet = 0.9; }

  const grid = mode === 'tt' ? 0 : 5;
  const P = R.P = {
    sTotal: -(6 + grid * 8.5), d: grid % 2 ? -2.4 : 2.4, vd: 0, v: 0, steer: 0, lean: 0, mass: 0, rpm: 4500, gear: 1,
    wear: [1, 1, 1, 1], temp: [0.3, 0.3, 0.3, 0.3], bt: 0, lap: 0, lapStart: 0, best: null, last: null, lapTimes: [],
    damage: 0, crash: null, dnf: false, slide: 0, pit: null, pitReq: false, nextTyre: save.bike.tyre, pos: new THREE.Vector3(), heading: 0, grass: false,
    finished: false, tyre: save.bike.tyre, throttle: 0, bf: 0, br: 0, latG: 0, maxLean: 58,
  };
  window.P = P;
  R.pb = makeBike(save.bike); raceScene.add(R.pb.group);
  R.rider = R.pb.rider;
  const slots = Array.from({ length: 12 }, (_, i) => i).filter(i => i !== grid);
  const cls = st.cls;
  if (mode !== 'tt') slots.forEach((slot, k) => {
    const bike = makeBike(aiLivery(k + 1), k % 2 === 1); raceScene.add(bike.group);
    const pace = (0.9 + srand() * 0.085) * cls.ai;
    R.ai.push({ name: AI_NAMES[k % AI_NAMES.length], bike, pace, lane: (slot % 2 ? -1 : 1) * (1.8 + (slot % 3) * 1.4) , sTotal: -(6 + slot * 8.5), d: (slot % 2 ? -2.4 : 2.4), v: 0, ph: srand() * TAU, finT: null, vtop: 80 + srand() * 6, lap: 0 });
  });
  R.t0 = 0;
  setScreen('hud');
  $('#hBoard').style.display = mode === 'tt' ? 'none' : '';
  $('#countdown').classList.remove('hidden'); $('#pit').classList.add('hidden');
  buildCrew();
}
function buildCrew() {
  const s = at(PIT_BOX_S, {});
  R.crewPos = [[-1.9, 1.6], [-1.9, -1.6], [1.9, 1.6], [1.9, -1.6]];
  R.boxS = PIT_BOX_S;
  world.crew.forEach((c, k) => {
    c.visible = true;
    const [ds, dl] = R.crewPos[k];
    const q = at(PIT_BOX_S + ds, {});
    const dd = PIT_D + dl * 0.9;
    c.position.set(q.x + q.nx * (PIT_D + (k % 2 ? -1 : 1) * 1.7), 0, q.z + q.nz * (PIT_D + (k % 2 ? -1 : 1) * 1.7));
    c.userData.base = c.position.clone();
  });
}

// --- physique du joueur
function stepPlayer(dt, inp) {
  const P = R.P, st = R.st, cfg = save.bike, comp = TYRES[P.tyre];
  const tr = at(P.sTotal);
  const w = R.wet;
  // trajectoire séchante : sous la pluie, la ligne de course reste plus adhérente
  const lineD = Math.abs(P.d);
  const dry = Math.exp(-(lineD * lineD) / (2 * 2.2 * 2.2));
  const wLocal = w * (1 - 0.55 * dry);
  let grip = lerp(comp.dry, comp.wet, wLocal);
  const T = P.temp.reduce((a, b) => a + b, 0) / 4, wm = P.wear.reduce((a, b) => a + b, 0) / 4;
  const tf = clamp(1 - 1.4 * Math.max(0, Math.abs(T - 0.58) - 0.14), 0.6, 1);
  const wf = 0.7 + 0.3 * clamp(wm / 0.5, 0, 1);
  const dmgF = 1 - 0.18 * P.damage;
  let mu = 1.55 * grip * tf * wf;
  const onGrass = Math.abs(P.d) > W / 2 + 0.6 && !(inPit(tr.i) && P.d > 0 && P.d < W / 2 + 10);
  if (onGrass) mu *= 0.45;
  P.grass = onGrass;
  const agi = save.skills.agi, tyreLvl = save.skills.tyre, brkLvl = save.skills.brake, resLvl = save.skills.res;

  // commandes (auto en stand / après arrivée)
  let thr = inp.thr, bf = inp.bf, br = inp.br, steer = inp.steer, mass = inp.mass;
  let auto = false;
  if (P.finished && !P.crash) {
    auto = true;
    const target = 38;
    thr = P.v < target ? 0.5 : 0; bf = P.v > target + 4 ? 0.4 : 0; steer = 0;
  }
  const dir = new THREE.Vector3(tr.tx, 0, tr.tz);
  if (P.pit) {
    const pt = P.pit;
    const vNow = P.v;
    if (pt.phase === 'in') {
      const rem = R.nextBox - P.sTotal;
      const vt = Math.min(vNow, Math.sqrt(2 * 11 * Math.max(rem, 0)) + 0.5);
      P.v = vt < P.v ? Math.max(vt, P.v - 15 * dt) : P.v;
      if (rem < 340) P.d += clamp(PIT_D - P.d, -4 * dt, 4 * dt);
      P.vd = 0;
      if (rem <= 0.6 && P.v < 2) { pt.phase = 'stop'; P.v = 0; startQTE(); }
    } else if (pt.phase === 'stop') {
      P.v = 0; P.vd = 0;
      if (pt.hold != null) { pt.hold -= dt; if (pt.hold <= 0) pt.phase = 'out'; }
    } else if (pt.phase === 'out') {
      P.v = Math.min(P.v + 13 * dt, 48);
      if (P.sTotal > R.nextBox + 90) P.d += clamp(0 - P.d, -4 * dt, 4 * dt);
      if (P.sTotal > R.nextBox + 130 && Math.abs(P.d) < 1.2) { P.pit = null; P.pitReq = false; }
    }
    P.sTotal += (P.v * dt) / clamp(1 - tr.k * P.d, 0.3, 3);
    P.lean += (0 - P.lean) * Math.min(1, dt * 5);
    P.rpm = lerp(P.rpm, 4500 + P.v * 60, 0.2);
    return;
  }
  if (P.crash) { stepCrash(dt); return; }

  // transfert de masse (Q / E ou stick droit)
  P.mass += (mass - P.mass) * Math.min(1, dt * 5);
  P.steer += (steer - P.steer) * Math.min(1, dt * (5 + agi * 1.2));
  const v = P.v;
  const stab = st.stab;
  const maxLean = Math.min(rad(58 + stab * 4), Math.atan(mu));
  P.maxLean = maxLean;
  const ideal = Math.atan((v * v * tr.k) / G);
  const assist = auto ? 1 : ASSIST[save.settings.assist];
  const tgt = clamp(P.steer * rad(55) + assist * ideal, -maxLean, maxLean);
  P.lean += (tgt - P.lean) * Math.min(1, dt * (5 + stab * 2 + agi * 0.9));
  // freinage + inclinaison = perte d'adhérence latérale
  const brakeLean = 0.5 * (1 - 0.1 * brkLvl) * bf * Math.abs(P.lean) / Math.max(maxLean, 0.2);
  const muEff = mu * (1 - brakeLean);
  const need = Math.abs(v * v * tr.k) / G;
  let aD = -v * v * tr.k + G * Math.tan(clamp(P.lean, -Math.atan(muEff), Math.atan(muEff)));
  P.vd += aD * dt; P.vd -= P.vd * 1.2 * dt;
  P.latG = Math.abs(Math.tan(P.lean));
  if (need > muEff * 1.02) { P.slide += (need / muEff - 1) * dt * 4; P.v -= Math.min(need - muEff, 2) * 3.2 * dt; } else P.slide = Math.max(0, P.slide - dt * 0.8);
  P.slide = Math.min(P.slide, 3);

  // longitudinal
  const fadeAmt = clamp((P.bt - 0.65) / 0.35, 0, 1) * 0.45 * st.fade * (1 - 0.1 * brkLvl);
  const massAccel = 1 + 0.06 * clamp(P.mass, 0, 1) - 0.04 * clamp(-P.mass, 0, 1);
  const massBrake = 1 + 0.07 * clamp(-P.mass, 0, 1) - 0.08 * clamp(P.mass, 0, 1);
  const vm = st.vmax * (1 - 0.16 * P.damage);
  let acc = st.accel * thr * (1 - Math.pow(v / vm, 2)) * Math.min(1, mu / 1.3) * massAccel;
  if (!thr) acc -= 0.8 + v * v * 0.0007;
  const dec = (15.5 * st.brake * bf * massBrake * (1 - fadeAmt) * (1 + 0.03 * brkLvl) + 3.8 * br) * Math.min(1, muEff / 1.4);
  P.v = Math.max(0, P.v + (acc - dec) * dt);
  if (onGrass) P.v = Math.max(0, P.v - (6 + P.v * 0.09) * dt);
  P.bt = clamp(P.bt + (bf * (v / 80) * 0.6 - P.bt * 0.12 * (0.3 + v / 80)) * dt, 0, 1);

  P.d += P.vd * dt;
  // murs
  const lim = W / 2 + 4.6, limL = inPit(tr.i) ? W / 2 + 10 : lim;
  if (P.d > limL || P.d < -lim) {
    const hard = P.v > 32;
    P.d = clamp(P.d, -lim, limL); P.vd = 0;
    if (R.contactCd <= 0) {
      R.contactCd = 0.6;
      if (hard) { P.damage += 0.12 * (1 - 0.08 * resLvl); P.v *= 0.55; toast('wall', 1200, '#ff7a1a'); if (P.v > 28 || Math.random() < 0.5 - resLvl * 0.07) doCrash('wall'); }
      else P.v *= 0.85;
    }
  }
  // chute si glissade prolongée
  if (P.slide > 1.35 && !P.crash && P.v > 12) doCrash('slide');

  P.sTotal += (P.v * dt) / clamp(1 - tr.k * P.d, 0.3, 3);

  // pneus : température et usure (gauche / droite, avant / arrière)
  const m = Math.abs(Math.tan(P.lean)), sl = clamp(Math.tan(P.lean) / 1.4, -1, 1);
  const load = [0.5 + 0.5 * sl, 0.5 - 0.5 * sl];
  const rainOnDry = P.tyre === 3 && wLocal < 0.3 ? 2 : 1;
  for (let k = 0; k < 4; k++) {
    const front = k < 2, side = k % 2;
    const ld = load[side];
    const heat = (0.03 * (v / 80) + 0.07 * m * ld + (front ? 0.10 * bf * (v / 80) : 0.09 * thr)) * comp.heat * rainOnDry;
    const cool = (P.temp[k] - 0.25) * (0.06 + 0.002 * v) * (1 + 1.2 * R.wet);
    P.temp[k] = clamp(P.temp[k] + (heat - cool) * dt, 0.1, 1);
    const wr = comp.wear * (1 - 0.07 * tyreLvl) * (0.001 + 0.003 * m * ld + (front ? 0.0025 * bf * (v / 80) : 0.002 * thr * (1 - v / vm))) * (P.temp[k] > 0.8 ? 2 : 1) * rainOnDry * 0.55;
    P.wear[k] = clamp(P.wear[k] - wr * dt, 0, 1);
  }
  // boîte et régime
  const lim6 = [0.22, 0.38, 0.53, 0.68, 0.84, 1.0];
  let gI = lim6.findIndex(l => v <= vm * l); if (gI < 0) gI = 5;
  const lo = gI ? vm * lim6[gI - 1] : 0, hi = vm * lim6[gI];
  const fr = clamp((v - lo) / Math.max(hi - lo, 1), 0, 1);
  let rpmT = 4500 + fr * 8700; if (v < 6) rpmT = 4500 + thr * 7000;
  P.rpm = lerp(P.rpm, rpmT, Math.min(1, dt * 10)); P.gear = gI + 1;
  P.throttle = thr; P.bf = bf; P.br = br;
}

function doCrash(why) {
  const P = R.P;
  if (P.crash) return;
  P.damage += 0.28 * (1 - 0.08 * save.skills.res);
  P.crash = { t: 0, v: P.v, why };
  // rider éjecté : détaché de la moto
  const rd = R.rider; const wp = new THREE.Vector3(); rd.getWorldPosition(wp);
  R.pb.lean.remove(rd); rd.position.copy(wp); rd.rotation.set(0, 0, 0); rd.scale.set(1, 1, 1); raceScene.add(rd);
  const tr = at(P.sTotal);
  R.rv = new THREE.Vector3(tr.tx * P.v * 0.8 + tr.nx * (P.vd + (Math.random() - 0.5) * 6), 5 + Math.random() * 3, tr.tz * P.v * 0.8 + tr.nz * (P.vd + (Math.random() - 0.5) * 6));
  R.rav = new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12);
  R.ragdoll = true;
  for (let k = 0; k < 10; k++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.2), R.pb.M.paint);
    m.position.copy(P.pos).add(new THREE.Vector3(0, 0.6, 0));
    raceScene.add(m); R.debris.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 10 + R.rv.x * 0.3, 2 + Math.random() * 4, (Math.random() - 0.5) * 10 + R.rv.z * 0.3), t: 4 });
  }
  toast(P.damage >= 1 ? 'cross' : 'crash', 2200, '#ff3b4e');
}
function stepCrash(dt) {
  const P = R.P, c = P.crash; c.t += dt;
  P.v = Math.max(0, P.v - 14 * dt);
  const tr = at(P.sTotal);
  P.sTotal += (P.v * dt) / clamp(1 - tr.k * P.d, 0.3, 3);
  P.d += P.vd * dt * 0.4; P.d = clamp(P.d, -W / 2 - 4.5, W / 2 + 4.5);
  const rd = R.rider;
  R.rv.y -= 22 * dt; rd.position.addScaledVector(R.rv, dt);
  rd.rotation.x += R.rav.x * dt; rd.rotation.y += R.rav.y * dt; rd.rotation.z += R.rav.z * dt;
  if (rd.position.y < 0.3) { rd.position.y = 0.3; R.rv.y = Math.abs(R.rv.y) * 0.32; R.rv.x *= 0.82; R.rv.z *= 0.82; R.rav.multiplyScalar(0.8); }
  P.lean = lerp(P.lean, P.lean > 0 ? 1.45 : -1.45, Math.min(1, dt * 6));
  if (c.t > 3.2) {
    if (P.damage >= 1) { P.dnf = true; finishRace(true); return; }
    // retour en piste
    raceScene.remove(rd); R.pb.lean.add(rd); rd.position.set(0, 0, 0); rd.rotation.set(0, 0, 0);
    R.ragdoll = false; P.crash = null; P.v = 0; P.d = 0; P.vd = 0; P.lean = 0; P.slide = 0;
    P.temp = P.temp.map(t => Math.max(0.25, t - 0.2));
  }
}

function startQTE() {
  const P = R.P, dirs = ['L', 'U', 'R', 'D'];
  P.pit.qte = { seq: Array.from({ length: 4 }, () => dirs[Math.floor(Math.random() * 4)]), i: 0, t0: R.t, lock: 0, miss: 0 };
  $('#pit').classList.remove('hidden');
}
const ARW = { L: '←', R: '→', U: '↑', D: '↓' };
function qteKey(code) {
  const P = R.P; const q = P.pit && P.pit.qte; if (!q || q.lock > 0) return;
  const map = { ArrowLeft: 'L', KeyA: 'L', KeyQ: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', KeyZ: 'U', ArrowDown: 'D', KeyS: 'D' };
  const d = map[code]; if (!d) return;
  if (d === q.seq[q.i]) q.i++; else { q.lock = 0.7; q.miss++; }
  if (q.i >= 4) {
    // roues changées
    P.pit.qte = null; $('#pit').classList.add('hidden');
    P.tyre = P.nextTyre; save.bike.tyre = P.nextTyre; persist();
    P.wear = [1, 1, 1, 1]; P.temp = [0.3, 0.3, 0.3, 0.3]; P.bt = 0;
    const tot = R.t - q.t0; toast('check', 2000, '#37e07a', `${dot(TYRES[P.tyre].col)} ${tot.toFixed(1)}`);
    P.pit.hold = 0.35;
  }
}

// --- IA
function stepAI(a, dt) {
  const w = R.wet, P = R.P;
  if (R.state === 'countdown') return;
  const tr = at(a.sTotal, {});
  let pace = a.pace * lerp(1, 0.84, w);
  const gap = a.sTotal - P.sTotal; if (gap > 300) pace *= 0.97; else if (gap < -300) pace *= 1.03;
  const look = tr.i, vt = Math.min(vProf[look] * pace, a.vtop * a.pace * 1.0);
  const av = a.v < vt ? 9.5 : -14;
  a.v = av > 0 ? Math.min(vt, a.v + av * dt) : Math.max(vt, a.v + av * dt);
  a.sTotal += (a.v * dt) / clamp(1 - tr.k * a.d, 0.3, 3);
  const dTarget = a.lane + Math.sin(R.t * 0.3 + a.ph) * 1.2;
  a.d += clamp(dTarget - a.d, -2.5 * dt, 2.5 * dt);
  if (a.finT == null && a.sTotal >= R.laps * TL) a.finT = R.t;
  a.lap = Math.max(0, Math.floor(a.sTotal / TL) + 1);
}
function poseBike(b, s, d, v, leanA, dtm, heading, spin) {
  const tr = at(s, {});
  const x = tr.x + tr.nx * d, z = tr.z + tr.nz * d;
  b.group.position.set(x, 0, z);
  b.group.rotation.y = heading != null ? heading : Math.atan2(-tr.tx, -tr.tz);
  b.lean.rotation.z = leanA;
  b.wheels.forEach(w => (w.rotation.x -= (v * dtm) / 0.32));
  return tr;
}

// --- boucle de course
const camState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false, shake: 0 };
function readInput() {
  const k = c => keys.has(c);
  const steer = (k('ArrowLeft') || k('KeyA') || k('KeyQ') && false ? 1 : 0) - (k('ArrowRight') || k('KeyD') ? 1 : 0);
  const thr = k('ArrowUp') || k('KeyW') || k('KeyZ') ? 1 : 0;
  const bf = k('ArrowDown') || k('KeyS') ? 1 : 0;
  const br = k('Space') ? 1 : 0;
  const mass = (k('KeyE') ? -1 : 0) + (k('KeyQ') ? 1 : 0);
  pollPad();
  return { steer: steer || pad.steer, thr: thr || pad.thr, bf: bf || pad.bf, br: br || pad.br, mass: mass || pad.mass };
}

function updateRace(dt) {
  const P = R.P, st = R.st;
  R.contactCd -= dt;
  // événements clavier
  while (justPressed.length) {
    const c = justPressed.shift();
    if (c === 'Escape' || c === 'KeyP') { if (R.state !== 'over') setPause(true); continue; }
    if (c === 'KeyB' && !P.pit && !P.finished && R.mode !== 'tt') {
      P.pitReq = !P.pitReq; toast('wrench', 1500, P.pitReq ? '#ffd23b' : '#fff', ic(P.pitReq ? 'check' : 'cross', 40));
    }
    if (/^Digit[1-4]$/.test(c)) { P.nextTyre = +c[5] - 1; toast('tyre', 1200, TYRES[P.nextTyre].col); }
  }
  const inp = readInput();
  if (R.state === 'countdown') {
    R.cd -= dt;
    const n = Math.ceil(R.cd - 0.2); const cd = $('#countdown');
    if (n > 0) cd.textContent = n; else cd.innerHTML = ic('flag', 170); cd.style.color = n > 0 ? '#fff' : '#37e07a';
    if (R.cd <= 0.2 && R.state === 'countdown') { R.state = 'go'; gp(true); setTimeout(() => $('#countdown').classList.add('hidden'), 700); }
    inp.thr = 0; inp.bf = 1;
    if (inp.thr) P.rpm = 9000;
  } else R.t += dt;

  // météo
  const rt = R.rainTarget ? R.rainTarget() : 0;
  if (rt > R.rain && R.rain < 0.02 && R.mode !== 'tt') toast('rain', 2500, '#2aa8ff');
  R.rain += clamp(rt - R.rain, -dt / 40, dt / 18);
  R.wet += clamp(R.rain - R.wet, -dt / 90, dt / 25);

  // stand : déclenchement
  if (P.pitReq && !P.pit && !P.finished && !P.crash) {
    const nl = Math.max(0, Math.ceil((P.sTotal + 1) / TL)) * TL;
    if (nl / TL < R.laps && nl - P.sTotal < 360 && nl > P.sTotal) { R.nextBox = nl + PIT_BOX_S; P.pit = { phase: 'in' }; toast('pitin', 1400, '#ffd23b'); }
  }
  if (R.state !== 'countdown') {
    for (let s = 0; s < 2; s++) stepPlayer(dt / 2, inp);
  }
  R.ai.forEach(a => stepAI(a, dt));
  if (R.state === 'countdown') { /* parc fermé */ }

  // pilotes : tours et arrivée
  const lapNow = Math.floor(P.sTotal / TL) + 1;
  if (lapNow > P.lap && lapNow >= 1 && !P.finished) {
    if (P.lap >= 1) {
      const lt = R.t - P.lapStart; P.last = lt; P.lapTimes.push(lt);
      if (P.best == null || lt < P.best) { P.best = lt; if (P.lap >= 1) toast('stopwatch', 2000, '#c58bff', fmt(lt)); }
      if (save.bestLap == null || lt < save.bestLap) { save.bestLap = lt; }
    }
    P.lap = lapNow; P.lapStart = R.t;
    if (P.lap === R.laps) toast('flag', 1800, '#ffd23b');
  }
  if (!P.finished && P.sTotal >= R.laps * TL && !P.crash) finishRace(false);

  // collisions joueur / IA
  if (!P.crash && !P.pit) for (const a of R.ai) {
    const ds = a.sTotal - P.sTotal, dd = a.d - P.d;
    if (Math.abs(ds) < 1.9 && Math.abs(dd) < 0.85 && R.contactCd <= 0) {
      R.contactCd = 0.5;
      const rel = P.v - a.v;
      P.vd += (P.d >= a.d ? 1 : -1) * 3; a.d += (P.d >= a.d ? -1 : 1) * 0.5;
      if (ds > 0) P.v = Math.min(P.v, a.v + 1); else a.v = Math.min(a.v + 2, P.v + 4);
      P.damage += 0.03 * (1 - 0.08 * save.skills.res);
      if (rel > 14 && Math.random() < 0.5 - save.skills.res * 0.08) doCrash('contact'); else toast('contact', 700, '#ff7a1a');
    }
  }

  // poses
  const tr = at(P.sTotal);
  if (!P.crash || R.ragdoll) {
    const vx = tr.tx * P.v + tr.nx * P.vd, vz = tr.tz * P.v + tr.nz * P.vd;
    const hd = Math.atan2(-vx, -vz);
    P.pos.set(tr.x + tr.nx * P.d, 0, tr.z + tr.nz * P.d); P.heading = hd;
  }
  const pb = R.pb;
  pb.group.position.copy(P.pos); faceCam(pb, raceCam.position);
  if (P.crash) {
    pb.lean.rotation.z = lerp(pb.lean.rotation.z, P.lean, Math.min(1, dt * 8)); pb.lean.position.y = 0.2;
    if (Math.random() < 0.5) {/* étincelles simulées par le débris */ }
  } else {
    pb.lean.position.y = 0; pb.lean.rotation.z = P.lean;
    pb.rider.rotation.x = clamp(-P.mass * 0.12 + (P.bf * 0.06) - (P.throttle * 0.04), -0.2, 0.2);
    pb.wheels.forEach(w => (w.rotation.x -= (P.v * dt) / 0.32));
  }
  R.ai.forEach(a => {
    const t2 = at(a.sTotal, {});
    const la = Math.atan((a.v * a.v * t2.k) / G);
    poseBike(a.bike, a.sTotal, a.d, a.v, la, dt); faceCam(a.bike, raceCam.position);
  });
  // débris
  R.debris = R.debris.filter(d => {
    d.t -= dt; d.v.y -= 20 * dt; d.m.position.addScaledVector(d.v, dt);
    if (d.m.position.y < 0.05) { d.m.position.y = 0.05; d.v.set(d.v.x * 0.6, 0, d.v.z * 0.6); }
    d.m.rotation.x += dt * 5;
    if (d.t <= 0) { raceScene.remove(d.m); return false; } return true;
  });

  // fin de course différée (affichage résultats)
  if (R.state === 'over') { R.over += dt; if (R.over > 2.2 && !R.shown) { R.shown = true; showResults(); } }

  // pilotage de l'équipe au stand
  world.crew.forEach((c, k) => {
    const active = P.pit && P.pit.phase === 'stop';
    c.position.y = active ? Math.abs(Math.sin(R.t * 8 + k)) * 0.15 : 0;
    const bp = c.userData.base; if (bp) c.lookAt(at(PIT_BOX_S, {}).x + at(PIT_BOX_S, {}).nx * PIT_D, 0.8, at(PIT_BOX_S, {}).z + at(PIT_BOX_S, {}).nz * PIT_D);
  });
  if (P.pit && P.pit.qte) { const q = P.pit.qte; q.lock = Math.max(0, q.lock - dt); drawPit(q); }

  // pluie + routes mouillées
  const wet = R.wet;
  world.roadMat.roughness = lerp(0.9, 0.22, wet); world.roadMat.metalness = lerp(0.05, 0.55, wet);
  world.lineMat.opacity = wet * 0.3;
  world.rain.visible = R.rain > 0.03; world.rain.material.opacity = 0.15 + 0.4 * R.rain;
  updateRain(dt);

  // lumières liées à la moto
  const fx = -Math.sin(P.heading), fz = -Math.cos(P.heading);
  world.spot.position.set(P.pos.x, 1.1, P.pos.z); world.spot.target.position.set(P.pos.x + fx * 30, 0, P.pos.z + fz * 30);
  world.pc.position.set(P.pos.x + fx * 6, 3, P.pos.z + fz * 6); world.po.position.set(P.pos.x - fx * 4, 2, P.pos.z - fz * 4);

  // caméra
  updateCamera(dt, tr);
  audioUpdate(R.state !== 'over' && !P.crash, P.rpm, P.throttle);
  drawHud(dt);
}

function updateRain(dt) {
  if (!world.rain.visible) return;
  const rp = world.rainPos, pos = world.rain.geometry.attributes.position.array, RN = world.rn;
  const c = raceCam.position, P = R.P;
  const vx = -Math.sin(P.heading) * P.v, vz = -Math.cos(P.heading) * P.v;
  for (let i = 0; i < RN; i++) {
    const o = i * 6;
    rp[o + 1] -= 32 * dt;
    if (rp[o + 1] < 0 || Math.abs(rp[o] - c.x) > 60 || Math.abs(rp[o + 2] - c.z) > 60) {
      rp[o] = c.x + (Math.random() - 0.5) * 120; rp[o + 1] = 25 + Math.random() * 15; rp[o + 2] = c.z + (Math.random() - 0.5) * 120;
    }
    pos[o] = rp[o]; pos[o + 1] = rp[o + 1]; pos[o + 2] = rp[o + 2];
    pos[o + 3] = rp[o] - vx * 0.012; pos[o + 4] = rp[o + 1] + 0.9; pos[o + 5] = rp[o + 2] - vz * 0.012;
  }
  world.rain.geometry.attributes.position.needsUpdate = true;
}

function updateCamera(dt, tr) {
  const P = R.P;
  const fx = tr.tx, fz = tr.tz;
  const back = 5.4 + P.v * 0.01, up = 2.3;
  const tp = new THREE.Vector3(P.pos.x - fx * back, up, P.pos.z - fz * back);
  const lk = new THREE.Vector3(P.pos.x + fx * 9, 1.0, P.pos.z + fz * 9);
  if (!camState.init) { camState.pos.copy(tp); camState.look.copy(lk); camState.init = true; }
  const k = 1 - Math.exp(-dt * 18);
  camState.pos.lerp(tp, k); camState.look.lerp(lk, 1 - Math.exp(-dt * 20));
  raceCam.position.copy(camState.pos);
  if (P.v > 40) raceCam.position.y += Math.sin(R.t * 55) * 0.012 * (P.v / 80);
  raceCam.lookAt(camState.look);
  raceCam.rotateZ(P.lean * 0.2);
  const fov = 62 + (P.v / 85) * 16; raceCam.fov = lerp(raceCam.fov, fov, 0.1); raceCam.updateProjectionMatrix();
  world.sky.position.copy(raceCam.position);
}

/* ---------------------------------------------------------------- classement */
function standings() {
  const arr = [{ me: true, name: 'VOUS', num: save.bike.number, col: '#19d3ff', s: R.P.sTotal, v: R.P.v }];
  R.ai.forEach(a => arr.push({ me: false, name: a.name, num: a.bike.cfg.number, col: a.bike.cfg.main, s: a.sTotal, v: a.v, fin: a.finT }));
  arr.sort((a, b) => b.s - a.s);
  return arr;
}

/* ---------------------------------------------------------------- fin de course */
function finishRace(dnf) {
  const P = R.P; if (P.finished) return;
  P.finished = true; R.state = 'over'; R.over = 0; gp(false);
  const arr = standings();
  P.finalPos = dnf ? arr.length : arr.findIndex(x => x.me) + 1;
  if (R.mode === 'tt') P.finalPos = 1;
  P.finalTime = R.t;
  if (dnf) { R.P.crash = R.P.crash; }
}
function showResults() {
  const P = R.P, mode = R.mode;
  const pos = P.finalPos, cls = CLASSES[save.cls];
  const arr = standings();
  let rows = '';
  if (mode === 'tt') {
    rows = P.lapTimes.map((t, i) => `<tr${t === P.best ? ' class="me"' : ''}><td>${i + 1}</td><td>${ic('flag', 18)}</td><td>${fmt(t)}</td></tr>`).join('');
    save.board.push(P.best); save.board = save.board.filter(x => x != null).sort((a, b) => a - b).slice(0, 5);
    $('#rTitle').innerHTML = ic('stopwatch', 30); $('#rPos').innerHTML = P.best ? fmt(P.best) : ic('cross', 40);
    $('#rBody').innerHTML = `<table class="res">${rows}</table><div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--muted)">${ic('trophy', 22)}${save.board.map((t, i) => `${i + 1} ${fmt(t)}`).join(' · ')}</div>`;
    persist(); setScreen('results'); return;
  }
  const finished = [...R.ai.filter(a => a.finT != null)].sort((a, b) => a.finT - b.finT);
  const ordered = []; let placed = false;
  const base = arr.map(x => x);
  base.forEach((x, i) => { rows += `<tr${x.me ? ' class="me"' : ''}><td>${i + 1}</td><td><b class="chip" style="background:${x.col}">${x.num}</b></td><td>${x.me ? (P.dnf ? ic('cross', 18) : fmt(P.finalTime)) : x.fin != null ? fmt(x.fin) : ''}</td></tr>`; });
  const prize = Math.round((PRIZES[pos - 1] || 0) * cls.pay * (P.dnf ? 0 : 1));
  const sp = SPONSORS[save.bike.sponsor];
  const spPay = !P.dnf && pos <= sp.need ? sp.pay : 0;
  const salary = Math.round(300 * cls.pay);
  const net = prize + spPay - salary;
  const pts = P.dnf ? 0 : clamp(7 - Math.floor((pos - 1) / 2), 1, 6);
  save.credits = Math.max(0, save.credits + net); save.xp += pts; save.races++;
  if (pos === 1 && !P.dnf) { save.wins++; try { const s = CGS(); if (cgOn && s && s.game && s.game.happytime) s.game.happytime(); } catch (e) { /* ignore */ } }
  if (pos <= 3 && !P.dnf) { save.podiums++; if (save.cls === save.unlocked - 1 && save.unlocked < 3) { save.unlocked++; setTimeout(() => toast('unlock', 2500, '#37e07a'), 300); } }
  persist();
  $('#rTitle').innerHTML = P.dnf ? ic('cross', 30) : ic('flag', 30);
  $('#rPos').innerHTML = P.dnf ? ic('cross', 44) : `${pos <= 3 ? ic('trophy', 44) : ic('flag', 44)} ${pos}`;
  $('#rBody').innerHTML = `<table class="res">${rows}</table>
    <div class="card" style="margin-top:12px"><div class="body">
      <div class="row"><span>${ic('trophy', 22)}</span><b>+${prize}</b></div>
      <div class="row"><span>${ic('star', 22)}${spPay ? '' : ` <small style="color:var(--muted)">${ic('trophy', 14)}${sp.need}</small>`}</span><b>+${spPay}</b></div>
      <div class="row"><span>${ic('people', 22)}</span><b style="color:var(--red)">−${salary}</b></div>
      <div class="row"><span>${ic('coin', 22)}</span><b>${net >= 0 ? '+' : ''}${net}</b></div>
      <div class="row"><span>${ic('bike', 22)}</span><b>+${pts}</b></div></div></div>`;
  setScreen('results');
}

/* ---------------------------------------------------------------- HUD */
function setupHud() {
  const g = $('#hGauge'); const x = g.getContext('2d');
  window.hud = { g: x, lean: $('#hLean').getContext('2d'), tyres: $('#hTyres').getContext('2d'), map: $('#hMap').getContext('2d') };
}
function drawGauge(x, w, h, kmh, rpm, gear) {
  x.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.6, r = 108, a0 = rad(145), a1 = rad(395);
  x.lineCap = 'butt'; x.lineWidth = 16; x.strokeStyle = 'rgba(255,255,255,.1)'; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke();
  const fr = clamp(rpm / 14000, 0, 1);
  x.strokeStyle = fr > 0.9 ? '#ff3b4e' : fr > 0.75 ? '#ff9a1a' : '#19d3ff';
  x.shadowColor = x.strokeStyle; x.shadowBlur = 14; x.beginPath(); x.arc(cx, cy, r, a0, a0 + (a1 - a0) * fr); x.stroke(); x.shadowBlur = 0;
  x.strokeStyle = '#ff3b4e'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, r + 13, a0 + (a1 - a0) * (12.5 / 14), a1); x.stroke();
  x.fillStyle = '#d6e6ff'; x.font = '600 15px Rajdhani, Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i <= 14; i += 2) { const a = a0 + ((a1 - a0) * i) / 14; x.fillText(i, cx + Math.cos(a) * (r - 22), cy + Math.sin(a) * (r - 22)); }
  x.fillStyle = '#fff'; x.font = '800 62px Rajdhani, Segoe UI, Arial'; x.fillText(Math.round(kmh), cx, cy - 4);
  x.fillStyle = '#19d3ff'; x.font = '800 36px Rajdhani, Arial'; x.fillText(gear, cx, cy + 50);
}
function drawLean(x, w, h, lean, max) {
  x.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h - 8, r = 62;
  x.lineWidth = 8; x.strokeStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(cx, cy, r, Math.PI + rad(30), Math.PI * 2 - rad(30)); x.stroke();
  const lim = rad(60);
  x.strokeStyle = '#ff3b4e'; x.beginPath(); x.arc(cx, cy, r, Math.PI * 1.5 - lean * 0 + (max / lim) * 0, Math.PI * 1.5); x.stroke();
  // zone de décrochage
  x.lineWidth = 8; x.strokeStyle = '#ff3b4e';
  const am = clamp(max / rad(60), 0, 1) * rad(60);
  const edge = a => Math.PI * 1.5 - a; // gauche positif → vers la gauche
  x.beginPath(); x.arc(cx, cy, r, edge(rad(60)), edge(am)); x.stroke();
  x.beginPath(); x.arc(cx, cy, r, Math.PI * 1.5 + am, Math.PI * 1.5 + rad(60)); x.stroke();
  const a = Math.PI * 1.5 - clamp(lean, -rad(60), rad(60));
  x.strokeStyle = '#19d3ff'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); x.stroke();
  x.fillStyle = '#fff'; x.font = '800 22px Rajdhani, Arial'; x.textAlign = 'center'; x.fillText(`${Math.round(Math.abs(lean) * 180 / Math.PI)}°`, cx, cy - 16);
  x.save(); x.translate(24, 24); x.rotate(-clamp(lean, -rad(60), rad(60))); x.strokeStyle = '#d6e6ff'; x.lineWidth = 2.5; x.lineCap = 'round';
  x.beginPath(); x.arc(-9, 0, 5, 0, TAU); x.arc(9, 0, 5, 0, TAU); x.moveTo(-9, 0); x.lineTo(-3, -8); x.lineTo(5, -8); x.lineTo(9, 0); x.stroke(); x.restore();
}
function tempColor(t) {
  if (t < 0.4) return '#2f8bff'; if (t < 0.5) return '#2fd0c8'; if (t < 0.72) return '#37e07a'; if (t < 0.85) return '#ffb02e'; return '#ff3b4e';
}
function drawTyres(x, w, h, P) {
  x.clearRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(w / 2 - 5, 30, 10, 120);
  const dr = (k, X, Y) => {
    x.fillStyle = tempColor(P.temp[k]); x.fillRect(X, Y, 18, 44);
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(X, Y, 18, 44 * (1 - P.wear[k]));
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.strokeRect(X, Y, 18, 44);
  };
  dr(0, w / 2 - 22, 20); dr(1, w / 2 + 4, 20); dr(2, w / 2 - 22, 122); dr(3, w / 2 + 4, 122);
  // gomme montée : anneau de la couleur du compound
  x.strokeStyle = TYRES[P.tyre].col; x.lineWidth = 5; x.beginPath(); x.arc(w / 2, 100, 11, 0, TAU); x.stroke();
  x.fillStyle = TYRES[P.tyre].col; x.beginPath(); x.arc(w / 2, 100, 3, 0, TAU); x.fill();
}
function drawMap(x) {
  x.clearRect(0, 0, 230, 160); x.drawImage(world.mapCanvas, 0, 0);
  x.fillStyle = '#ff7a1a';
  R.ai.forEach(a => { const t = at(a.sTotal, {}); const [mx, my] = world.mapT(t.x + t.nx * a.d, t.z + t.nz * a.d); x.beginPath(); x.arc(mx, my, 3, 0, TAU); x.fill(); });
  const [px_, py_] = world.mapT(R.P.pos.x, R.P.pos.z);
  x.fillStyle = '#19d3ff'; x.shadowColor = '#19d3ff'; x.shadowBlur = 8; x.beginPath(); x.arc(px_, py_, 5, 0, TAU); x.fill(); x.shadowBlur = 0;
}
function drawPit(q) {
  const el = $('#pit');
  const cur = q.seq[q.i];
  el.innerHTML = `<div class="pitic">${ic('wrench', 34)}${ic('tyre', 34)}</div><div class="arrow" style="${q.lock > 0 ? 'color:#ff3b4e' : ''}">${q.lock > 0 ? ic('cross', 100) : ARW[cur]}</div>
    <div class="pips">${q.seq.map((_, i) => `<i class="${i < q.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="pitic" style="font-size:26px">${ic('stopwatch', 26)} ${(R.t - q.t0).toFixed(1)} ${dot(TYRES[R.P.nextTyre].col)}</div>`;
}
function drawHud(dt) {
  const P = R.P;
  R.hudT += dt; if (R.hudT < 0.033) return; R.hudT = 0;
  $('#hTime').textContent = fmt(Math.max(0, R.t - (P.lapStart || 0)));
  $('#hBest').textContent = fmt(P.best != null ? P.best : save.bestLap);
  const arr = standings(); const my = arr.findIndex(x => x.me);
  $('#hPos').textContent = R.mode === 'tt' ? '—' : `${my + 1}/${arr.length}`;
  $('#hLap').textContent = `${clamp(Math.max(P.lap, 1), 1, R.laps)}/${R.laps}`;
  if (R.mode !== 'tt') {
    let html = ''; const show = arr.slice(0, 6);
    if (my >= 6) show.push(arr[my]);
    show.forEach(e => {
      const idx = arr.indexOf(e); const g = e === arr[0] ? '' : `+${(Math.abs(arr[0].s - e.s) / Math.max(e.v, 25)).toFixed(1)}`;
      html += `<div class="${e.me ? 'me' : ''}"><span>${idx + 1} <b class="chip" style="background:${e.col}">${e.num}</b></span><span class="g">${g}</span></div>`;
    });
    $('#hBoard').innerHTML = html;
    const ahead = my > 0 ? arr[my - 1] : null, behind = my < arr.length - 1 ? arr[my + 1] : null;
    const gp = ahead ? `▲ ${(ahead.s - P.sTotal) / Math.max(P.v, 25) > 99 ? '99' : ((ahead.s - P.sTotal) / Math.max(P.v, 25)).toFixed(2)}` : '';
    const gb = behind ? `▼ ${((P.sTotal - behind.s) / Math.max(P.v, 25)).toFixed(2)}` : '';
    $('#hGap').innerHTML = `${gp} &nbsp; ${gb}`;
  } else $('#hGap').innerHTML = '';
  $('#hWeather').innerHTML = `<span class="wi">${ic(R.rain > 0.05 ? 'rain' : 'sun', 24)}</span><span class="wi">${ic('drop', 20)}${Math.round(R.wet * 100)}%</span>${P.pitReq ? `<span class="wi" style="color:#ffd23b">${ic('wrench', 24)}</span>` : ''}${P.damage > 0.05 ? `<span class="wi" style="color:#ff3b4e">${ic('warn', 22)}${Math.round(P.damage * 100)}%</span>` : ''}`;
  drawGauge(hud.g, 320, 230, P.v * 3.6, P.rpm, P.gear);
  drawLean(hud.lean, 170, 86, P.lean, P.maxLean);
  drawTyres(hud.tyres, 110, 190, P);
  drawMap(hud.map);
}

/* ================================================================ UI */
let screen = 'menu';
function setScreen(name) {
  screen = name;
  ['menu', 'garage', 'hud', 'settings', 'pause', 'results'].forEach(s => $('#' + s).classList.toggle('hidden', s !== name && !(name === 'settings' && s === 'menu' && false)));
  if (name === 'settings') $('#menu').classList.remove('hidden');
  if (name === 'pause') $('#hud').classList.remove('hidden');
  if (name === 'results') $('#hud').classList.remove('hidden');
  $('#touch').classList.toggle('hidden', !(isTouch && name === 'hud'));
  if (name === 'menu') refreshMenu();
  if (name === 'garage') { refreshGarage(); }
  if (name !== 'hud' && name !== 'pause' && name !== 'results' && audio) audioUpdate(false, 4000, 0);
}
function setPause(on) {
  if (!R) return;
  if (on) { R.paused = true; gp(false); setScreen('pause'); } else { R.paused = false; if (R.state === 'go') gp(true); setScreen('hud'); }
}
const pips = (n, max) => `<span class="pps">${Array.from({ length: max }, (_, k) => `<i class="pp${k < n ? ' on' : ''}"></i>`).join('')}</span>`;
const mbar = v => `<span class="mb"><i style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></i></span>`;
function refreshMenu() {
  const c = CLASSES[save.cls];
  $('#news').innerHTML = `<span class="wi">${ic('cloudsun', 30)}</span><span class="wi">${ic('flag', 26)}2</span><span class="wi" style="color:#2aa8ff">${ic('rain', 30)}${ic('tyre', 26)}</span>`;
  const row = (k, v, col) => `<div class="row"><span${col ? ` style="color:${col}"` : ''}>${ic(k, 22)}</span><b>${v}</b></div>`;
  $('#profile').innerHTML = row('bike', parseInt(c.n)) + row('coin', save.credits) + row('flag', save.races) + row('trophy', save.wins) + row('medal', save.podiums) + row('star', save.xp) + row('stopwatch', fmt(save.bestLap));
}

/* --- garage --- */
const CATS = [
  { id: 'cls', i: 'medal', t: 'Catégorie' }, { id: 'engine', i: 'engine', t: 'Moteur' }, { id: 'tyre', i: 'tyre', t: 'Pneus' }, { id: 'exhaust', i: 'exhaust', t: 'Échappement' },
  { id: 'paint', i: 'palette', t: 'Peinture' }, { id: 'decal', i: 'sticker', t: 'Sponsors' }, { id: 'suspension', i: 'spring', t: 'Suspension' },
  { id: 'brakes', i: 'disc', t: 'Freins' }, { id: 'skills', i: 'helmet', t: 'Pilote' },
];
let gcat = 'engine';
function refreshGarage() {
  $('#gCredits').innerHTML = `<span class="wi">${ic('coin', 20)}${save.credits}</span><span class="wi">${ic('star', 20)}${save.xp}</span>`;
  $('#cats').innerHTML = CATS.map(c => `<button data-c="${c.id}" title="${c.t}" aria-label="${c.t}" class="${c.id === gcat ? 'on' : ''}">${ic(c.i, 30)}</button>`).join('');
  $$('#cats button').forEach(b => (b.onclick = () => { gcat = b.dataset.c; refreshGarage(); }));
  const o = $('#opts'); o.innerHTML = '';
  const b = save.bike;
  const opt = (html, tag, eq, fn, dis, title) => {
    const el = document.createElement('button'); el.className = 'opt' + (eq ? ' eq' : ''); el.disabled = !!dis; if (title) { el.title = title; el.setAttribute('aria-label', title); }
    el.innerHTML = `<span class="oc">${html}</span><span class="tag">${tag}</span>`; el.onclick = fn; o.appendChild(el); return el;
  };
  const price = (cost, ok) => `<span style="color:${ok ? 'var(--orange)' : 'var(--red)'}" class="wi">${ic('coin', 18)}${cost}</span>`;
  const st = (k, v) => `<span class="st">${ic(k, 20)}${v}</span>`;
  const OK = ic('check', 22);
  if (['engine', 'exhaust', 'suspension', 'brakes'].includes(gcat)) {
    PARTS[gcat].forEach((p, i) => {
      const owned = save.owned[gcat].includes(i), eq = b[gcat] === i, can = owned || save.credits >= p.cost;
      const stats = { engine: st('bolt', 200 + p.hp), exhaust: st('bolt', `+${p.hp}`) + st('gauge', `+${Math.round(p.acc * 100)}`),
        suspension: st('bike', `${58 + p.stab * 4}°`), brakes: st('disc', `${Math.round(p.f * 100)}`) + st('thermo', `${Math.round((1 - p.fade) * 100)}%`) }[gcat];
      opt(pips(i + 1, 3) + stats, eq ? OK : owned ? '' : price(p.cost, can), eq, () => {
        if (owned) b[gcat] = i; else if (save.credits >= p.cost) { save.credits -= p.cost; save.owned[gcat].push(i); b[gcat] = i; } else return;
        persist(); refreshGarage();
      }, !owned && save.credits < p.cost, p.n);
    });
  } else if (gcat === 'tyre') {
    TYRES.forEach((t, i) => opt(`<span style="color:${t.col}">${ic('tyre', 30)}</span>${st('sun', '')}${mbar((t.dry - 0.8) / 0.3)}${st('drop', '')}${mbar((t.wet - 0.6) / 0.42)}${st('shield', '')}${mbar(1 - (t.wear - 0.6) / 1.2)}`,
      b.tyre === i ? OK : '', b.tyre === i, () => { b.tyre = i; persist(); refreshGarage(); }, false, t.n));
  } else if (gcat === 'cls') {
    CLASSES.forEach((c, i) => opt(`<b class="chip" style="background:#1d3b66">${parseInt(c.n)}</b>${st('coin', `×${c.pay}`)}`,
      i >= save.unlocked ? ic('lock', 22) : save.cls === i ? OK : '', save.cls === i, () => { save.cls = i; persist(); refreshGarage(); }, i >= save.unlocked, c.n));
  } else if (gcat === 'paint') {
    const sw = (icon, key) => o.insertAdjacentHTML('beforeend', `<div class="icl">${ic(icon, 20)}</div><div class="sw" data-k="${key}">${PALETTE.map(c => `<i data-c="${c}" style="background:${c}" class="${b[key] === c ? 'on' : ''}"></i>`).join('')}</div>`);
    sw('bike', 'main'); sw('stripes', 'accent');
    $$('.sw i', o).forEach(i => (i.onclick = () => { b[i.parentElement.dataset.k] = i.dataset.c; applyLivery(gar.bike, b); persist(); refreshGarage(); }));
  } else if (gcat === 'decal') {
    SPONSORS.forEach((s, i) => opt(`${pips(i + 1, 5)}${st('coin', s.pay)}${st('trophy', s.need)}`, b.sponsor === i ? OK : '', b.sponsor === i, () => { b.sponsor = i; persist(); refreshGarage(); }, false, s.n));
  } else if (gcat === 'skills') {
    const ico = { agi: 'bike', tyre: 'tyre', brake: 'disc', res: 'shield' };
    SKILLS.forEach(s => {
      const lv = save.skills[s.id];
      opt(`${ic(ico[s.id], 30)}${pips(lv, 5)}`, lv >= 5 ? OK : ic('plus', 24), false, () => { if (save.xp > 0 && lv < 5) { save.xp--; save.skills[s.id]++; persist(); refreshGarage(); } }, save.xp < 1 || lv >= 5, s.n);
    });
  }
  // statistiques
  const sx = bikeStats();
  const acc0100 = (27.8 / (sx.accel * 0.8)).toFixed(1);
  const sr = (k, v, bar, col) => `<span${col ? ` style="color:${col}"` : ''}>${ic(k, 20)}</span><b>${v}</b>${mbarW(bar)}`;
  $('#gStats').innerHTML = sr('bolt', sx.hpShown, (sx.hp - 200) / 70) + sr('gauge', Math.round(sx.vmax * 3.6), (sx.vmax * 3.6 - 200) / 150) + sr('stopwatch', acc0100, 1 - (acc0100 - 2) / 3)
    + sr('disc', Math.round(sx.brake * 100), (sx.brake - 0.9) / 0.3) + sr('thermo', `${Math.round((1 - sx.fade) * 100)}%`, 1 - sx.fade) + sr('bike', `${58 + sx.stab * 4}°`, sx.stab)
    + sr('tyre', '', 1, curTyre().col).replace('<b></b>', `<b>${dot(curTyre().col)}</b>`).replace(/<div class="bar">.*?<\/div>/, '');
  drawDyno(sx);
}
const mbarW = v => `<div class="bar"><i style="width:${clamp(v, 0, 1) * 100}%"></i></div>`;
function drawDyno(st) {
  const c = $('#dyno'), x = c.getContext('2d'), w = c.width, h = c.height;
  x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 1;
  for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(30, (h - 20) * i / 5); x.lineTo(w - 8, (h - 20) * i / 5); x.stroke(); }
  const pm = st.hp;
  const curveFor = (fn, col) => {
    x.strokeStyle = col; x.lineWidth = 2.4; x.beginPath();
    for (let r = 3000; r <= 14000; r += 200) { const X = 30 + (r - 3000) / 11000 * (w - 40); const Y = (h - 20) - fn(r) / (pm * 1.15) * (h - 30); r === 3000 ? x.moveTo(X, Y) : x.lineTo(X, Y); }
    x.stroke();
  };
  curveFor(r => dynoHp(200, r), 'rgba(200,220,255,.55)');
  curveFor(r => dynoHp(pm, r), '#ff5a3c');
}

/* --- cycle de menu --- */
$('#menu').addEventListener('click', e => {
  const a = e.target.closest('button'); if (!a || !a.dataset.act) return;
  initAudio();
  const act = a.dataset.act;
  if (act === 'career' || act === 'quick') { carry.mode = act === 'career' ? 'career' : 'quick'; if (act === 'career') { gcat = 'engine'; setScreen('garage'); } else startRace('quick'); }
  if (act === 'tt') startRace('tt');
  if (act === 'garage') { carry.mode = 'quick'; setScreen('garage'); }
  if (act === 'settings') setScreen('settings');
});
const carry = { mode: 'career' };
$('#gBack').onclick = () => setScreen('menu');
$('#gRace').onclick = () => { initAudio(); startRace(carry.mode === 'career' ? 'career' : 'quick'); };
$('#sClose').onclick = () => setScreen('menu');
$$('#settings .seg').forEach(seg => {
  const k = seg.dataset.key;
  const paint = () => $$('button', seg).forEach(b => b.classList.toggle('on', String(save.settings[k]) === b.dataset.v));
  $$('button', seg).forEach(b => (b.onclick = () => { save.settings[k] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; persist(); paint(); }));
  paint();
});
$('#pResume').onclick = () => setPause(false);
$('#pRestart').onclick = () => { const m = R.mode; R.paused = false; startRace(m); };
$('#pQuit').onclick = () => { disposeRace(); setScreen('menu'); };
$('#rGarage').onclick = () => { disposeRace(); carry.mode = 'career'; setScreen('garage'); };
$('#rAgain').onclick = () => { const m = R.mode; startRace(m); };
$('#rMenu').onclick = () => { disposeRace(); setScreen('menu'); };
// bouton contre-la-montre
{
  const b = document.createElement('button'); b.dataset.act = 'tt';
  $('.menu-list').insertBefore(b, $('.menu-list button[data-act="multi"]'));
}

/* orbite du garage */
let lastX = 0;
canvas.addEventListener('pointerdown', e => { gar.drag = true; lastX = e.clientX; });
window.addEventListener('pointerup', () => (gar.drag = false));
window.addEventListener('pointermove', e => { if (gar.drag) { gar.ang -= (e.clientX - lastX) * 0.008; lastX = e.clientX; } });
canvas.addEventListener('wheel', e => { gar.dist = clamp(gar.dist + e.deltaY * 0.004, 3, 7); });

/* ================================================================ PORTAILS (GameMonetize, tactile, système) */
const isTouch = (window.matchMedia && matchMedia('(pointer:coarse)').matches) || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const GM = { held: false, lastAd: 0, races: 0 };
// publicité interstitielle : jamais avant la 2e course, au plus toutes les 2 minutes
function showAd() {
  const now = Date.now(); GM.races++;
  if (GM.races < 2 || now - GM.lastAd < 120000) return;
  GM.lastAd = now;
  try { if (window.sdk && typeof window.sdk.showBanner === 'function') window.sdk.showBanner(); } catch (e) { /* pas de SDK */ }
  try {
    const s = CGS();
    if (cgOn && s && s.ad) s.ad.requestAd('midgame', { adStarted: () => window.__gm.pause(), adFinished: () => window.__gm.resume(), adError: () => window.__gm.resume() });
  } catch (e) { window.__gm.resume(); }
}
window.__gm = {
  pause() { GM.held = true; if (R) R.paused = true; if (audio) audio.ac.suspend(); },
  resume() { GM.held = false; if (R && screen === 'hud') R.paused = false; if (audio) audio.ac.resume(); },
};
[['#pResume', 'play', 34], ['#pRestart', 'restart', 34], ['#pQuit', 'home', 34], ['#rGarage', 'wrench', 34], ['#rAgain', 'restart', 34], ['#rMenu', 'home', 34], ['#bPlay', 'play', 44]]
  .forEach(([s, k, z]) => ($(s).innerHTML = ic(k, z)));
const MENU_IC = { career: ['trophy', 'Carrière'], quick: ['flag', 'Course rapide'], tt: ['stopwatch', 'Contre-la-montre'], multi: ['people', 'Multijoueur (bientôt)'], garage: ['wrench', 'Garage'], settings: ['gear', 'Réglages'] };
$$('.menu-list button').forEach(b => { const [k, t] = MENU_IC[b.dataset.act]; b.innerHTML = ic(k, 34) + (b.dataset.act === 'multi' ? ic('lock', 22) : ''); b.title = t; b.setAttribute('aria-label', t); });
$('.gtitle span').innerHTML = ic('wrench', 30);
$('#gBack').innerHTML = ic('back', 30); $('#gRace').innerHTML = ic('play', 30);
$('#sClose').innerHTML = ic('check', 30);
{
  const sr = $('#sReset'); sr.innerHTML = ic('trash', 28); sr.title = 'Effacer la sauvegarde';
  let armed = 0;
  sr.onclick = () => {
    if (!armed) { armed = setTimeout(() => { armed = 0; sr.style.color = ''; }, 3000); sr.style.color = '#ff3b4e'; return; }
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } location.reload();
  };
  const SET = { weather: { dynamic: ic('cloudsun', 30), dry: ic('sun', 30), wet: ic('rain', 30) }, laps: { 2: '2', 3: '3', 5: '5' },
    assist: { 0: pips(4, 4), 1: pips(3, 4), 2: pips(2, 4), 3: pips(1, 4) }, volume: { 0: ic('spk0', 30), 0.3: ic('spk1', 30), 0.6: ic('spk2', 30), 1: ic('spk3', 30) } };
  const LBL = { weather: 'cloudsun', laps: 'flag', assist: 'bike', volume: 'spk2' };
  $$('#settings .seg').forEach(seg => {
    const k = seg.dataset.key;
    $$('button', seg).forEach(bt => { bt.innerHTML = SET[k][bt.dataset.v]; });
    seg.previousElementSibling.innerHTML = ic(LBL[k], 24);
  });
  $('#settings h2').innerHTML = ic('gear', 30);
}
const bMute = $('#bMute');
const paintMute = () => (bMute.textContent = save.settings.volume > 0 ? '🔊' : '🔇');
bMute.onclick = () => { save.settings.volume = save.settings.volume > 0 ? 0 : 0.6; persist(); paintMute(); $$('#settings .seg[data-key=volume] button').forEach(b => b.classList.toggle('on', +b.dataset.v === save.settings.volume)); };
paintMute();
$('#bFull').onclick = () => { const d = document.documentElement; try { document.fullscreenElement ? document.exitFullscreen() : d.requestFullscreen && d.requestFullscreen(); } catch (e) { /* ignore */ } };
window.addEventListener('pointerdown', () => window.focus());
$('#bPlay').onclick = () => { initAudio(); $('#splash').classList.add('hidden'); };
// contrôles tactiles
$$('#touch button').forEach(b => {
  const k = b.dataset.k;
  if (k) {
    const down = e => { e.preventDefault(); b.classList.add('dn'); if (!keys.has(k)) { justPressed.push(k); if (R && R.P.pit && R.P.pit.qte) qteKey(k); } keys.add(k); initAudio(); };
    const up = e => { e.preventDefault(); b.classList.remove('dn'); keys.delete(k); };
    b.addEventListener('pointerdown', down); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, up));
  } else if (b.dataset.tap) b.addEventListener('pointerdown', e => { e.preventDefault(); justPressed.push(b.dataset.tap); });
  else if (b.dataset.pause) b.addEventListener('pointerdown', e => { e.preventDefault(); setPause(true); });
});
document.addEventListener('contextmenu', e => e.preventDefault());

/* ================================================================ BOUCLE */
let last = performance.now(), tAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tAcc += dt;
  if (R && (screen === 'hud' || screen === 'results' || screen === 'pause')) {
    canvas.style.visibility = 'visible';
    if (!R.paused && !GM.held && !window.__manual) updateRace(dt); else if (!window.__manual) justPressed.length = 0;
    renderer.render(raceScene, raceCam);
  } else if (screen === 'menu' || screen === 'settings') {
    justPressed.length = 0; canvas.style.visibility = 'hidden';
  } else {
    justPressed.length = 0; canvas.style.visibility = 'visible';
    const b = gar.bike;
    gar.ang = clamp(gar.ang, -0.7, 0.7);
    const dist = screen === 'garage' ? gar.dist : 6.5;
    garCam.position.set(Math.sin(gar.ang) * dist, gar.h + (screen === 'garage' ? 0.2 : 0.5), Math.cos(gar.ang) * dist);
    garCam.lookAt(0, 0.85, 0.3); faceCam(b, garCam.position);
    renderer.render(garScene, garCam);
  }
}
const boot = () => { prepBase(); buildWorld(); buildGarage(); setupHud(); setScreen('menu'); requestAnimationFrame(frame); };
if (bikeImg.complete && bikeImg.naturalWidth) boot(); else bikeImg.onload = boot;
window.__apex = { tick(n, dt = 1 / 30) { for (let i = 0; i < n; i++) if (R && !R.paused) updateRace(dt); }, get R() { return R; }, save, startRace, setScreen, keys, at, TL, N };
