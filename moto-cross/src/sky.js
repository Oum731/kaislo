import * as THREE from 'three';
import sunnyUrl from './env/sunny.jpg?inline';
import overcastUrl from './env/overcast.jpg?inline';
import blueUrl from './env/blue.jpg?inline';

// Ciel procédural : dégradé zénith → horizon, soleil et halo, nuages animés, étoiles la nuit.
// L'horizon a la couleur du brouillard : le terrain se fond naturellement dans le ciel.
// La même image sert aussi de carte d'environnement : les reflets des motos viennent du vrai ciel.
const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;           // toujours au fond de la scène
}`;
const FRAG = `
uniform vec3 uTop, uHorizon, uSun, uSunDir;
uniform float uTime, uCloud, uStars, uDark;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.5));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSun * (pow(sd, 8.0) * 0.22 + pow(sd, 90.0) * 0.5 + pow(sd, 1500.0) * 3.0);      // halo + disque
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.2) * 0.9 + vec2(uTime * 0.012, uTime * 0.004);
    float c = fbm(uv * 1.3);
    c = smoothstep(0.52 - uCloud * 0.22, 0.88, c) * uCloud;
    float lit = clamp(0.55 + 0.45 * dot(normalize(vec3(d.x, 0.2, d.z)), normalize(vec3(uSunDir.x, 0.2, uSunDir.z))), 0.0, 1.0);
    vec3 cloudCol = mix(uHorizon * 0.55 * uDark, mix(vec3(1.0), uSun, 0.15) * (0.6 + 0.4 * lit) * uDark, lit);
    col = mix(col, cloudCol, c * smoothstep(0.0, 0.18, d.y));
    if (uStars > 0.0) { vec3 g = floor(d * 220.0); float s = step(0.9965, hash(g.xy + g.z * 7.0)); col += vec3(s) * uStars * smoothstep(0.08, 0.5, d.y) * (1.0 - c); }
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSky(scene, renderer) {
  const uniforms = {
    uTop: { value: new THREE.Color(0x4f8fe0) }, uHorizon: { value: new THREE.Color(0xbfdcf2) }, uSun: { value: new THREE.Color(0xfff2d0) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.75, 0.33) }, uTime: { value: 0 }, uCloud: { value: 0.6 }, uStars: { value: 0 }, uDark: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
  const geo = new THREE.SphereGeometry(500, 32, 20);
  const dome = new THREE.Mesh(geo, mat); dome.renderOrder = -10; dome.frustumCulled = false;
  scene.add(dome);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(geo, mat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, photoRT = null, want = null;
  const photos = { sunny: sunnyUrl, overcast: overcastUrl, blue: blueUrl }, cache = {};
  const usePhoto = (name, intensity) => {
    want = name;
    if (!name || !photos[name]) { scene.environmentIntensity = 1; return; }
    const apply = () => { if (want !== name) return; scene.environment = cache[name].texture; scene.environmentIntensity = intensity ?? 1; };
    if (cache[name]) { apply(); return; }
    new THREE.TextureLoader().load(photos[name], (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
      cache[name] = pmrem.fromEquirectangular(tex); tex.dispose(); apply();
    });
  };
  return {
    sunDir: uniforms.uSunDir.value,
    // top = zénith, horizon = couleur du brouillard ; opts : cloud (0-1), stars (0-1), dark (assombrit les nuages)
    setLook(top, horizon, sunColor, sunOffset, opts = {}) {
      uniforms.uTop.value.set(top); uniforms.uHorizon.value.set(horizon); uniforms.uSun.value.set(sunColor);
      uniforms.uSunDir.value.copy(sunOffset).normalize();
      uniforms.uCloud.value = opts.cloud ?? 0.6; uniforms.uStars.value = opts.stars ?? 0; uniforms.uDark.value = opts.dark ?? 1;
      if (envRT) envRT.dispose();
      envRT = pmrem.fromScene(envScene, 0.02);
      scene.environment = envRT.texture;
      usePhoto(opts.photo, opts.photoK);
    },
    update(t, camera) { uniforms.uTime.value = t; dome.position.copy(camera.position); },
  };
}
