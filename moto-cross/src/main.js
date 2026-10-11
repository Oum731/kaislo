import * as THREE from 'three';
import { samples, SAMPLES, TRACK_WIDTH, length, heightAt, nearest, buildWorld } from './track.js';
import { createMoto } from './moto.js';
import { startEngine, setEngine, stopEngine, beep } from './audio.js';
import { platform } from './platform.js';

const LAPS = 3, AI_COUNT = 5, METERS_PER_SAMPLE = length / SAMPLES;
const $ = (id) => document.getElementById(id);

// ---------- Rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ee);
scene.fog = new THREE.Fog(0x8ec9ee, 120, 420);
const camera = new THREE.PerspectiveCamera(70, 1, 0.5, 1200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x556b3a, 0.85));
const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
scene.add(sun, sun.target);
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
buildWorld(scene);

// ---------- Entrées ----------
const keys = {};
const map = { ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'nitro', ShiftRight: 'nitro', Space: 'nitro' };
addEventListener('keydown', (e) => {
  if (map[e.code]) { keys[map[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyR' && state !== 'menu') startRace();
});
addEventListener('keyup', (e) => { if (map[e.code]) keys[map[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
if ('ontouchstart' in window) {
  $('touch').style.display = 'block';
  for (const [id, k] of [['tL', 'left'], ['tR', 'right'], ['tB', 'nitro'], ['tG', 'up']]) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { keys[k] = true; e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { keys[k] = false; });
  }
}

// ---------- Pilotes ----------
const COLORS = [0xff5500, 0x2266ff, 0x22bb44, 0xffcc00, 0xaa22cc, 0xee2266];
const names = ['Vous', 'Rex', 'Nova', 'Kira', 'Zed', 'Maya'];
const player = { mesh: createMoto(COLORS[0]), isPlayer: true, name: 'Vous' };
scene.add(player.mesh);
const ais = [];
for (let i = 0; i < AI_COUNT; i++) {
  const a = { mesh: createMoto(COLORS[i + 1]), isPlayer: false, name: names[i + 1], skill: 0.9 + Math.random() * 0.14, lane: (Math.random() - 0.5) * 7 };
  scene.add(a.mesh); ais.push(a);
}
const all = [player, ...ais];

// ---------- État de course ----------
let state = 'menu', t = 0, raceTime = 0, finishOrder = [], camHeading = 0, lastIdx = 0;
let best = 0;
try { best = parseFloat(localStorage.getItem('motocross_best') || '0') || 0; } catch (e) {}

function resetRider(r, slot) {
  const idx = SAMPLES - 6 - Math.floor(slot / 2) * 8;
  const side = slot % 2 ? 3.5 : -3.5;
  const p = samples[idx], q = samples[(idx + 3) % SAMPLES];
  const dir = new THREE.Vector3().subVectors(q, p).normalize();
  r.heading = Math.atan2(dir.x, dir.z);
  r.x = p.x - dir.z * side; r.z = p.z + dir.x * side;
  r.y = heightAt(r.x, r.z, idx);
  r.speed = 0; r.vy = 0; r.grounded = true; r.pitch = 0; r.roll = 0;
  r.prog = idx - SAMPLES; r.idx = idx; r.finished = false; r.lap = 1; r.nitro = 1; r.finishTime = 0;
  r.aiProg = idx - SAMPLES;
}
function startRace() {
  all.forEach((r, i) => resetRider(r, i === 0 ? 3 : i < 4 ? i - 1 : i));
  finishOrder = []; raceTime = 0; state = 'countdown'; t = 0;
  camHeading = player.heading;
  $('menu').style.display = $('end').style.display = 'none';
  $('hud').style.display = 'block';
  startEngine();
  lastCount = 4;
  platform.gameplayStop();
}
let lastCount = 4;

function fmt(s) {
  const m = Math.floor(s / 60), sec = s - m * 60;
  return `${m}:${sec.toFixed(2).padStart(5, '0')}`;
}
const ordinal = (n) => (n === 1 ? '1er' : `${n}e`);

// ---------- Mise à jour du joueur ----------
function updatePlayer(dt) {
  const p = player, racing = state === 'racing';
  const up = racing && keys.up, down = racing && keys.down;
  const steer = racing ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0; // + = gauche
  const nitroOn = racing && keys.nitro && p.nitro > 0 && p.speed > 5;
  if (nitroOn) p.nitro = Math.max(0, p.nitro - dt * 0.35); else p.nitro = Math.min(1, p.nitro + dt * 0.06);

  const nr = nearest(p.x, p.z, lastIdx);
  lastIdx = nr.i;
  const offTrack = nr.d > TRACK_WIDTH * 0.62;
  const maxSpeed = (nitroOn ? 62 : 44) * (offTrack ? 0.6 : 1);

  if (p.grounded) {
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    const slope = (heightAt(p.x + fx, p.z + fz, lastIdx) - heightAt(p.x - fx, p.z - fz, lastIdx)) / 2;
    if (up) p.speed += (nitroOn ? 40 : 22) * dt;
    if (down) p.speed -= 45 * dt;
    p.speed -= slope * 9.8 * 0.7 * dt;
    p.speed -= p.speed * (offTrack ? 0.35 : 0.06) * dt; // frottements
    if (p.speed > maxSpeed) p.speed -= (p.speed - maxSpeed) * 2.5 * dt;
    p.speed = Math.max(0, p.speed);
    p.heading += steer * (1.9 - p.speed / 45) * Math.min(1, p.speed / 8) * dt;
  } else {
    p.heading += steer * 0.5 * dt;
    if (nitroOn) p.speed = Math.min(maxSpeed, p.speed + 10 * dt);
  }

  const nx = Math.max(-440, Math.min(440, p.x + Math.sin(p.heading) * p.speed * dt));
  const nz = Math.max(-440, Math.min(440, p.z + Math.cos(p.heading) * p.speed * dt));
  const ground = heightAt(nx, nz, lastIdx);
  const G = 24;
  if (p.grounded) {
    const predicted = p.y + p.vy * dt - 0.5 * G * dt * dt;
    if (ground < predicted - 0.03 && p.speed > 6) { p.grounded = false; }
    else { p.vy = (ground - p.y) / dt; p.vy = Math.max(-30, Math.min(30, p.vy)); p.y = ground; }
  }
  if (!p.grounded) {
    p.vy -= G * dt;
    p.y += p.vy * dt;
    if (p.y <= ground) {
      if (p.vy < -18) p.speed *= 0.88;
      p.y = ground; p.vy = 0; p.grounded = true;
    }
  }
  p.x = nx; p.z = nz;

  // Orientation visuelle
  const slopeAng = Math.atan2(p.vy, Math.max(p.speed, 1));
  const targetPitch = -slopeAng * (p.grounded ? 0.8 : 1);
  p.pitch += (targetPitch - p.pitch) * Math.min(1, 8 * dt);
  p.roll += (-steer * 0.55 - p.roll) * Math.min(1, 6 * dt); // gauche = -z roll

  // Progression
  advanceProgress(p, nr.i);
  setEngine(p.speed / 62, up ? 1 : 0.2, nitroOn);
  p.nitroOn = nitroOn;
}

function advanceProgress(r, i) {
  let d = i - (r.idx % SAMPLES);
  if (d > SAMPLES / 2) d -= SAMPLES; else if (d < -SAMPLES / 2) d += SAMPLES;
  r.prog += d; r.idx = i;
  r.lap = Math.max(1, Math.min(LAPS, Math.floor(r.prog / SAMPLES) + 1));
  if (!r.finished && r.prog >= LAPS * SAMPLES) {
    r.finished = true; r.finishTime = raceTime;
    finishOrder.push(r);
  }
}

// ---------- IA ----------
function updateAI(a, dt) {
  const racing = state === 'racing';
  const i0 = ((Math.floor(a.aiProg) % SAMPLES) + SAMPLES) % SAMPLES;
  const i1 = (i0 + 6) % SAMPLES, i2 = (i0 + 14) % SAMPLES;
  const d1 = new THREE.Vector2(samples[i1].x - samples[i0].x, samples[i1].z - samples[i0].z).normalize();
  const d2 = new THREE.Vector2(samples[i2].x - samples[i1].x, samples[i2].z - samples[i1].z).normalize();
  const curv = Math.acos(Math.min(1, Math.max(-1, d1.dot(d2))));
  const rubber = THREE.MathUtils.clamp(1 + (player.prog - a.prog) * 0.0012, 0.9, 1.1);
  const target = racing ? 41 * a.skill * rubber * (1 - Math.min(0.45, curv * 4.5)) : 0;
  a.speed += (target - a.speed) * Math.min(1, 1.6 * dt);
  a.aiProg += (a.speed * dt) / METERS_PER_SAMPLE;
  const f = a.aiProg - Math.floor(a.aiProg);
  const ia = ((Math.floor(a.aiProg) % SAMPLES) + SAMPLES) % SAMPLES, ib = (ia + 1) % SAMPLES;
  const pa = samples[ia], pb = samples[ib];
  const tx = pb.x - pa.x, tz = pb.z - pa.z, tl = Math.hypot(tx, tz) || 1;
  const x = pa.x + tx * f - (tz / tl) * a.lane, z = pa.z + tz * f + (tx / tl) * a.lane;
  const hd = Math.atan2(tx, tz);
  let dh = hd - a.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  a.heading += dh * Math.min(1, 8 * dt);
  const y = heightAt(x, z, ia);
  a.vy = (y - a.y) / Math.max(dt, 1e-3);
  a.x = x; a.y = y; a.z = z;
  a.pitch += (-Math.atan2(a.vy, Math.max(a.speed, 1)) * 0.8 - a.pitch) * Math.min(1, 8 * dt);
  a.roll += (-THREE.MathUtils.clamp(dh * 2, -0.5, 0.5) - a.roll) * Math.min(1, 6 * dt);
  a.prog = a.aiProg;
  a.idx = ia;
  a.lap = Math.max(1, Math.min(LAPS, Math.floor(a.prog / SAMPLES) + 1));
  if (!a.finished && a.prog >= LAPS * SAMPLES) { a.finished = true; a.finishTime = raceTime; finishOrder.push(a); }
}

function applyMesh(r, dt) {
  r.mesh.position.set(r.x, r.y, r.z);
  r.mesh.rotation.y = r.heading;
  const { body, front, rear } = r.mesh.userData;
  body.rotation.x = r.pitch; body.rotation.z = r.roll;
  front.rotation.x = rear.rotation.x = (front.rotation.x + (r.speed * dt) / 0.55) % (Math.PI * 2);
}

// ---------- Boucle ----------
function rank() {
  return [...all].sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishTime - b.finishTime : b.prog - a.prog)).indexOf(player) + 1;
}

function endRace() {
  state = 'finished';
  stopEngine(); platform.gameplayStop();
  const place = finishOrder.indexOf(player) + 1;
  const time = player.finishTime;
  let rec = '';
  if (!best || time < best) {
    best = time; rec = ' — Nouveau record !';
    try { localStorage.setItem('motocross_best', String(time)); } catch (e) {}
  }
  if (place === 1) platform.happytime();
  $('endTitle').textContent = place === 1 ? '🏆 VICTOIRE !' : `${ordinal(place)} place`;
  $('endInfo').textContent = `Temps : ${fmt(time)}${rec}`;
  $('hud').style.display = 'none';
  $('end').style.display = 'flex';
}

let prev = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  t += dt;
  if (state === 'menu') {
    // Caméra qui tourne au-dessus de la piste
    const a = t * 0.1;
    camera.position.set(Math.cos(a) * 300, 90, Math.sin(a) * 250);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    return;
  }
  if (state === 'countdown') {
    const c = 3 - Math.floor(t);
    if (c !== lastCount) {
      lastCount = c;
      if (c > 0) { $('big').textContent = c; beep(500); }
      else { $('big').textContent = 'GO !'; beep(900, 0.4); state = 'racing'; platform.gameplayStart(); setTimeout(() => { if (state !== 'countdown') $('big').textContent = ''; }, 800); }
    }
  }
  if (state === 'racing' || state === 'finished' || state === 'countdown') {
    if (state === 'racing') raceTime += dt;
    updatePlayer(dt);
    ais.forEach((a) => updateAI(a, dt));
    if (state === 'racing' && player.finished) endRace();
  }
  all.forEach((r) => applyMesh(r, dt));

  // Caméra de poursuite
  let dh = player.heading - camHeading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  camHeading += dh * Math.min(1, 4 * dt);
  const back = 9 + player.speed * 0.04;
  const cx = player.x - Math.sin(camHeading) * back, cz = player.z - Math.cos(camHeading) * back;
  const cy = Math.max(player.y + 4.2, heightAt(cx, cz, lastIdx) + 2);
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, 10 * dt));
  camera.lookAt(player.x + Math.sin(camHeading) * 6, player.y + 1.8, player.z + Math.cos(camHeading) * 6);
  camera.fov += ((68 + player.speed * 0.45 + (player.nitroOn ? 8 : 0)) - camera.fov) * Math.min(1, 4 * dt);
  camera.updateProjectionMatrix();
  sun.position.set(player.x + 60, player.y + 90, player.z + 40);
  sun.target.position.set(player.x, player.y, player.z);

  // HUD
  if (state !== 'menu') {
    $('pos').textContent = `Position ${rank()}/${all.length}`;
    $('lap').textContent = `Tour ${player.lap}/${LAPS}`;
    $('time').textContent = fmt(raceTime);
    $('best').textContent = best ? `Record ${fmt(best)}` : '';
    $('speed').innerHTML = `${Math.round(player.speed * 3.6)} <small>km/h</small>`;
    $('nitro').style.width = `${player.nitro * 100}%`;
  }
  renderer.render(scene, camera);
}

$('play').onclick = startRace;
$('again').onclick = async () => { await platform.showMidgameAd(); startRace(); };
resetRider(player, 3); ais.forEach((a, i) => resetRider(a, i < 3 ? i : i + 1)); all.forEach((r) => applyMesh(r, 0));
requestAnimationFrame(frame);
