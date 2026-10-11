import * as THREE from 'three';

// Piste fermée en boucle + fonction de hauteur du terrain.
const pts = [];
const N = 12;
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2;
  const r = 170 + Math.sin(i * 2.3) * 45 + Math.cos(i * 1.1) * 25;
  pts.push(new THREE.Vector3(Math.cos(a) * r * 1.2, 0, Math.sin(a) * r));
}
export const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
export const SAMPLES = 600;
export const TRACK_WIDTH = 16;
export const samples = curve.getSpacedPoints(SAMPLES - 1);
export const length = curve.getLength();

// Profil de hauteur le long de la piste : collines et bosses/sauts.
function trackHeight(u) {
  const t = u * Math.PI * 2;
  let h = Math.sin(t * 3) * 5 + Math.sin(t * 7 + 1) * 2;
  // bosses de saut
  const jumps = [0.12, 0.33, 0.58, 0.81];
  for (const j of jumps) {
    let d = Math.abs(u - j); d = Math.min(d, 1 - d);
    if (d < 0.012) h += Math.cos((d / 0.012) * Math.PI / 2) * 5;
  }
  return h;
}
export const trackH = samples.map((_, i) => trackHeight(i / SAMPLES));

function noise(x, z) {
  return Math.sin(x * 0.02) * 6 + Math.cos(z * 0.025) * 6 + Math.sin((x + z) * 0.05) * 3 + Math.sin(x * 0.11) * Math.cos(z * 0.09) * 1.2;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

let lastIdx = 0;
// Point de piste le plus proche (recherche locale rapide puis globale si besoin).
export function nearest(x, z, hint = -1) {
  let best = 1e18, bi = 0;
  const test = (i) => {
    const p = samples[i];
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) { best = d; bi = i; }
  };
  if (hint >= 0) {
    for (let k = -25; k <= 25; k++) test((hint + k + SAMPLES) % SAMPLES);
    if (best < 40 * 40) return { i: bi, d: Math.sqrt(best) };
    best = 1e18;
  }
  for (let i = 0; i < SAMPLES; i++) test(i);
  return { i: bi, d: Math.sqrt(best) };
}

export function heightAt(x, z, hint = -1) {
  const { i, d } = nearest(x, z, hint);
  const w = smooth(TRACK_WIDTH * 0.6, TRACK_WIDTH * 2.5, d);
  const h = trackH[i] * (1 - w) + (noise(x, z) + 8 * smooth(30, 80, d)) * w;
  return h;
}

export function buildWorld(scene) {
  const size = 900, seg = 220;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grass = new THREE.Color(0x4f8f3a), dirt = new THREE.Color(0xa0713a), rock = new THREE.Color(0x7a6a55);
  const c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k);
    const { i, d } = nearest(x, z);
    const w = smooth(TRACK_WIDTH * 0.6, TRACK_WIDTH * 2.5, d);
    const h = trackH[i] * (1 - w) + (noise(x, z) + 8 * smooth(30, 80, d)) * w;
    pos.setY(k, h);
    const edge = smooth(TRACK_WIDTH * 0.5, TRACK_WIDTH * 0.9, d);
    c.copy(dirt).lerp(grass, edge);
    if (h > 12) c.lerp(rock, Math.min(1, (h - 12) / 8));
    c.multiplyScalar(0.92 + Math.random() * 0.1);
    colors.set([c.r, c.g, c.b], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Arbres (instanciés) en dehors de la piste
  const trunkG = new THREE.CylinderGeometry(0.4, 0.6, 3, 6);
  const leafG = new THREE.ConeGeometry(2.6, 7, 7);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x6b4423 }), 500);
  const leaves = new THREE.InstancedMesh(leafG, new THREE.MeshLambertMaterial({ color: 0x1f6b2e }), 500);
  const m = new THREE.Matrix4();
  let n = 0, tries = 0;
  while (n < 500 && tries++ < 5000) {
    const x = (Math.random() - 0.5) * 860, z = (Math.random() - 0.5) * 860;
    const { d } = nearest(x, z);
    if (d < 28) continue;
    const y = heightAt(x, z);
    const s = 0.8 + Math.random() * 0.8;
    m.makeScale(s, s, s).setPosition(x, y + 1.5 * s, z);
    trunks.setMatrixAt(n, m);
    m.makeScale(s, s, s).setPosition(x, y + 6 * s, z);
    leaves.setMatrixAt(n, m);
    n++;
  }
  trunks.count = leaves.count = n;
  scene.add(trunks, leaves);

  // Ligne de départ + barrières de checkpoint visuelles
  const p0 = samples[0], p1 = samples[3];
  const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
  const line = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH * 1.2, 0.1, 1.5),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  line.position.set(p0.x, trackH[0] + 0.1, p0.z);
  line.lookAt(p0.x + dir.x, trackH[0] + 0.1, p0.z + dir.z);
  scene.add(line);
  const arch = new THREE.Group();
  const pm = new THREE.MeshLambertMaterial({ color: 0xd22 });
  const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(TRACK_WIDTH * 0.65);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), pm);
    post.position.set(p0.x + side.x * s, trackH[0] + 4.5, p0.z + side.z * s);
    arch.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH * 1.4, 1.6, 0.8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  beam.position.set(p0.x, trackH[0] + 9, p0.z);
  beam.lookAt(p0.x + dir.x, trackH[0] + 9, p0.z + dir.z);
  arch.add(beam);
  scene.add(arch);
}
