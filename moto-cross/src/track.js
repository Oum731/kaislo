import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = (h) => new THREE.Color(h);

// Définition des 3 pistes : forme, relief, sauts, ambiance.
export const TRACKS = [
  {
    id: 'forest', name: 'Forêt de Kaislo', points: 12, width: 16, grip: 1,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 170 + Math.sin(i * 2.3) * 45 + Math.cos(i * 1.1) * 25; return [Math.cos(a) * r * 1.2, Math.sin(a) * r]; },
    hill: 5, jumps: [0.12, 0.33, 0.58, 0.81], noiseAmp: 1,
    sky: 0x8ec9ee, fog: 0x8ec9ee, dirt: 0xa0713a, ground: 0x4f8f3a, rock: 0x7a6a55, dust: 0xb08a5a, sunColor: 0xfff2d0,
    props: [{ kind: 'pine', count: 520, leaf: 0x1f6b2e, trunk: 0x6b4423 }],
  },
  {
    id: 'desert', name: 'Canyon du Désert', points: 16, width: 17, grip: 0.95,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 230 + Math.sin(a * 3 + 0.5) * 65 + Math.cos(a * 5) * 28; return [Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.9]; },
    hill: 7, jumps: [0.08, 0.22, 0.37, 0.52, 0.66, 0.85], noiseAmp: 1.6,
    sky: 0xf2c48a, fog: 0xf0cfa0, dirt: 0xd9a05b, ground: 0xe6c27a, rock: 0xb5683a, dust: 0xe0b878, sunColor: 0xffe0a0,
    props: [{ kind: 'cactus', count: 260, leaf: 0x3e8a3a }, { kind: 'rock', count: 160, leaf: 0xa5683c }],
  },
  {
    id: 'snow', name: 'Glacier Alpin', points: 14, width: 14, grip: 0.8,
    shape: (i, n) => { const a = (i / n) * Math.PI * 2; const r = 160 + Math.sin(a * 4) * 55 + Math.cos(a * 2 + 1) * 30; return [Math.cos(a) * r * 1.15, Math.sin(a) * r]; },
    hill: 6, jumps: [0.1, 0.3, 0.55, 0.78], noiseAmp: 1.3,
    sky: 0xbcd9ef, fog: 0xd6e6f2, dirt: 0xcfd8e2, ground: 0xf4f8fc, rock: 0x8f9aa8, dust: 0xffffff, sunColor: 0xeaf2ff,
    props: [{ kind: 'pine', count: 480, leaf: 0xe8f2f8, trunk: 0x5a4632 }, { kind: 'rock', count: 90, leaf: 0x8a95a3 }],
  },
];

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
      c.multiplyScalar(0.93 + Math.random() * 0.09);
      colors.set([c.r, c.g, c.b], q * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true;
    group.add(mesh);

    // Décor instancié
    const m = new THREE.Matrix4();
    for (const pr of def.props) {
      const parts = pr.kind === 'pine'
        ? [[new THREE.CylinderGeometry(0.4, 0.6, 3, 6), pr.trunk, 1.5], [new THREE.ConeGeometry(2.6, 7, 7), pr.leaf, 6]]
        : pr.kind === 'cactus'
          ? [[new THREE.CylinderGeometry(0.5, 0.6, 5, 7), pr.leaf, 2.5], [new THREE.CylinderGeometry(0.3, 0.3, 2, 6), pr.leaf, 3.4, 0.9]]
          : [[new THREE.DodecahedronGeometry(1.6, 0), pr.leaf, 0.6]];
      const total = Math.round(pr.count * q.trees);
      const meshes = parts.map(([g, col]) => new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: col, flatShading: true }), total));
      let n = 0, tries = 0;
      while (n < total && tries++ < total * 12) {
        const x = (Math.random() - 0.5) * 860, z = (Math.random() - 0.5) * 860;
        const { d, th } = nearest(x, z);
        if (d < width * 1.8) continue;
        const y = blend(th, d, x, z), s = 0.7 + Math.random() * 0.9;
        parts.forEach(([, , yo, xo = 0], pi) => { m.makeScale(s, s, s).setPosition(x + xo * s, y + yo * s, z); meshes[pi].setMatrixAt(n, m); });
        n++;
      }
      meshes.forEach((mm) => { mm.count = n; mm.castShadow = false; group.add(mm); });
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
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  g.parent && g.parent.remove(g);
}
