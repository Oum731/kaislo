import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { detailTexture, trackTexture } from './textures.js';

const hash2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(a, b) { const ia = Math.floor(a), ib = Math.floor(b), fa = a - ia, fb = b - ib, sa = fa * fa * (3 - 2 * fa), sb = fb * fb * (3 - 2 * fb); return (hash2(ia, ib) * (1 - sa) + hash2(ia + 1, ib) * sa) * (1 - sb) + (hash2(ia, ib + 1) * (1 - sa) + hash2(ia + 1, ib + 1) * sa) * sb; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = (h) => new THREE.Color(h);

// Définition des 3 pistes : forme, relief, sauts, ambiance.
export const TRACKS = [
  {
    id: 'forest', name: 'Forêt de Kaislo', points: 12, width: 16, grip: 1,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 170 + Math.sin(i * 2.3) * 45 + Math.cos(i * 1.1) * 25; return [Math.cos(a) * r * 1.2, Math.sin(a) * r]; },
    hill: 5, jumps: [0.12, 0.33, 0.58, 0.81], noiseAmp: 1,
    sky: 0x8ec9ee, fog: 0x8ec9ee, skyTop: 0x3f7fd8, clouds: 0.65, dirt: 0xa0713a, ground: 0x4f8f3a, rock: 0x7a6a55, dust: 0xb08a5a, sunColor: 0xfff2d0,
    props: [{ kind: 'pine', count: 520, leaf: 0x1f6b2e, trunk: 0x6b4423 }],
  },
  {
    id: 'desert', name: 'Canyon du Désert', points: 16, width: 17, grip: 0.95,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 230 + Math.sin(a * 3 + 0.5) * 65 + Math.cos(a * 5) * 28; return [Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.9]; },
    hill: 7, jumps: [0.08, 0.22, 0.37, 0.52, 0.66, 0.85], noiseAmp: 1.6,
    sky: 0xf2c48a, fog: 0xf0cfa0, skyTop: 0x6aa6e8, clouds: 0.25, dirt: 0xd9a05b, ground: 0xe6c27a, rock: 0xb5683a, dust: 0xe0b878, sunColor: 0xffe0a0,
    props: [{ kind: 'cactus', count: 260, leaf: 0x3e8a3a }, { kind: 'rock', count: 160, leaf: 0xa5683c }],
  },
  {
    id: 'snow', name: 'Glacier Alpin', points: 14, width: 14, grip: 0.8,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 160 + Math.sin(a * 4) * 55 + Math.cos(a * 2 + 1) * 30; return [Math.cos(a) * r * 1.15, Math.sin(a) * r]; },
    hill: 6, jumps: [0.1, 0.3, 0.55, 0.78], noiseAmp: 1.3,
    sky: 0xbcd9ef, fog: 0xd6e6f2, skyTop: 0x8fb4d9, clouds: 0.9, dirt: 0xcfd8e2, ground: 0xf4f8fc, rock: 0x8f9aa8, dust: 0xffffff, sunColor: 0xeaf2ff,
    props: [{ kind: 'pine', count: 480, leaf: 0xe8f2f8, trunk: 0x5a4632 }, { kind: 'rock', count: 90, leaf: 0x8a95a3 }],
  },
  {
    id: 'volcano', name: 'Volcano', points: 15, width: 15, grip: 0.9,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 190 + Math.sin(a * 2 + 0.3) * 60 + Math.cos(a * 5) * 22; return [Math.cos(a) * r * 1.25, Math.sin(a) * r]; },
    hill: 8, jumps: [0.07, 0.2, 0.34, 0.5, 0.63, 0.77, 0.9], noiseAmp: 1.9,
    sky: 0x8a4a3a, fog: 0x9a5a48, skyTop: 0x3a2634, clouds: 0.95, cloudDark: 0.5, dirt: 0x7a5646, ground: 0x5a4e4a, rock: 0xc4461c, dust: 0x9a8a84, sunColor: 0xffc08a,
    light: { hemi: 1.0, sun: 1.2, env: 0.5 },
    props: [{ kind: 'pine', count: 150, leaf: 0x2a2220, trunk: 0x1a1412 }, { kind: 'rock', count: 200, leaf: 0x3a3436 }, { kind: 'lava', count: 70, leaf: 0xff5a1a }],
  },
  {
    id: 'night', name: 'Neon Night', points: 18, width: 17, grip: 1,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 200 + Math.sin(a * 3) * 35 + Math.cos(a * 6 + 1) * 20; return [Math.cos(a) * r * 1.35, Math.sin(a) * r]; },
    hill: 3, jumps: [0.15, 0.4, 0.65, 0.88], noiseAmp: 0.6,
    sky: 0x0a1030, fog: 0x121a44, skyTop: 0x04071a, clouds: 0.25, stars: 1, cloudDark: 0.25, dirt: 0x5a6688, ground: 0x2c3e66, rock: 0x3a4a78, dust: 0xaab6e0, sunColor: 0x9aa8ff,
    light: { hemi: 0.95, sun: 0.9, env: 0.4, headlight: true },
    props: [{ kind: 'lamp', count: 60, leaf: 0xfff2a0 }, { kind: 'pine', count: 260, leaf: 0x10281f, trunk: 0x2a2018 }],
  },
  {
    id: 'tropic', name: 'Tropic Island', points: 13, width: 16, grip: 0.95,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 175 + Math.sin(a * 2) * 55 + Math.cos(a * 3 + 2) * 30; return [Math.cos(a) * r * 1.2, Math.sin(a) * r]; },
    hill: 6, jumps: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85], noiseAmp: 1.1,
    sky: 0x7fd8ff, fog: 0xb8ecff, skyTop: 0x2e9be8, clouds: 0.5, dirt: 0xe9d29a, ground: 0x3fae5a, rock: 0x8a8f7a, dust: 0xf0e0b0, sunColor: 0xfff6d8,
    props: [{ kind: 'palm', count: 380, leaf: 0x2f9e44, trunk: 0x8a6a3a }, { kind: 'rock', count: 70, leaf: 0x9a9a88 }],
  },
];

