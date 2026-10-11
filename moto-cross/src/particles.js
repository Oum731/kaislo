import * as THREE from 'three';

// Particules : sprites doux (poussière, terre, étincelles) et sprites lumineux (flammes du nitro).
// Deux nuages de points recyclés — aucune allocation en jeu.
const N_SOFT = 520, N_GLOW = 220;

function puffTexture() {                      // petit nuage irrégulier généré par le code
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const blob = (px, py, r, a) => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(255,255,255,${a * 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); };
  blob(32, 32, 30, 0.85); blob(22, 28, 16, 0.5); blob(41, 36, 17, 0.5); blob(32, 19, 13, 0.4); blob(30, 45, 14, 0.4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

const VERT = `
attribute float aSize; attribute float aAlpha; attribute float aRot; attribute vec3 aColor;
uniform float uScale; varying float vAlpha; varying float vRot; varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.5), 0.0, 220.0);
  vAlpha = aAlpha; vRot = aRot; vColor = aColor;
}`;
const FRAG = `
uniform sampler2D uMap; varying float vAlpha; varying float vRot; varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float s = sin(vRot), c = cos(vRot);
  vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  float a = texture2D(uMap, q).a * vAlpha * smoothstep(0.5, 0.35, length(p));
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <colorspace_fragment>
}`;

function cloud(n, map, additive) {
  const geo = new THREE.BufferGeometry();
  const attrs = { position: 3, aColor: 3, aSize: 1, aAlpha: 1, aRot: 1 };
  for (const [k, sz] of Object.entries(attrs)) { const a = new THREE.BufferAttribute(new Float32Array(n * sz), sz); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); }
  const mat = new THREE.ShaderMaterial({ uniforms: { uMap: { value: map }, uScale: { value: 800 } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
  return { pts, geo, mat, n, head: 0, p: Array.from({ length: n }, () => ({ life: 0, max: 1 })) };
}

export function createParticles(scene) {
  const map = puffTexture();
  const soft = cloud(N_SOFT, map, false), glow = cloud(N_GLOW, map, true);
  scene.add(soft.pts, glow.pts);
  const col = new THREE.Color(), r = () => Math.random() - 0.5;

  function emit(sys, x, y, z, vx, vy, vz, color, size, life, grow, g, alpha, drag = 0) {
    const i = sys.head; sys.head = (i + 1) % sys.n;
    Object.assign(sys.p[i], { life, max: life, x, y, z, vx, vy, vz, size, grow, g, alpha, drag, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 1.2 });
    col.set(color); sys.geo.attributes.aColor.setXYZ(i, col.r, col.g, col.b);
  }
  function step(sys, dt) {
    const pos = sys.geo.attributes.position, size = sys.geo.attributes.aSize, al = sys.geo.attributes.aAlpha, rot = sys.geo.attributes.aRot;
    for (let i = 0; i < sys.n; i++) {
      const p = sys.p[i];
      if (p.life <= 0) { if (al.array[i] !== 0) al.array[i] = 0; continue; }
      p.life -= dt;
      const k = Math.exp(-p.drag * dt); p.vx *= k; p.vz *= k; p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      const t = Math.max(0, p.life / p.max);
      pos.setXYZ(i, p.x, p.y, p.z);
      size.array[i] = Math.max(0.01, p.size * (1 + p.grow * (1 - t)));
      al.array[i] = p.alpha * Math.min(1, t * 2.2) * (sys === glow ? 1 : (0.35 + 0.65 * t));
      rot.array[i] = p.rot;
    }
    pos.needsUpdate = size.needsUpdate = al.needsUpdate = rot.needsUpdate = true;
    sys.geo.attributes.aColor.needsUpdate = true;
  }
  return {
    // poussière soulevée par la roue arrière
    dust(x, y, z, color, speed) {
      const c = col.set(color).offsetHSL(0, -0.05, 0.12).getHex();
      emit(soft, x + r() * 0.5, y + 0.15, z + r() * 0.5, r() * 1.6, 0.6 + Math.random() * 1.1, r() * 1.6, c, 0.55 + Math.random() * 0.5, 0.9 + Math.random() * 0.7, 2.2, 0.15, 0.5, 1.4);
    },
    // gerbe de terre à l'atterrissage / à la chute
    burst(x, y, z, color, n = 18, power = 6) {
      for (let k = 0; k < n; k++) emit(soft, x + r(), y + 0.3, z + r(), r() * power, Math.random() * power * 0.7, r() * power, color, 0.5 + Math.random() * 0.7, 0.7 + Math.random() * 0.7, 1.8, -5, 0.65, 1.1);
    },
    // flamme du pot d'échappement (bleue en nitro)
    flame(x, y, z, vx, vz, boosted) {
      emit(glow, x + r() * 0.1, y, z + r() * 0.1, vx + r() * 1.2, r() * 0.8, vz + r() * 1.2, boosted ? 0x4fc8ff : 0xff9a22, boosted ? 0.55 : 0.32, 0.22 + Math.random() * 0.12, -0.5, 0, 0.9, 2);
    },
    spark(x, y, z, color = 0xffd070) {
      emit(glow, x, y, z, r() * 9, Math.random() * 6, r() * 9, color, 0.12, 0.35, -0.3, -14, 1, 0.3);
    },
    update(dt, camera, height = 540) {
      const s = (height * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
      soft.mat.uniforms.uScale.value = glow.mat.uniforms.uScale.value = s;
      step(soft, dt); step(glow, dt);
    },
  };
}
