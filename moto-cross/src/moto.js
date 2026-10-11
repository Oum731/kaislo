import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Les 4 motos du jeu. Les stats sont lues par la physique (main.js).
export const BIKES = [
  { name: 'Rookie 125', color: 0xff5500, style: 0, max: 42, acc: 20, handling: 1.0, nitro: 1.0, desc: 'Facile à prendre en main' },
  { name: 'Enduro 250', color: 0x2266ff, style: 1, max: 44, acc: 22, handling: 1.12, nitro: 1.0, desc: 'Très maniable' },
  { name: 'Pro 450', color: 0x22bb44, style: 2, max: 47, acc: 25, handling: 0.95, nitro: 1.1, desc: 'Puissante et équilibrée' },
  { name: 'Phantom 500', color: 0xaa22cc, style: 3, max: 50, acc: 27, handling: 0.85, nitro: 1.25, desc: 'Vitesse max, difficile à tenir' },
  { name: 'Raptor 2T', color: 0xe0202a, style: 4, max: 46, acc: 30, handling: 1.08, nitro: 1.1, desc: 'Accélération explosive' },
  { name: 'Dune Runner', color: 0xf2c14e, style: 5, max: 48, acc: 24, handling: 1.25, nitro: 1.2, desc: 'Agile et précise' },
  { name: 'Thunder 650', color: 0xe8eaf0, style: 6, max: 53, acc: 29, handling: 0.88, nitro: 1.35, desc: 'Puissance brute' },
  { name: 'Neon Ghost', color: 0x14141c, style: 7, max: 55, acc: 31, handling: 1.0, nitro: 1.5, desc: 'La légende' },
];

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const UP = new THREE.Vector3(0, 1, 0);

// Assemble des géométries et les fusionne par matériau (peu d'appels de rendu par moto).
const MUD = new THREE.Color(0x6a5440), hash3 = (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return q - Math.floor(q); };
class Part {
  // baseY : hauteur de l'origine de la pièce au-dessus du sol (sert à salir le bas de la moto)
  constructor(offset = [0, 0, 0], baseY = 0) { this.map = new Map(); this.off = V(offset); this.baseY = baseY; }
  push(geo, mat) { // tout en non-indexé pour pouvoir fusionner des géométries de types différents
    const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose();
    const p = g.attributes.position, col = new Float32Array(p.count * 3);   // boue : plus de saleté près du sol, par éclaboussures
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i) + this.baseY, k = Math.pow(Math.max(0, 1 - h / 0.95), 1.3) * 0.62 * (0.55 + 0.9 * hash3(p.getX(i) * 31, p.getZ(i) * 29 + p.getY(i) * 17));
      col[i * 3] = 1 + (MUD.r - 1) * k; col[i * 3 + 1] = 1 + (MUD.g - 1) * k; col[i * 3 + 2] = 1 + (MUD.b - 1) * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const l = this.map.get(mat) || []; l.push(g); this.map.set(mat, l);
  }
  add(geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    geo.applyMatrix4(new THREE.Matrix4().compose(V(p).sub(this.off), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(s)));
    this.push(geo, mat);
  }
  // Cylindre / capsule orienté entre deux points
  between(geo, mat, a, b, scale = [1, 1, 1]) {
    const A = V(a).sub(this.off), B = V(b).sub(this.off), d = B.clone().sub(A);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
    geo.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, V(scale)));
    this.push(geo, mat);
  }
  rod(a, b, r, mat, seg = 8) { const len = V(a).distanceTo(V(b)); this.between(new THREE.CylinderGeometry(r, r, len, seg), mat, a, b); }
  limb(a, b, r, mat, scale) { const len = Math.max(0.01, V(a).distanceTo(V(b)) - 2 * r); this.between(new THREE.CapsuleGeometry(r, len, 4, 10), mat, a, b, scale); }
  tube(pts, r, mat) {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => V(p).sub(this.off)));
    this.push(new THREE.TubeGeometry(c, pts.length * 6, r, 8, false), mat);
  }
  build(parent) {
    for (const [mat, geos] of this.map) {
      const g = geos.length > 1 ? mergeGeometries(geos) : geos[0];
      if (g) { const m = new THREE.Mesh(g, mat); m.castShadow = true; parent.add(m); }
      else geos.forEach((gg) => { const m = new THREE.Mesh(gg, mat); m.castShadow = true; parent.add(m); });
    }
  }
}