// ---------- Géométrie du décor ----------
function colorize(geo, color, lo = 0.6, hi = 1.15) {          // dégradé de bas en haut + petites variations
  const p = geo.attributes.position; geo.computeBoundingBox();
  const y0 = geo.boundingBox.min.y, y1 = geo.boundingBox.max.y, c = new THREE.Color(color), a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const t = (p.getY(i) - y0) / Math.max(0.001, y1 - y0), k = lo + (hi - lo) * t * (0.9 + 0.2 * hash2(p.getX(i) * 9, p.getZ(i) * 9)); a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
}
function jitter(geo, amt, keepTop = false) {                  // silhouettes irrégulières (déplace les sommets de façon cohérente)
  const p = geo.attributes.position; geo.computeBoundingBox(); const top = geo.boundingBox.max.y;
  for (let i = 0; i < p.count; i++) {
    if (keepTop && p.getY(i) > top - 0.01) continue;
    const k = 1 + (hash2(p.getX(i) * 13.1, p.getZ(i) * 7.7 + p.getY(i) * 3.3) - 0.5) * amt;
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
  }
  geo.computeVertexNormals(); return geo;
}
const at = (g, x, y, z) => g.translate(x, y, z);
function propGeometry(pr) {
  const parts = [];
  if (pr.kind === 'pine') {
    parts.push(colorize(at(new THREE.CylinderGeometry(0.32, 0.55, 3.2, 7), 0, 1.6, 0), pr.trunk, 0.7, 1.0));
    [[3.1, 4.4, 4.3], [2.5, 3.8, 6.2], [1.8, 3.2, 8.0], [1.0, 2.4, 9.6]].forEach(([r, h, y]) => parts.push(colorize(jitter(at(new THREE.ConeGeometry(r, h, 11, 2), 0, y, 0), 0.22, true), pr.leaf, 0.55, 1.2)));
  } else if (pr.kind === 'palm') {
    const tr = new THREE.CylinderGeometry(0.24, 0.4, 7.4, 7, 6); const p = tr.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 3.7; p.setX(i, p.getX(i) + y * y * 0.045); }
    parts.push(colorize(at(tr, 0, 3.7, 0), pr.trunk, 0.7, 1.05));
    const topX = 7.4 * 7.4 * 0.045;
    for (let k = 0; k < 9; k++) {
      const f = new THREE.ConeGeometry(0.55, 4.6, 4, 3); f.scale(1, 1, 0.22); f.rotateZ(-Math.PI / 2 - 0.45); f.translate(2.0, 0.1, 0); f.rotateY((k / 9) * Math.PI * 2 + hash2(k, 3) * 0.4);
      parts.push(colorize(at(f, topX, 7.4, 0), pr.leaf, 0.6, 1.2));
    }
  } else if (pr.kind === 'cactus') {
    parts.push(colorize(at(new THREE.CylinderGeometry(0.5, 0.58, 5.2, 9, 3), 0, 2.6, 0), pr.leaf, 0.7, 1.15), colorize(at(new THREE.SphereGeometry(0.5, 9, 6), 0, 5.2, 0), pr.leaf, 1, 1.1));
    parts.push(colorize(at(new THREE.CylinderGeometry(0.28, 0.3, 1.5, 7), 0.95, 2.6, 0).rotateZ(0), pr.leaf, 0.8, 1.1), colorize(at(new THREE.CylinderGeometry(0.27, 0.28, 1.8, 7), 1.5, 3.5, 0), pr.leaf, 0.8, 1.15));
  } else {
    parts.push(colorize(jitter(at(new THREE.IcosahedronGeometry(1.5, 1).scale(1, 0.68, 1), 0, 0.7, 0), 0.5), pr.leaf, 0.55, 1.2));
  }
  const g = mergeGeometries(parts.map((q) => (q.index ? q.toNonIndexed() : q)));
  return g;
}

