import * as THREE from 'three';
import { TRACKS, createTrack, disposeGroup } from './track.js';
import { BIKES, createMoto } from './moto.js';
import { createParticles } from './particles.js';
import { startEngine, setEngine, stopEngine, beep } from './audio.js';
import { platform } from './platform.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const LAPS = 3, AI_COUNT = 5, TAU = Math.PI * 2;
const DIFFS = [{ name: 'Facile', k: 0.86 }, { name: 'Normal', k: 0.97 }, { name: 'Difficile', k: 1.07 }];
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;

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
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const fx = createParticles(scene);

// ---------- Réglages sauvegardés ----------
const sel = { track: 0, bike: 0, diff: 1 };
try { Object.assign(sel, JSON.parse(localStorage.getItem('motocross_sel') || '{}')); } catch (e) {}
sel.track = clamp(sel.track | 0, 0, TRACKS.length - 1); sel.bike = clamp(sel.bike | 0, 0, BIKES.length - 1); sel.diff = clamp(sel.diff | 0, 0, DIFFS.length - 1);
const saveSel = () => { try { localStorage.setItem('motocross_sel', JSON.stringify(sel)); } catch (e) {} };

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
  for (const [id, k] of [['tL', 'left'], ['tR', 'right'], ['tB', 'nitro'], ['tG', 'up'], ['tD', 'down']]) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { keys[k] = true; e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { keys[k] = false; });
  }
}

// ---------- Piste ----------
let track, worldGroup, MPS, best = 0;
function loadTrack(i) {
  if (worldGroup) disposeGroup(worldGroup);
  const def = TRACKS[i];
  track = createTrack(def);
  worldGroup = track.build(scene);
  MPS = track.length / track.SAMPLES;
  scene.background.set(def.sky); scene.fog.color.set(def.fog); sun.color.set(def.sunColor);
  best = 0;
  try { best = parseFloat(localStorage.getItem('motocross_best_' + def.id) || '0') || 0; } catch (e) {}
}

// ---------- Pilotes ----------
let bike = BIKES[sel.bike];
const player = { isPlayer: true, mesh: null };
const aiStyles = [1, 2, 3, 0, 1];
const aiColors = [0x2266ff, 0xffcc00, 0xee2266, 0x22bb44, 0x22cccc];
const ais = [];
for (let i = 0; i < AI_COUNT; i++) {
  const a = { mesh: createMoto(aiColors[i], aiStyles[i], i + 2), isPlayer: false, skill: 0.92 + Math.random() * 0.12, laneBase: (Math.random() - 0.5) * 8 };
  scene.add(a.mesh); ais.push(a);
}
const all = [player, ...ais];
function setPlayerBike() {
  bike = BIKES[sel.bike];
  if (player.mesh) scene.remove(player.mesh);
  player.mesh = createMoto(bike.color, bike.style, 1);
  scene.add(player.mesh);
}

function resetRider(r, slot) {
  const S = track.SAMPLES, idx = S - 6 - Math.floor(slot / 2) * 8;
  const side = slot % 2 ? 3.5 : -3.5;
  const p = track.samples[idx], q = track.samples[(idx + 3) % S];
  const dir = new THREE.Vector3().subVectors(q, p).normalize();
  r.heading = Math.atan2(dir.x, dir.z);
  r.x = p.x - dir.z * side; r.z = p.z + dir.x * side;
  r.y = track.heightAt(r.x, r.z, idx);
  Object.assign(r, { speed: 0, vy: 0, grounded: true, pitch: 0, roll: 0, spinX: 0, spinZ: 0, crashTilt: 0, stun: 0, prog: idx - S, aiProg: idx - S, idx, finished: false, lap: 1, nitro: 0.6, finishTime: 0, lane: side, lat: side, dustAcc: 0, nitroOn: false, hitCd: 0, wasAir: false });
}
const gridSlot = (i) => (i === 0 ? 3 : i < 4 ? i - 1 : i);