function numberTexture(num, bg, fg, round = true) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  if (round) { x.beginPath(); x.roundRect(4, 4, 120, 120, 26); x.fill(); } else x.fillRect(0, 0, 128, 128);
  x.fillStyle = fg; x.font = '900 86px system-ui, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(num), 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const hsl = (c) => { const o = {}; new THREE.Color(c).getHSL(o); return o; };
const css = (c) => '#' + new THREE.Color(c).getHexString();
function helmetTexture(main, acc) {            // casque blanc, bandes de la couleur de l'équipe, éclats néon et noirs (motif original)
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f3f3f3'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = css(main); for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(i * 64 - 10, 0); x.lineTo(i * 64 + 26, 0); x.lineTo(i * 64 + 70, 128); x.lineTo(i * 64 + 34, 128); x.fill(); }
  x.fillStyle = css(acc); for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 32, 44); x.lineTo(i * 32 + 22, 70); x.lineTo(i * 32 + 4, 84); x.fill(); }
  x.fillStyle = '#16161a'; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 32 + 8, 8); x.lineTo(i * 32 + 30, 30); x.lineTo(i * 32 + 12, 36); x.fill(); }
  x.fillStyle = '#16161a'; x.fillRect(0, 112, 256, 16);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function jerseyTexture(main, acc) {            // maillot : flancs plus sombres, bandes de couleur, grain du tissu
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = css(main); x.fillRect(0, 0, 128, 128);
  const dark = new THREE.Color(main).multiplyScalar(0.62); x.fillStyle = css(dark); x.fillRect(0, 0, 16, 128); x.fillRect(112, 0, 16, 128);
  x.fillStyle = css(acc); x.fillRect(0, 22, 128, 7); x.fillRect(0, 96, 128, 7);
  x.fillStyle = '#ffffff'; x.globalAlpha = 0.85; x.fillRect(0, 31, 128, 2); x.fillRect(0, 93, 128, 2); x.globalAlpha = 1;
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let _fabric = null, _blob = null;
function fabricBump() {                        // petit grain de tissu partagé
  if (_fabric) return _fabric;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#888'; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) { x.fillStyle = 'rgba(255,255,255,0.28)'; x.fillRect(0, i, 64, 1); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(i, 0, 1, 64); }
  _fabric = new THREE.CanvasTexture(c); _fabric.wrapS = _fabric.wrapT = THREE.RepeatWrapping; _fabric.repeat.set(4, 4); return _fabric;
}
function shadowBlob() {                        // ombre douce sous la moto
  if (_blob) return _blob;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.55, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _blob = new THREE.CanvasTexture(c); return _blob;
}

// Roue : pneu à crampons, jante, rayons, moyeu (+ disque de frein à l'avant). Axe = X.
function makeWheel(r, w, mats, front) {
  const g = new THREE.Group(), p = new Part([0, 0, 0], r);
  const rr = r - 0.095, prof = [];
  for (let k = 0; k <= 14; k++) { // profil de pneu arrondi
    const a = (k / 14) * Math.PI - Math.PI / 2;
    prof.push(new THREE.Vector2(rr + (r - rr) * Math.pow(Math.cos(a), 0.55), Math.sin(a) * (w / 2)));
  }
  const tire = new THREE.LatheGeometry(prof, 28); tire.rotateZ(Math.PI / 2);
  p.push(tire, mats.rubber);
  const n = 22;
  for (let i = 0; i < n; i++) { // crampons
    const th = (i / n) * Math.PI * 2;
    for (const s of [-1, 1]) {
      const ang = th + (s > 0 ? Math.PI / n : 0);
      p.add(new THREE.BoxGeometry(0.03, 0.03, 0.026), mats.rubber, [s * w * 0.27, Math.cos(ang) * (r + 0.005), Math.sin(ang) * (r + 0.005)], [ang, 0, 0]);
    }
  }
  const rim = new THREE.LatheGeometry([new THREE.Vector2(rr - 0.012, -w * 0.38), new THREE.Vector2(rr + 0.004, -w * 0.38), new THREE.Vector2(rr + 0.004, w * 0.38), new THREE.Vector2(rr - 0.012, w * 0.38)], 28);
  rim.rotateZ(Math.PI / 2); p.push(rim, mats.rim);
  for (let i = 0; i < 18; i++) { // rayons
    const th = (i / 18) * Math.PI * 2, ox = i % 2 ? 0.02 : -0.02, hub = V([ox, 0, 0]), edge = V([0, Math.cos(th) * rr, Math.sin(th) * rr]);
    p.rod(hub.toArray(), edge.toArray(), 0.0035, mats.rim, 4);
  }
  p.add(new THREE.CylinderGeometry(0.045, 0.045, w * 0.9, 12), mats.rim, [0, 0, 0], [0, 0, Math.PI / 2]);
  if (front) p.add(new THREE.CylinderGeometry(0.13, 0.13, 0.005, 20), mats.disc, [0.045, 0, 0], [0, 0, Math.PI / 2]);
  else p.add(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 18), mats.disc, [-0.05, 0, 0], [0, 0, Math.PI / 2]); // couronne
  p.build(g);
  return g;
}

