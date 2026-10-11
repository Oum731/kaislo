import * as THREE from 'three';

// Système de particules : un seul InstancedMesh, tout est recyclé (aucune allocation en jeu).
const MAX = 400;
export function createParticles(scene) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ fog: true }), MAX);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color());
  scene.add(mesh);
  const P = Array.from({ length: MAX }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0, grow: 0, g: 0 }));
  let head = 0;
  const m = new THREE.Matrix4(), col = new THREE.Color(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();

  function emit(x, y, z, vx, vy, vz, color, size, life, grow = 0, g = 0) {
    const p = P[head]; const i = head; head = (head + 1) % MAX;
    Object.assign(p, { life, max: life, x, y, z, vx, vy, vz, size, grow, g });
    mesh.setColorAt(i, col.set(color));
  }
  const r = () => Math.random() - 0.5;
  return {
    dust(x, y, z, color, speed) {
      emit(x + r() * 0.6, y + 0.2, z + r() * 0.6, r() * 2, 1 + Math.random() * 1.5, r() * 2, color, 0.22 + Math.random() * 0.2, 0.6 + Math.random() * 0.4, 1.6, -1);
    },
    burst(x, y, z, color, n = 18, power = 6) {
      for (let k = 0; k < n; k++) emit(x, y + 0.3, z, r() * power, Math.random() * power * 0.7, r() * power, color, 0.4 + Math.random() * 0.4, 0.5 + Math.random() * 0.5, 1, -6);
    },
    flame(x, y, z, vx, vz, boosted) {
      emit(x + r() * 0.1, y, z + r() * 0.1, vx + r(), r() * 0.6, vz + r(), boosted ? 0x66ddff : 0xffaa22, 0.25 + Math.random() * 0.15, 0.25 + Math.random() * 0.15, -0.6, 0);
    },
    spark(x, y, z, color = 0xffee88) {
      emit(x, y, z, r() * 8, Math.random() * 6, r() * 8, color, 0.12, 0.35, -0.2, -14);
    },
    update(dt) {
      for (let i = 0; i < MAX; i++) {
        const p = P[i];
        if (p.life <= 0) { if (p.max) { mesh.setMatrixAt(i, zero); p.max = 0; } continue; }
        p.life -= dt;
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const t = Math.max(0, p.life / p.max);
        const sz = Math.max(0.001, p.size * (1 + p.grow * (1 - t)) * (0.25 + 0.75 * t));
        v.set(p.x, p.y, p.z); s.set(sz, sz, sz);
        mesh.setMatrixAt(i, m.compose(v, q, s));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