// ---------- État de course ----------
let state = 'menu', t = 0, raceTime = 0, finishOrder = [], camHeading = 0, lastIdx = 0, lastCount = 4, shake = 0;

function startRace() {
  all.forEach((r, i) => resetRider(r, gridSlot(i)));
  lastIdx = player.idx;
  finishOrder = []; raceTime = 0; state = 'countdown'; t = 0; lastCount = 4;
  camHeading = player.heading;
  $('menu').style.display = $('end').style.display = 'none';
  $('hud').style.display = 'block';
  $('trick').style.opacity = 0;
  startEngine(); platform.gameplayStop();
}
const fmt = (s) => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`; };
const ordinal = (n) => (n === 1 ? '1er' : `${n}e`);

// ---------- Figures ----------
let trickTimer;
function showTrick(txt, bad) {
  const el = $('trick'); el.textContent = txt; el.className = bad ? 'crash' : ''; el.style.opacity = 1;
  clearTimeout(trickTimer); trickTimer = setTimeout(() => { el.style.opacity = 0; }, 1400);
}
const trickName = (nx, nz) => {
  const parts = [];
  if (nx) parts.push(`${Math.abs(nx) > 1 ? Math.abs(nx) + 'x ' : ''}${nx > 0 ? 'FRONT FLIP' : 'BACK FLIP'}`);
  if (nz) parts.push(`${Math.abs(nz) > 1 ? Math.abs(nz) + 'x ' : ''}WHIP`);
  return parts.join(' + ');
};
function landPlayer(p, impact) {
  if (import.meta.env.DEV) (window.__lands ||= []).push({ prog: Math.round(p.prog), spinX: +p.spinX.toFixed(2), spinZ: +p.spinZ.toFixed(2), impact: +impact.toFixed(1), air: +(p.airT || 0).toFixed(2) });
  const nx = Math.round(p.spinX / TAU), nz = Math.round(p.spinZ / TAU);
  const rx = p.spinX - nx * TAU, rz = p.spinZ - nz * TAU;
  const spun = Math.abs(p.spinX) > 1.2 || Math.abs(p.spinZ) > 1.2;
  p.spinX = rx; p.spinZ = rz;
  const dust = TRACKS[sel.track].dust;
  if (spun && (Math.abs(rx) > 0.9 || Math.abs(rz) > 0.9)) {
    p.stun = 1.2; p.crashSign = Math.random() < 0.5 ? -1 : 1; p.speed *= 0.3;
    fx.burst(p.x, p.y, p.z, dust, 30, 9); shake = 1; beep(90, 0.3);
    showTrick('CHUTE !', true);
    return;
  }
  if (nx || nz) {
    const n = Math.abs(nx) + Math.abs(nz);
    p.nitro = Math.min(1, p.nitro + 0.3 * n);
    showTrick(`${trickName(nx, nz)}  +NITRO`, false); beep(1100, 0.2);
  }
  if (impact < -12) { fx.burst(p.x, p.y, p.z, dust, 14, 5); shake = Math.max(shake, 0.4); beep(130, 0.12); }
  if (impact < -18) p.speed *= 0.9;
}

// ---------- Joueur ----------
function updatePlayer(dt) {
  const p = player, racing = state === 'racing', ctl = racing && p.stun <= 0, def = TRACKS[sel.track], grip = def.grip;
  p.stun = Math.max(0, p.stun - dt);
  const up = ctl && keys.up, down = ctl && keys.down;
  const steer = ctl ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0; // + = gauche
  const nitroOn = ctl && keys.nitro && p.nitro > 0 && p.speed > 5;
  p.nitro = nitroOn ? Math.max(0, p.nitro - dt * 0.3) : Math.min(1, p.nitro + dt * 0.05);
  p.nitroOn = nitroOn;

  const nr = track.nearest(p.x, p.z, lastIdx);
  lastIdx = nr.i;
  const nl = track.normalAt(nr.i), sp = track.samples[nr.i];
  p.lat = (p.x - sp.x) * nl.x + (p.z - sp.z) * nl.z;
  const offTrack = nr.d > track.width * 0.62;
  const maxSpeed = (bike.max + (nitroOn ? 16 * bike.nitro : 0)) * (offTrack ? 0.6 : 1);

  if (p.grounded) {
    const fx_ = Math.sin(p.heading), fz_ = Math.cos(p.heading);
    const slope = (track.heightAt(p.x + fx_, p.z + fz_, lastIdx) - track.heightAt(p.x - fx_, p.z - fz_, lastIdx)) / 2;
    if (up) p.speed += (bike.acc + (nitroOn ? 18 : 0)) * dt;
    if (down) p.speed -= 45 * grip * dt;
    if (p.stun > 0) p.speed -= p.speed * 2.2 * dt;
    p.speed -= slope * 9.8 * 0.7 * dt;
    p.speed -= p.speed * (offTrack ? 0.35 : 0.06) * dt;
    if (p.speed > maxSpeed) p.speed -= (p.speed - maxSpeed) * 2.5 * dt;
    p.speed = Math.max(0, p.speed);
    p.heading += steer * (1.9 - p.speed / 48) * bike.handling * Math.min(1, grip + 0.1) * Math.min(1, p.speed / 8) * dt;
  } else {
    p.heading += steer * 0.15 * dt;
    if (ctl) { // figures
      p.spinX += ((keys.up ? 1 : 0) - (keys.down ? 1 : 0)) * 7 * dt;
      p.spinZ -= steer * 6 * dt;
    }
    if (nitroOn) p.speed = Math.min(maxSpeed, p.speed + 10 * dt);
  }

  const nx = clamp(p.x + Math.sin(p.heading) * p.speed * dt, -440, 440);
  const nz = clamp(p.z + Math.cos(p.heading) * p.speed * dt, -440, 440);
  const ground = track.heightAt(nx, nz, lastIdx), G = 24;
  if (p.grounded) {
    const predicted = p.y + p.vy * dt - 0.5 * G * dt * dt;
    if (ground < predicted - 0.03 && p.speed > 6) { p.grounded = false; p.airT = 0; p.spinX = p.spinZ = 0; }
    else { p.vy = clamp((ground - p.y) / dt, -30, 30); p.y = ground; }
  }
  if (!p.grounded) {
    p.vy -= G * dt; p.y += p.vy * dt; p.airT = (p.airT || 0) + dt;
    if (p.y <= ground) { const impact = p.vy; p.y = ground; p.vy = 0; p.grounded = true; landPlayer(p, impact); }
  }
  p.x = nx; p.z = nz;

  // Orientation visuelle
  const targetPitch = -Math.atan2(p.vy, Math.max(p.speed, 1)) * (p.grounded ? 0.8 : 1);
  const k = Math.min(1, 8 * dt);
  if (p.grounded) { const d = Math.min(1, 14 * dt); p.spinX -= p.spinX * d; p.spinZ -= p.spinZ * d; p.pitch += (targetPitch - p.pitch) * k; }
  else p.pitch += (targetPitch - p.pitch) * Math.min(1, 3 * dt);
  p.roll += (-steer * 0.55 - p.roll) * Math.min(1, 6 * dt);
  p.crashTilt += ((p.stun > 0.3 ? 1.35 * (p.crashSign || 1) : 0) - p.crashTilt) * Math.min(1, 10 * dt);

  advanceProgress(p, nr.i);
  setEngine(p.speed / 62, up ? 1 : 0.2, nitroOn);
}

function advanceProgress(r, i) {
  const S = track.SAMPLES;
  let d = i - (r.idx % S);
  if (d > S / 2) d -= S; else if (d < -S / 2) d += S;
  r.prog += d; r.idx = i;
  r.lap = clamp(Math.floor(r.prog / S) + 1, 1, LAPS);
  if (!r.finished && r.prog >= LAPS * S) { r.finished = true; r.finishTime = raceTime; finishOrder.push(r); }
}

// ---------- IA ----------
const _a = new THREE.Vector2(), _b = new THREE.Vector2();
function updateAI(a, dt) {
  const S = track.SAMPLES, racing = state === 'racing', sm = track.samples;
  const i0 = ((Math.floor(a.aiProg) % S) + S) % S, i1 = (i0 + 6) % S, i2 = (i0 + 14) % S;
  _a.set(sm[i1].x - sm[i0].x, sm[i1].z - sm[i0].z).normalize();
  _b.set(sm[i2].x - sm[i1].x, sm[i2].z - sm[i1].z).normalize();
  const curv = Math.acos(clamp(_a.dot(_b), -1, 1));
  const rubber = clamp(1 + (player.prog - a.prog) * 0.0012, 0.9, 1.1);
  const target = racing ? 42 * a.skill * DIFFS[sel.diff].k * rubber * (1 - Math.min(0.45, curv * 4.5)) : 0;
  a.speed += (target - a.speed) * Math.min(1, 1.6 * dt);
  a.aiProg += (a.speed * dt) / MPS;

  // Évite les pilotes juste devant
  const lim = track.width * 0.42;
  for (const r of all) {
    if (r === a) continue;
    const gap = (r.prog - a.prog) * MPS, rl = r.isPlayer ? r.lat : r.lane;
    if (gap > 0 && gap < 9 && Math.abs(rl - a.lane) < 2.4) a.lane += ((a.lane - rl) >= 0 ? 1 : -1) * 6 * dt;
  }
  a.lane = clamp(a.lane + (a.laneBase - a.lane) * 0.5 * dt, -lim, lim);

  const f = a.aiProg - Math.floor(a.aiProg), ia = i0, ib = (ia + 1) % S, pa = sm[ia], pb = sm[ib];
  const tx = pb.x - pa.x, tz = pb.z - pa.z, tl = Math.hypot(tx, tz) || 1;
  const x = pa.x + tx * f - (tz / tl) * a.lane, z = pa.z + tz * f + (tx / tl) * a.lane;
  let dh = Math.atan2(tx, tz) - a.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  a.heading += dh * Math.min(1, 8 * dt);
  const y = track.heightAt(x, z, ia);
  a.vy = (y - a.y) / Math.max(dt, 1e-3);
  const airborne = a.vy < -14 || a.vy > 18;
  a.x = x; a.y = y; a.z = z; a.grounded = !airborne;
  a.pitch += (-Math.atan2(a.vy, Math.max(a.speed, 1)) * 0.8 - a.pitch) * Math.min(1, 8 * dt);
  a.roll += (-clamp(dh * 2, -0.5, 0.5) - a.roll) * Math.min(1, 6 * dt);
  a.prog = a.aiProg; a.idx = ia;
  a.lap = clamp(Math.floor(a.prog / S) + 1, 1, LAPS);
  if (!a.finished && a.prog >= LAPS * S) { a.finished = true; a.finishTime = raceTime; finishOrder.push(a); }
}

// ---------- Collisions joueur / IA ----------
function collide(dt) {
  player.hitCd = Math.max(0, player.hitCd - dt);
  if (state !== 'racing') return;
  const R = 1.5, lim = track.width * 0.42;
  for (const a of ais) {
    const dx = player.x - a.x, dz = player.z - a.z, d = Math.hypot(dx, dz);
    if (d >= R || d < 0.001 || Math.abs(player.y - a.y) > 2.2) continue;
    const nx = dx / d, nz = dz / d, ov = R - d, nl = track.normalAt(a.idx);
    player.x += nx * ov * 0.7; player.z += nz * ov * 0.7;
    a.lane = clamp(a.lane - (nx * nl.x + nz * nl.z) * ov * 1.8, -lim, lim);
    const rel = player.speed - a.speed;
    if (rel > 0) { player.speed -= rel * 0.3; a.speed += rel * 0.3; }
    if (player.hitCd <= 0 && (rel > 4 || ov > 0.5)) {
      player.hitCd = 0.3; shake = Math.max(shake, 0.35); beep(170, 0.1);
      for (let k = 0; k < 6; k++) fx.spark(player.x - nx * 0.7, player.y + 1, player.z - nz * 0.7);
    }
  }
}

// ---------- Effets (poussière, flammes) ----------
function emitFX(r, dt) {
  const sx = Math.sin(r.heading), sz = Math.cos(r.heading);
  if (r.grounded && r.speed > 7 && state !== 'menu') {
    r.dustAcc += r.speed * dt * (r.isPlayer ? 0.9 : 0.45);
    while (r.dustAcc >= 1) { r.dustAcc -= 1; fx.dust(r.x - sx * 1.0, r.y, r.z - sz * 1.0, TRACKS[sel.track].dust, r.speed); }
  }
  if (r.nitroOn) for (let k = 0; k < 3; k++) fx.flame(r.x - sx * 1.5, r.y + 0.9, r.z - sz * 1.5, -sx * 9, -sz * 9, true);
  else if (r.isPlayer && state === 'racing' && r.speed > 3 && keys.up && Math.random() < 0.3) fx.flame(r.x - sx * 1.5, r.y + 0.9, r.z - sz * 1.5, -sx * 4, -sz * 4, false);
}

function applyMesh(r, dt) {
  r.mesh.position.set(r.x, r.y, r.z);
  r.mesh.rotation.y = r.heading;
  const { body, front, rear, wheelR, steer, upper } = r.mesh.userData;
  steer.rotation.y = -r.roll * 0.55;
  upper.rotation.z = r.roll * 0.3; upper.rotation.x = clamp(-r.pitch * 0.3, -0.2, 0.2);
  body.rotation.x = r.pitch + (r.spinX || 0);
  body.rotation.z = r.roll + (r.spinZ || 0) + (r.crashTilt || 0);
  front.rotation.x = rear.rotation.x = (front.rotation.x + (r.speed * dt) / wheelR) % TAU;
}

// ---------- Fin de course ----------
const rank = () => [...all].sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishTime - b.finishTime : b.prog - a.prog)).indexOf(player) + 1;
function endRace() {
  state = 'finished';
  stopEngine(); platform.gameplayStop();
  const place = finishOrder.indexOf(player) + 1, time = player.finishTime;
  let rec = '';
  if (!best || time < best) {
    best = time; rec = ' — Nouveau record !';
    try { localStorage.setItem('motocross_best_' + TRACKS[sel.track].id, String(time)); } catch (e) {}
  }
  if (place === 1) platform.happytime();
  $('endTitle').textContent = place === 1 ? '🏆 VICTOIRE !' : `${ordinal(place)} place`;
  $('endInfo').textContent = `${TRACKS[sel.track].name} · Temps : ${fmt(time)}${rec}`;
  $('hud').style.display = 'none';
  $('end').style.display = 'flex';
}

// ---------- Boucle ----------
let prev = performance.now();
const camTarget = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  t += dt;
  if (state === 'menu') {
    const a = t * 0.1;
    camera.position.set(Math.cos(a) * 300, 90, Math.sin(a) * 250);
    camera.lookAt(0, 0, 0);
    fx.update(dt);
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
  // Simulation en pas fixes (~1/60 s) : physique stable même si l'affichage ralentit
  const steps = Math.max(1, Math.round(dt * 60)), h = dt / steps;
  for (let s = 0; s < steps; s++) {
    if (state === 'racing') raceTime += h;
    updatePlayer(h);
    ais.forEach((a) => updateAI(a, h));
    collide(h);
    if (state === 'racing' && player.finished) endRace();
  }
  all.forEach((r) => { emitFX(r, dt); applyMesh(r, dt); });
  fx.update(dt);

  // Caméra de poursuite
  let dh = player.heading - camHeading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  camHeading += dh * Math.min(1, 4 * dt);
  const back = 9 + player.speed * 0.04;
  const cx = player.x - Math.sin(camHeading) * back, cz = player.z - Math.cos(camHeading) * back;
  const cy = Math.max(player.y + 4.2, track.heightAt(cx, cz, lastIdx) + 2);
  camera.position.lerp(camTarget.set(cx, cy, cz), Math.min(1, 10 * dt));
  shake = Math.max(0, shake - dt * 2.5);
  if (shake > 0) camera.position.add(camTarget.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
  camera.lookAt(player.x + Math.sin(camHeading) * 6, player.y + 1.8, player.z + Math.cos(camHeading) * 6);
  camera.fov += ((68 + player.speed * 0.4 + (player.nitroOn ? 10 : 0)) - camera.fov) * Math.min(1, 4 * dt);
  camera.updateProjectionMatrix();
  if (import.meta.env.DEV && window.__closeup) { const a = window.__closeup; camera.position.set(player.x + Math.sin(player.heading + a) * 3.6, player.y + 1.5, player.z + Math.cos(player.heading + a) * 3.6); camera.lookAt(player.x, player.y + 1.0, player.z); }
  sun.position.set(player.x + 60, player.y + 90, player.z + 40);
  sun.target.position.set(player.x, player.y, player.z);

  $('pos').textContent = `Position ${rank()}/${all.length}`;
  $('lap').textContent = `Tour ${player.lap}/${LAPS}`;
  $('time').textContent = fmt(raceTime);
  $('best').textContent = best ? `Record ${fmt(best)}` : '';
  $('speed').innerHTML = `${Math.round(player.speed * 3.6)} <small>km/h</small>`;
  $('nitro').style.width = `${player.nitro * 100}%`;
  renderer.render(scene, camera);
}

// ---------- Menu ----------
function renderMenu() {
  $('trkName').textContent = TRACKS[sel.track].name;
  $('bkName').textContent = bike.name;
  $('difName').textContent = DIFFS[sel.diff].name;
  const bar = (v, lo, hi) => `<i style="width:${clamp(((v - lo) / (hi - lo)) * 100, 8, 100)}%"></i>`;
  $('bkStats').innerHTML = `<span>Vitesse</span>${bar(bike.max, 30, 52)}<span>Accélération</span>${bar(bike.acc, 12, 28)}<span>Maniabilité</span>${bar(bike.handling, 0.6, 1.15)}<span>Nitro</span>${bar(bike.nitro, 0.6, 1.3)}<span style="grid-column:1/3;opacity:.7">${bike.desc}</span>`;
}
const cycle = (v, d, n) => (v + d + n) % n;
$('trkP').onclick = () => { sel.track = cycle(sel.track, -1, TRACKS.length); changeTrack(); };
$('trkN').onclick = () => { sel.track = cycle(sel.track, 1, TRACKS.length); changeTrack(); };
$('bkP').onclick = () => { sel.bike = cycle(sel.bike, -1, BIKES.length); changeBike(); };
$('bkN').onclick = () => { sel.bike = cycle(sel.bike, 1, BIKES.length); changeBike(); };
$('difP').onclick = () => { sel.diff = cycle(sel.diff, -1, DIFFS.length); saveSel(); renderMenu(); };
$('difN').onclick = () => { sel.diff = cycle(sel.diff, 1, DIFFS.length); saveSel(); renderMenu(); };
function placeGrid() { all.forEach((r, i) => { resetRider(r, gridSlot(i)); applyMesh(r, 0); }); lastIdx = player.idx; }
function changeTrack() { saveSel(); loadTrack(sel.track); placeGrid(); renderMenu(); }
function changeBike() { saveSel(); setPlayerBike(); placeGrid(); renderMenu(); }

$('play').onclick = startRace;
$('again').onclick = async () => { await platform.showMidgameAd(); startRace(); };
$('toMenu').onclick = async () => { await platform.showMidgameAd(); state = 'menu'; $('end').style.display = 'none'; $('hud').style.display = 'none'; $('menu').style.display = 'flex'; stopEngine(); placeGrid(); };

loadTrack(sel.track); setPlayerBike(); placeGrid(); renderMenu();
if (import.meta.env.DEV) window.__g = { player, ais, keys, fx, get state() { return state; }, get track() { return track; } };
requestAnimationFrame(frame);