// Modèle de moto + pilote (procédural). `body` pivote autour du centre de masse (figures).
export function createMoto(color = 0xff5500, style = 0, number = 1) {
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1.0;
  const inner = new THREE.Group(); inner.position.y = -1.0;
  body.add(inner); root.add(body);

  const c = new THREE.Color(color);
  const std = (col, rough = 0.5, metal = 0.1) => new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal, vertexColors: true });
  const gloss = (col) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12, vertexColors: true });
  const cloth = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0, bumpMap: fabricBump(), bumpScale: 0.5, vertexColors: true, ...o });
  const hh = hsl(color), neonAcc = new THREE.Color().setHSL((hh.h + 0.31) % 1, 0.95, 0.55);   // couleur d'accent complémentaire de l'équipe
  const accent = [0xffffff, 0xffd400, 0xffffff, 0xff66ff, 0xffffff, 0x2a6df4, 0xe02020, 0x33f0ff][style];
  const neon = style === 7;
  const mats = {
    rubber: std(0x141414, 0.95, 0), rim: neon ? new THREE.MeshBasicMaterial({ color: 0x33f0ff }) : std(0xc4c8cf, 0.35, 0.85), disc: std(0x9aa0a8, 0.4, 0.8),
    paint: gloss(c), white: std(0xf4f4f4, 0.4, 0.05), black: std(0x16161a, 0.6, 0.1),
    frame: std(style === 3 || style === 7 ? 0x1b1b22 : style === 6 ? 0xd02020 : 0xaab0b8, 0.4, 0.8), engine: std(0x777d86, 0.45, 0.7),
    fork: std(style === 1 || style === 0 || style === 4 ? 0xd9a520 : style === 5 ? 0x2a6df4 : 0xc9ced6, 0.3, 0.85), seat: std(0x0d0d10, 0.85, 0),
    shock: std(style === 2 || style === 6 ? 0xe03030 : style === 7 ? 0x33f0ff : 0xffc400, 0.4, 0.3), exhaust: std(0x8d949c, 0.35, 0.85),
    jersey: cloth(0xffffff, { map: jerseyTexture(c, neonAcc) }), jerseyAlt: cloth(neonAcc), pants: cloth(new THREE.Color(c).multiplyScalar(0.28).lerp(new THREE.Color(0x1d2026), 0.55)), helmet: new THREE.MeshPhysicalMaterial({ map: helmetTexture(c, neonAcc), roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1 }),
    lens: std(0x3a8cff, 0.08, 0.9), boots: std(0x1d1d20, 0.5, 0.15), gloves: cloth(0x202024),
    glow: new THREE.MeshBasicMaterial({ color: style === 7 ? 0x33f0ff : 0xff66ff }),
  };
  const plateTex = numberTexture(number, '#ffffff', '#111111');
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 });
  const backTex = numberTexture(number, 'rgba(0,0,0,0)', '#ffffff', false);
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, transparent: true, roughness: 0.8 });

  // ----- Roues -----
  const FR = 0.36, RR = 0.35;
  const rear = makeWheel(RR, style === 6 ? 0.15 : 0.12, mats, false); rear.position.set(0, RR, -0.74);
  inner.add(rear);

  // ----- Partie fixe : cadre, moteur, carrosserie, bas du corps du pilote -----
  const f = new Part();
  for (const s of [-1, 1]) {
    f.tube([[s * 0.03, 1.08, 0.46], [s * 0.09, 1.02, 0.12], [s * 0.09, 0.96, -0.3], [s * 0.08, 0.98, -0.62]], 0.022, mats.frame);        // longerons
    f.tube([[s * 0.03, 1.0, 0.46], [s * 0.1, 0.72, 0.3], [s * 0.1, 0.42, 0.1], [s * 0.1, 0.38, -0.2], [s * 0.11, 0.5, -0.4]], 0.02, mats.frame); // berceau
    f.tube([[s * 0.12, 0.5, -0.4], [s * 0.13, 0.42, -0.58], [s * 0.13, RR, -0.74]], 0.028, mats.frame);                                           // bras oscillant
    f.rod([s * 0.26, 0.4, -0.05], [s * 0.34, 0.4, -0.05], 0.014, mats.black);                                                                       // repose-pieds
  }
  f.add(new RoundedBoxGeometry(0.26, 0.34, 0.4, 3, 0.04), mats.engine, [0, 0.56, 0.0]);
  f.add(new RoundedBoxGeometry(0.2, 0.26, 0.24, 3, 0.04), mats.engine, [0, 0.82, 0.14], [-0.35, 0, 0]);
  f.add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), mats.exhaust, [0.15, 0.55, -0.05], [0, 0, Math.PI / 2]);
  f.rod([0, 0.93, -0.28], [0, 0.55, -0.42], 0.028, mats.black);                                                // amortisseur
  f.rod([0, 0.88, -0.3], [0, 0.66, -0.38], 0.05, mats.shock, 12);                                              // ressort
  f.tube([[0.07, 0.78, 0.26], [0.17, 0.68, 0.34], [0.23, 0.64, 0.1], [0.21, 0.74, -0.3]], 0.026, mats.exhaust); // collecteur
  if (style === 4) { // 2 temps : grosse chambre d'expansion conique
    f.between(new THREE.CylinderGeometry(0.03, 0.11, 0.62, 12), mats.exhaust, [0.21, 0.72, 0.05], [0.22, 0.84, -0.56]);
    f.rod([0.22, 0.84, -0.56], [0.2, 0.92, -0.82], 0.04, mats.exhaust, 10);
  } else f.rod([0.21, 0.76, -0.26], [0.2, 0.9, -0.8], style === 2 || style === 6 ? 0.07 : 0.055, mats.exhaust, 12);   // silencieux
  if (style === 6) { f.rod([-0.21, 0.76, -0.26], [-0.2, 0.9, -0.8], 0.07, mats.exhaust, 12); f.add(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12), mats.black, [-0.2, 0.9, -0.8], [1.45, 0, 0]); }
  f.add(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 12), mats.black, [0.2, 0.9, -0.8], [1.45, 0, 0]);
  f.add(new RoundedBoxGeometry(0.3, 0.24, 0.5, 4, 0.07), mats.paint, [0, 1.15, 0.14]);                          // réservoir
  for (const s of [-1, 1]) f.add(new RoundedBoxGeometry(0.1, 0.28, 0.52, 3, 0.04), mats.paint, [s * 0.17, 1.02, 0.2], [0, 0, s * 0.12]); // radiateur
  f.add(new RoundedBoxGeometry(0.25, 0.1, 0.82, 3, 0.04), mats.seat, [0, 1.04, -0.3], [-0.05, 0, 0]);         // selle
  f.add(new RoundedBoxGeometry(0.2, 0.04, 0.48, 2, 0.015), mats.paint, [0, 1.07, -0.8], [0.4, 0, 0]);          // garde-boue arrière
  if (style === 3 || style === 7) f.add(new THREE.BoxGeometry(0.34, 0.015, 1.3), mats.glow, [0, 0.25, 0]);                    // néon
  if (style === 1) f.add(new THREE.BoxGeometry(0.31, 0.02, 0.5), mats.jerseyAlt, [0, 1.275, 0.14]);
  if (style === 4) f.add(new THREE.BoxGeometry(0.31, 0.02, 0.5), mats.black, [0, 1.275, 0.14]);
  if (style === 5) { // fanion de dune : mât + drapeau
    f.rod([0.0, 1.05, -0.85], [0.0, 2.9, -0.95], 0.012, mats.black, 5);
    f.add(new THREE.ConeGeometry(0.16, 0.5, 3), mats.jerseyAlt, [0.0, 2.75, -1.18], [Math.PI / 2, 0, 0]);
  }
  if (style === 6) f.add(new RoundedBoxGeometry(0.34, 0.1, 0.6, 2, 0.04), mats.black, [0, 1.3, 0.14]);   // sabot de réservoir
  if (neon) { f.add(new THREE.BoxGeometry(0.02, 0.04, 1.5), mats.glow, [0.14, 0.95, -0.1]); f.add(new THREE.BoxGeometry(0.02, 0.04, 1.5), mats.glow, [-0.14, 0.95, -0.1]); }
  // Bas du corps : bassin, cuisses, tibias, bottes
  f.add(new RoundedBoxGeometry(0.34, 0.2, 0.24, 3, 0.07), mats.pants, [0, 1.1, -0.12]);
  for (const s of [-1, 1]) {
    const hip = [s * 0.15, 1.08, -0.1], knee = [s * 0.3, 0.8, 0.28], ankle = [s * 0.27, 0.46, -0.0];
    f.limb(hip, knee, 0.09, mats.pants); f.add(new THREE.SphereGeometry(0.09, 10, 8), mats.pants, knee);
    f.limb(knee, ankle, 0.075, mats.boots);
    f.add(new RoundedBoxGeometry(0.11, 0.09, 0.3, 2, 0.03), mats.boots, [s * 0.27, 0.42, 0.06]);
    for (let q = 0; q < 3; q++) f.add(new RoundedBoxGeometry(0.02, 0.03, 0.07, 1, 0.008), mats.jerseyAlt, [s * 0.335, 0.52 + q * 0.09, 0.07 - q * 0.015]);   // boucles de botte
    f.add(new RoundedBoxGeometry(0.06, 0.1, 0.06, 2, 0.02), mats.white, [s * 0.3, 0.8, 0.34]);               // genouillère
  }
  f.build(inner);
  for (const s of [-1, 1]) { // plaques latérales arrière
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), plateMat);
    m.position.set(s * 0.125, 0.98, -0.66); m.rotation.y = s * Math.PI / 2; m.rotation.x = 0.12; inner.add(m);
  }

  // ----- Fourche avant + guidon (pivot sur l'axe de direction) -----
  const steer = new THREE.Group(); steer.position.set(0, 0, 0.48); inner.add(steer);
  const frontW = makeWheel(FR, 0.1, mats, true); frontW.position.set(0, FR, 0.26); steer.add(frontW);
  const s = new Part([0, 0, 0.48]);
  for (const k of [-1, 1]) {
    s.rod([k * 0.075, 1.14, 0.46], [k * 0.07, 0.62, 0.7], 0.026, mats.fork);                                  // tubes de fourche
    s.rod([k * 0.07, 0.66, 0.69], [k * 0.07, FR, 0.74], 0.03, mats.fork);
    s.rod([k * 0.04, 0.36, 0.74], [k * 0.095, 0.36, 0.74], 0.018, mats.black);                                   // axe
    s.add(new THREE.CylinderGeometry(0.019, 0.019, 0.13, 8), mats.black, [k * 0.38, 1.2, 0.64], [0, 0, Math.PI / 2]); // poignées
  }
  s.add(new RoundedBoxGeometry(0.22, 0.04, 0.07, 2, 0.015), mats.black, [0, 1.13, 0.47]);
  s.tube([[-0.4, 1.19, 0.64], [-0.3, 1.24, 0.57], [-0.1, 1.255, 0.54], [0.1, 1.255, 0.54], [0.3, 1.24, 0.57], [0.4, 1.19, 0.64]], 0.011, mats.black);
  s.rod([-0.3, 1.24, 0.57], [-0.34, 1.215, 0.7], 0.008, mats.black, 5);                                         // levier d'embrayage
  s.add(new RoundedBoxGeometry(0.13, 0.03, 0.52, 2, 0.012), mats.paint, [0, 0.8, 0.76], [-0.18, 0, 0]);       // garde-boue avant
  s.build(steer);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.24), plateMat);                                   // plaque numéro avant
  plate.position.set(0, 1.12, 0.65 - 0.48); plate.rotation.x = -0.25; steer.add(plate);

  // ----- Haut du corps du pilote (pivote légèrement pour se pencher) -----
  const upper = new THREE.Group(); upper.position.set(0, 1.1, -0.12); inner.add(upper);
  const u = new Part([0, 1.1, -0.12]);
  const torso = new THREE.Group(); torso.position.set(0, 1.38 - 1.1, 0.06 + 0.12); torso.rotation.x = 0.55; upper.add(torso);
  const chest = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.48, 0.24, 4, 0.09), mats.jersey); chest.castShadow = true; torso.add(chest);
  const guard = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.34, 0.05, 3, 0.02), mats.black); guard.position.set(0, 0.04, 0.125); torso.add(guard);          // protection pectorale
  for (let k = 0; k < 3; k++) { const rib = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.035, 0.03, 2, 0.01), mats.jerseyAlt); rib.position.set(0, 0.12 - k * 0.09, 0.15); torso.add(rib); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), backMat); back.position.set(0, 0.02, -0.125); back.rotation.y = Math.PI; torso.add(back);
  for (const k of [-1, 1]) {
    const sh = [k * 0.22, 1.54, 0.2], el = [k * 0.38, 1.4, 0.5], wr = [k * 0.4, 1.19, 0.66];
    u.add(new THREE.SphereGeometry(0.095, 12, 10), mats.jersey, sh);
    u.limb(sh, el, 0.058, mats.jersey); u.add(new THREE.SphereGeometry(0.058, 8, 8), mats.jersey, el);
    u.limb(el, wr, 0.048, mats.jersey);
    u.add(new THREE.SphereGeometry(0.058, 10, 8), mats.gloves, [wr[0], wr[1] - 0.01, wr[2]], [0, 0, 0], [1, 0.9, 1.15]);
  }
  for (const k of [-1, 1]) {                                                                                       // coudières
    u.add(new THREE.SphereGeometry(0.066, 10, 8), mats.black, [k * 0.38, 1.4, 0.5], [0, 0, 0], [1, 0.9, 1.1]);
  }
  u.add(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10), mats.jerseyAlt, [0, 1.63, 0.24]);                    // cou
  u.add(new THREE.SphereGeometry(1, 18, 14), mats.helmet, [0, 1.75, 0.3], [0, 0, 0], [0.16, 0.17, 0.2]);         // casque
  u.add(new THREE.SphereGeometry(1, 14, 10), mats.paint, [0, 1.79, 0.3], [0, 0, 0], [0.165, 0.1, 0.205]);        // bande couleur
  u.add(new RoundedBoxGeometry(0.2, 0.025, 0.17, 2, 0.01), mats.paint, [0, 1.8, 0.47], [-0.22, 0, 0]);           // visière
  u.add(new RoundedBoxGeometry(0.14, 0.08, 0.1, 2, 0.03), mats.helmet, [0, 1.67, 0.46]);                         // mentonnière
  u.add(new RoundedBoxGeometry(0.2, 0.085, 0.06, 2, 0.025), mats.lens, [0, 1.745, 0.465]);                      // lunettes
  u.add(new THREE.TorusGeometry(0.168, 0.014, 6, 20), mats.black, [0, 1.745, 0.3], [Math.PI / 2, 0, 0], [1, 1.2, 1]);
  u.build(upper);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.5), new THREE.MeshBasicMaterial({ map: shadowBlob(), transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.05, -0.05); shadow.renderOrder = 2; root.add(shadow);
  root.userData = { body, front: frontW, rear, wheelR: (FR + RR) / 2, steer, upper, shadow };
  return root;
}