// Crée une piste complète (courbe, hauteur du terrain, recherche du point le plus proche).
export function createTrack(def) {
  let pts = [];
  for (let i = 0; i < def.points; i++) { const [x, z] = def.shape(i, def.points); pts.push([x, z]); }
  const maxC = Math.max(...pts.map(([x, z]) => Math.max(Math.abs(x), Math.abs(z))));
  const k = 320 / maxC;
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x * k, 0, z * k)), true, 'catmullrom', 0.5);
  const SAMPLES = 600, width = def.width;
  const samples = curve.getSpacedPoints(SAMPLES).slice(0, SAMPLES); // le dernier point doublonne le premier
  const length = curve.getLength();

  const trackH = samples.map((_, i) => {
    const u = i / SAMPLES, t = u * Math.PI * 2;
    let h = Math.sin(t * 3) * def.hill + Math.sin(t * 7 + 1) * 2;
    for (const j of def.jumps) {
      let d = Math.abs(u - j); d = Math.min(d, 1 - d);
      if (d < 0.011) h += Math.cos((d / 0.011) * Math.PI / 2) * 4.5;
    }
    return h;
  });
  const noise = (x, z) => (Math.sin(x * 0.02) * 6 + Math.cos(z * 0.025) * 6 + Math.sin((x + z) * 0.05) * 3 + Math.sin(x * 0.11) * Math.cos(z * 0.09) * 1.2) * def.noiseAmp;

  // Point de piste le plus proche, affiné sur le segment : distance réelle et hauteur interpolée (pas d'escaliers).
  function nearest(x, z, hint = -1) {
    let best = 1e18, bi = 0;
    const test = (i) => { const p = samples[i]; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; bi = i; } };
    let found = false;
    if (hint >= 0) {
      for (let q = -25; q <= 25; q++) test((hint + q + SAMPLES) % SAMPLES);
      if (best < 40 * 40) found = true; else best = 1e18;
    }
    if (!found) for (let i = 0; i < SAMPLES; i++) test(i);
    const a = samples[bi], nb = (bi + 1) % SAMPLES, pb = (bi - 1 + SAMPLES) % SAMPLES;
    let o = samples[nb], oh = trackH[nb];
    let tx = o.x - a.x, tz = o.z - a.z, f = ((x - a.x) * tx + (z - a.z) * tz) / (tx * tx + tz * tz);
    if (f < 0) { o = samples[pb]; oh = trackH[pb]; tx = o.x - a.x; tz = o.z - a.z; f = ((x - a.x) * tx + (z - a.z) * tz) / (tx * tx + tz * tz); }
    f = Math.min(1, Math.max(0, f));
    const dx = x - (a.x + tx * f), dz = z - (a.z + tz * f);
    return { i: bi, d: Math.sqrt(dx * dx + dz * dz), th: trackH[bi] + (oh - trackH[bi]) * f };
  }
  const blend = (th, d, x, z) => {
    const w = smooth(width * 0.6, width * 2.5, d);
    return th * (1 - w) + (noise(x, z) + 8 * smooth(30, 80, d)) * w;
  };
  const heightAt = (x, z, hint = -1) => { const n = nearest(x, z, hint); return blend(n.th, n.d, x, z); };

  // Vecteur latéral (gauche) à l'indice i
  const normalAt = (i) => {
    const a = samples[i], b = samples[(i + 1) % SAMPLES];
    const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
    return { x: -tz / l, z: tx / l };
  };

  function build(scene, q = { seg: 200, trees: 1 }) {
    const group = new THREE.Group();
    const size = 900, seg = q.seg;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grass = hex(def.ground), dirt = hex(def.dirt), rock = hex(def.rock), c = new THREE.Color();
    for (let q = 0; q < pos.count; q++) {
      const x = pos.getX(q), z = pos.getZ(q);
      const { d, th } = nearest(x, z);
      const h = blend(th, d, x, z);
      pos.setY(q, h);
      c.copy(dirt).lerp(grass, smooth(width * 0.5, width * 0.9, d));
      if (h > 12) c.lerp(rock, Math.min(1, (h - 12) / 8));
      c.multiplyScalar(0.86 + 0.26 * (vnoise(x * 0.018, z * 0.018) * 0.6 + vnoise(x * 0.08, z * 0.08) * 0.4) + (Math.random() - 0.5) * 0.04);
      colors.set([c.r, c.g, c.b], q * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const detail = detailTexture(); detail.repeat.set(230, 230);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, bumpMap: q.bump === false ? null : detail, bumpScale: 0.55, roughness: 0.97, metalness: 0 }));
    mesh.receiveShadow = true;
    group.add(mesh);

    // Ruban de piste : terre tassée avec ornières, posé légèrement au-dessus du terrain
    {
      const N = 10, half = width * 0.62, rows = SAMPLES + 1, cols = 2 * N + 1;
      const rp = new Float32Array(rows * cols * 3), ru = new Float32Array(rows * cols * 2), ri = [];
      let acc = 0;
      for (let r = 0; r < rows; r++) {
        const i = r % SAMPLES, p = samples[i], nv = normalAt(i);
        if (r > 0) { const q0 = samples[(i - 1 + SAMPLES) % SAMPLES]; acc += Math.hypot(p.x - q0.x, p.z - q0.z); }
        for (let c = 0; c < cols; c++) {
          const lat = ((c / (cols - 1)) * 2 - 1) * half, x = p.x + nv.x * lat, z = p.z + nv.z * lat, k = r * cols + c;
          rp[k * 3] = x; rp[k * 3 + 1] = heightAt(x, z, i) + 0.18; rp[k * 3 + 2] = z; ru[k * 2] = c / (cols - 1); ru[k * 2 + 1] = acc / 9;
          if (r < rows - 1 && c < cols - 1) { const a = k, b = k + 1, d = k + cols, e = k + cols + 1; ri.push(a, d, b, b, d, e); }
        }
      }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('uv', new THREE.BufferAttribute(ru, 2)); rg.setIndex(ri); rg.computeVertexNormals();
      const road = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: trackTexture(), color: hex(def.dirt).multiplyScalar(1.18), roughness: 0.98, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      road.receiveShadow = true; road.renderOrder = 1; group.add(road);
    }

    // Décor instancié : géométries fusionnées avec couleurs de sommets (dégradés), teinte aléatoire par arbre
    const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
    for (const pr of def.props) {
      const total = Math.round(pr.count * (pr.kind === 'lamp' ? Math.max(0.5, q.trees) : q.trees));
      let meshes, flat = false;
      if (pr.kind === 'lamp' || pr.kind === 'lava') {
        const parts = pr.kind === 'lamp'
          ? [[new THREE.CylinderGeometry(0.14, 0.18, 7, 6), 0x555566, 3.5], [new THREE.SphereGeometry(0.55, 8, 6), pr.leaf, 7.2, { basic: true }]]
          : [[new THREE.DodecahedronGeometry(1.1, 0), pr.leaf, 0.5, { emissive: 0xff3a00 }]];
        meshes = parts.map(([g, col, yo, o = {}]) => { const im = new THREE.InstancedMesh(g, o.basic ? new THREE.MeshBasicMaterial({ color: col }) : new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 0.8, emissive: o.emissive || 0 }), total); im.userData.yo = yo; return im; });
      } else {
        const geo = propGeometry(pr); flat = pr.kind === 'rock';
        const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: flat }), total); im.userData.yo = 0; meshes = [im];
      }
      let n = 0, tries = 0;
      while (n < total && tries++ < total * 12) {
        let x, z;
        if (pr.kind === 'lamp') {
          const i = Math.floor((n / total) * SAMPLES) % SAMPLES, nv = normalAt(i), side = n % 2 ? 1 : -1, p = samples[i];
          x = p.x + nv.x * side * (width * 0.62); z = p.z + nv.z * side * (width * 0.62);
        } else { x = (Math.random() - 0.5) * 860; z = (Math.random() - 0.5) * 860; }
        const { d, th } = nearest(x, z);
        if (pr.kind !== 'lamp' && d < width * 1.8) continue;
        const y = blend(th, d, x, z), sc = pr.kind === 'lamp' ? 1 : 0.75 + Math.random() * 0.85, sy = pr.kind === 'lamp' ? 1 : sc * (0.9 + Math.random() * 0.35);
        dummy.position.set(x, y, z); dummy.rotation.set(pr.kind === 'palm' ? (Math.random() - 0.5) * 0.18 : 0, Math.random() * 6.28, pr.kind === 'palm' ? (Math.random() - 0.5) * 0.18 : 0); dummy.scale.set(sc, sy, sc);
        meshes.forEach((im) => { dummy.position.y = y + (im.userData.yo || 0) * sc; dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix); if (im.material.vertexColors) { const k = 0.78 + Math.random() * 0.4; im.setColorAt(n, tmpC.setRGB(k, k * (0.96 + Math.random() * 0.1), k * (0.94 + Math.random() * 0.1))); } });
        n++;
      }
      meshes.forEach((im) => { im.count = n; im.castShadow = q.shadowSize >= 2048; im.receiveShadow = false; if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); });
    }

    // Ligne et arche de départ
    const p0 = samples[0], p1 = samples[3];
    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    const line = new THREE.Mesh(new THREE.BoxGeometry(width * 1.2, 0.1, 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    line.position.set(p0.x, trackH[0] + 0.1, p0.z);
    line.lookAt(p0.x + dir.x, trackH[0] + 0.1, p0.z + dir.z);
    group.add(line);
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width * 0.65);
    const pm = new THREE.MeshLambertMaterial({ color: 0xd22222 });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), pm);
      post.position.set(p0.x + side.x * s, trackH[0] + 4.5, p0.z + side.z * s);
      group.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width * 1.4, 1.6, 0.8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    beam.position.set(p0.x, trackH[0] + 9, p0.z);
    beam.lookAt(p0.x + dir.x, trackH[0] + 9, p0.z + dir.z);
    group.add(beam);

    // Panneaux de saut (flèches) avant chaque bosse
    const sm = new THREE.MeshLambertMaterial({ color: 0xffd400 });
    for (const j of def.jumps) {
      const i = (Math.round(j * SAMPLES) - 28 + SAMPLES) % SAMPLES, p = samples[i], nv = normalAt(i);
      for (const s of [-1, 1]) {
        const sign = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 4), sm);
        sign.position.set(p.x + nv.x * width * 0.62 * s, trackH[i] + 1, p.z + nv.z * width * 0.62 * s);
        group.add(sign);
      }
    }
    scene.add(group);
    return group;
  }

  // Pièces à ramasser : lignes sur la piste + arcs au-dessus des sauts
  function makeCoins() {
    const out = [];
    const rowAt = (i, lane, lift = 0) => {
      const p = samples[i], nv = normalAt(i), x = p.x + nv.x * lane, z = p.z + nv.z * lane;
      out.push({ x, y: heightAt(x, z, i) + 1.3 + lift, z, i, on: true });
    };
    const lanes = [-3.5, 0, 3.5];
    for (let i = 30, k = 0; i < SAMPLES - 10; i += 38, k++) {
      const lane = lanes[k % 3];
      for (let c = 0; c < 4; c++) rowAt((i + c * 3) % SAMPLES, lane);
    }
    for (const j of def.jumps) {
      const jc = Math.round(j * SAMPLES);
      for (let c = 0; c < 6; c++) rowAt((jc + 3 + c * 3) % SAMPLES, 0, Math.sin((c / 5) * Math.PI) * 5.5);
    }
    return out;
  }

  return { def, samples, SAMPLES, width, length, trackH, nearest, heightAt, normalAt, build, makeCoins };
}

export function disposeGroup(g) {
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  g.parent && g.parent.remove(g);
}
