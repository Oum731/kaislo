import * as THREE from 'three';
import { TRACKS, createTrack, disposeGroup } from './track.js';
import { BIKES, createMoto } from './moto.js';
import { createParticles } from './particles.js';
import { createSky } from './sky.js';
import { setPlatformMute, initAudio, setEngine, stopEngine, startMusic, setMusicIntensity, setMusicOn, setSfxOn, isMusicOn, isSfxOn, sfx } from './audio.js';
import { platform } from './platform.js';
import * as store from './save.js';
import * as prog from './progress.js';
import { confetti, clearConfetti } from './confetti.js';
import { t as tr, ord, LANGS, detect, setLang, getLang, onLang } from './i18n.js';
import { LEVELS, autoLevel, isMobile } from './quality.js';
import * as lb from './leaderboard.js';
import { dailyFor, dayString, shiftDay, medalFor, medalTargets, modifierEffects, secondsToNextDay, cleanName, DAILY_LAPS, DAILY_BIKE, MEDAL_COINS } from '../shared/daily.js';

setLang(detect(store.get().settings.lang));

const AI_COUNT = 5, TAU = Math.PI * 2;
const DIFF_K = [0.86, 0.97, 1.07], DIFF_MULT = [0.7, 1, 1.5];
const MODES = ['race', 'cup', 'trial', 'daily'];
const CUPS = [[0, 1, 2], [3, 4, 5]], CUP_POINTS = [10, 8, 6, 5, 4, 3], CUP_REWARD = [1500, 900, 500];
const PLACE_COINS = [400, 250, 160, 100, 70, 50], PLACE_XP = [100, 70, 50, 30, 20, 10];
const AI_NAMES = ['Rex', 'Nova', 'Kira', 'Zed', 'Maya'];
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const vib = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

// ---------- Rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ee);
scene.fog = new THREE.FogExp2(0x8ec9ee, 0.0046);
const camera = new THREE.PerspectiveCamera(70, 1, 0.5, 1200);
const hemi = new THREE.HemisphereLight(0xffffff, 0x556b3a, 0.85);
const headlight = new THREE.PointLight(0xfff0c0, 0, 90, 1);
scene.add(hemi, headlight);
const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
scene.add(sun, sun.target);
let pixelRatio = 1;
function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatio)); renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
const sky = createSky(scene, renderer);
scene.environmentIntensity = 0.7;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const fx = createParticles(scene);

// ---------- Qualité graphique (auto / bas / moyen / élevé) ----------
const QMODES = ['auto', 0, 1, 2];
let qMode = QMODES.includes(store.get().settings.quality) ? store.get().settings.quality : 'auto', level = qMode === 'auto' ? autoLevel() : qMode;
function applyLevel() {
  const L = LEVELS[level];
  pixelRatio = L.pr; resize();
  sun.castShadow = L.shadows;
  if (sun.shadow.mapSize.x !== L.shadowSize) { sun.shadow.mapSize.set(L.shadowSize, L.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.fog.density = L.fogDensity;
}
applyLevel();

// ---------- Réglages sauvegardés ----------
const sel = { track: 0, bike: 0, diff: 1, mode: 'race', cup: 0 };
try { Object.assign(sel, JSON.parse(localStorage.getItem('motocross_sel') || '{}')); } catch (e) {}
sel.track = clamp(sel.track | 0, 0, TRACKS.length - 1); sel.bike = clamp(sel.bike | 0, 0, BIKES.length - 1); sel.diff = clamp(sel.diff | 0, 0, 2);
if (!MODES.includes(sel.mode)) sel.mode = 'race';
sel.cup = clamp(sel.cup | 0, 0, CUPS.length - 1);
const trackUnlocked = (i) => i === 0 || !!store.get().podium[TRACKS[i - 1].id];
const cupUnlocked = (i) => i === 0 || trackUnlocked(CUPS[i][0]);
if (!store.owns(sel.bike)) sel.bike = 0;
if (!trackUnlocked(sel.track)) sel.track = 0;
if (!cupUnlocked(sel.cup)) sel.cup = 0;
const saveSel = () => {};

// ---------- Entrées ----------
const keys = {};
const map = { ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'nitro', ShiftRight: 'nitro', Space: 'nitro' };
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;   // saisie du pseudo : pas de commandes de jeu
  if (map[e.code]) { keys[map[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyR' && (state === 'racing' || state === 'countdown')) startRace();
  if (e.code === 'KeyM') toggleSfx();
  if (e.code === 'KeyN') toggleMusic();
});
addEventListener('keyup', (e) => { if (map[e.code]) keys[map[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const isTouch = 'ontouchstart' in window;
if (isTouch) {
  for (const [id, k] of [['tL', 'left'], ['tR', 'right'], ['tB', 'nitro'], ['tG', 'up'], ['tD', 'down']]) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { keys[k] = true; e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { keys[k] = false; });
  }
}

// ---------- Piste ----------
let track, worldGroup, MPS, best = 0, coinList = [], coinMesh = null, loadedTrack = -1;
const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.14, 16); coinGeo.rotateX(Math.PI / 2);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc400, metalness: 0.8, roughness: 0.25, emissive: 0x663f00 });
const COIN_VALUE = 5;
function loadTrack(i) {
  if (worldGroup) disposeGroup(worldGroup);
  if (coinMesh) { scene.remove(coinMesh); coinMesh.dispose(); }
  const def = TRACKS[i];
  loadedTrack = i;
  track = createTrack(def);
  worldGroup = track.build(scene, LEVELS[level]);
  coinList = track.makeCoins();
  coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, coinList.length);
  coinMesh.frustumCulled = false; scene.add(coinMesh);
  MPS = track.length / track.SAMPLES;
  scene.fog.color.set(def.fog); sun.color.set(def.sunColor);
  sky.setLook(def.skyTop ?? def.sky, def.fog, def.sunColor, new THREE.Vector3(60, def.night ? 60 : 90, 40), { cloud: def.clouds, stars: def.stars, dark: def.cloudDark });
  const L = def.light || {};
  hemi.intensity = L.hemi ?? 0.85; sun.intensity = L.sun ?? 1.1; scene.environmentIntensity = L.env ?? 0.55; headlight.intensity = L.headlight ? 90 : 0;
  setAIBikes(i >= 3 ? 1 : 0);
  readBest(def.id);
}
function readBest(id) { best = 0; try { best = parseFloat(localStorage.getItem('motocross_best_' + id) || '0') || 0; } catch (e) {} }

// ---------- Pilotes ----------
let bike = BIKES[sel.bike], stats = store.effectiveStats(bike, sel.bike);
let phys = stats, physFx = modifierEffects('classic');   // stats utilisées par la physique (moto prêtée + modificateur en défi quotidien)
const player = { isPlayer: true, mesh: null, name: '' };
// Deux paliers d'adversaires : motos de base sur les 3 premières pistes, motos « pro » ensuite
const AI_TIERS = [
  { styles: [1, 2, 3, 0, 1], colors: [0x2266ff, 0xffcc00, 0xee2266, 0x22bb44, 0x22cccc] },
  { styles: [4, 5, 6, 7, 3], colors: [0xff7a00, 0x1fd6c9, 0xffffff, 0x7a5cff, 0xc0ff00] },
];
let aiTier = -1;
const ais = [];
for (let i = 0; i < AI_COUNT; i++) ais.push({ mesh: null, isPlayer: false, name: AI_NAMES[i], skill: 0.92 + Math.random() * 0.12, laneBase: (Math.random() - 0.5) * 8 });
function setAIBikes(tier) {
  if (tier === aiTier) return;
  aiTier = tier;
  ais.forEach((a, i) => {
    const vis = a.mesh ? a.mesh.visible : true;
    if (a.mesh) disposeGroup(a.mesh);
    a.mesh = createMoto(AI_TIERS[tier].colors[i], AI_TIERS[tier].styles[i], i + 2);
    a.mesh.visible = vis; scene.add(a.mesh);
  });
}
const all = [player, ...ais];
let activeAIs = ais, racers = all;
const riderName = (r) => (r.isPlayer ? tr('rider.you') : r.name);
function setPlayerBike(idx = sel.bike, plain = false) {
  const b = BIKES[idx];
  if (player.mesh) disposeGroup(player.mesh);
  player.mesh = createMoto(plain ? b.color : store.paintColor(idx, b.color), b.style, 1);
  scene.add(player.mesh);
  if (idx === sel.bike) { bike = b; stats = store.effectiveStats(b, idx); }
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
let garageOpen = false, raceCoins = 0, raceTricks = 0, raceTrickPay = 0, raceCrashes = 0, combo = 0, lastTrickT = -99, lastLap = 1, lastRank = 6, hintUntil = 0;
let cup = null, raceLaps = 3;
const dailyInfo = () => dailyFor(dayString());
const hms = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const cupTracks = () => CUPS[cup ? cup.idx : sel.cup];
const newCup = () => ({ idx: sel.cup, round: 0, pts: all.map(() => 0), done: false });

const fmt = (s) => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`; };
const starsStr = (id) => prog.starsOf(id).map((on) => (on ? '★' : '☆')).join('');

// Bandeaux, annonces et conseils
let bannerT, popT;
function banner(txt, ms = 1500) { const el = $('banner'); el.textContent = txt; el.classList.add('on'); clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('on'), ms); }
function rankPop(txt) { const el = $('rankpop'); el.textContent = txt; el.style.opacity = 1; clearTimeout(popT); popT = setTimeout(() => { el.style.opacity = 0; }, 1600); }

// ---------- Fantôme (meilleur tour enregistré) ----------
let ghostRec = [], ghostAcc = 0, ghostData = null, ghostMesh = null;
const ghostR = { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, speed: 30, spinX: 0, spinZ: 0, crashTilt: 0, mesh: null };
const ghostKey = () => (sel.mode === 'daily' ? 'motocross_ghost_daily_' + dailyInfo().day : 'motocross_ghost_' + TRACKS[sel.track].id);
function setupGhost() {
  ghostRec = []; ghostAcc = 0; ghostData = null;
  if (ghostMesh) { disposeGroup(ghostMesh); ghostMesh = null; }
  if (sel.mode !== 'trial' && sel.mode !== 'daily') return;
  try { const raw = localStorage.getItem(ghostKey()); ghostData = raw ? JSON.parse(raw) : null; } catch (e) { ghostData = null; }
  if (!ghostData || !ghostData.d || ghostData.d.length < 12) { ghostData = null; return; }
  ghostMesh = createMoto(0xffffff, BIKES[sel.mode === 'daily' ? DAILY_BIKE : sel.bike].style, 'G');
  ghostMesh.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); Object.assign(o.material, { transparent: true, opacity: 0.38, depthWrite: false }); o.castShadow = false; } });
  scene.add(ghostMesh); ghostR.mesh = ghostMesh;
}
function updateGhost(dt) {
  if (!ghostMesh || !ghostData) return;
  const d = ghostData.d, f = raceTime / 0.05, i = Math.floor(f), n = d.length / 6;
  ghostMesh.visible = state !== 'finished' && i < n - 1;
  if (!ghostMesh.visible) return;
  const k = f - i, a = i * 6, b = a + 6, L = (j, s) => (d[a + j] + (d[b + j] - d[a + j]) * k) / s;
  Object.assign(ghostR, { x: L(0, 10), y: L(1, 10), z: L(2, 10), heading: L(3, 1000), pitch: L(4, 1000), roll: L(5, 1000) });
  applyMesh(ghostR, dt);
}
function recordGhost(h) {
  if (state !== 'racing') return;
  ghostAcc += h;
  while (ghostAcc >= 0.05) {
    ghostAcc -= 0.05;
    if (ghostRec.length < 6 * 20 * 400) ghostRec.push(Math.round(player.x * 10), Math.round(player.y * 10), Math.round(player.z * 10), Math.round(player.heading * 1000), Math.round(player.pitch * 1000), Math.round(player.roll * 1000));
  }
}

function startRace() {
  clearConfetti();
  if (sel.mode !== 'cup' && sel.mode !== 'daily' && !trackUnlocked(sel.track)) { toast(tr('toast.locked')); sfx.error(); return; }
  if (garageOpen) closeGarage();
  const daily = sel.mode === 'daily', solo = daily || sel.mode === 'trial';
  if (daily) { const dd = dailyInfo(); sel.track = dd.trackIdx; if (loadedTrack !== dd.trackIdx) loadTrack(dd.trackIdx); }
  else if (sel.mode === 'cup') {
    if (!cupUnlocked(sel.cup)) { toast(tr('toast.cupLocked'), 4200); sfx.error(); return; }
    if (!cup) cup = newCup();
    const ti = cupTracks()[cup.round];
    sel.track = ti; if (loadedTrack !== ti) loadTrack(ti);
  } else if (loadedTrack !== sel.track) loadTrack(sel.track);
  activeAIs = solo ? [] : ais; racers = [player, ...activeAIs];
  ais.forEach((a) => { a.mesh.visible = !solo; });
  coinList.forEach((c) => { c.on = !daily; });   // pas de pièces en défi quotidien (classement au temps pur)
  raceLaps = daily ? DAILY_LAPS : 3;
  phys = daily ? { ...BIKES[DAILY_BIKE], recharge: 1 } : stats; physFx = modifierEffects(daily ? dailyInfo().mod : 'classic');
  setPlayerBike(daily ? DAILY_BIKE : sel.bike, daily);
  raceCoins = raceTricks = raceTrickPay = raceCrashes = combo = 0; lastTrickT = -99; lastLap = 1; lastRank = racers.length;
  all.forEach((r, i) => resetRider(r, gridSlot(i)));
  lastIdx = player.idx;
  finishOrder = []; raceTime = 0; state = 'countdown'; t = 0; lastCount = 4;
  camHeading = player.heading;
  readBest(TRACKS[sel.track].id); if (daily) best = store.get().challenge.best[dailyInfo().day] || 0;
  setupGhost();
  $('menu').style.display = $('end').style.display = 'none'; $('standings').innerHTML = '';
  $('nameBox').style.display = 'none'; $('endLb').style.display = 'none'; $('adBonus').style.display = 'none';
  $('hud').style.display = 'block';
  $('trick').style.opacity = 0;
  $('wallet').style.display = 'none'; document.querySelector('.iconbtn').style.display = 'none';
  $('touch').style.display = isTouch ? 'block' : 'none';
  $('ghostTag').textContent = (daily ? '🎯 ' + tr('mod.' + dailyInfo().mod) + ' · ' : '') + (solo ? tr('hud.ghost') + (ghostData ? ' ' + fmt(ghostData.t) : '') : '');
  if (store.get().stats.races < 3 && sel.mode !== 'trial') { const h = $('hint'); h.textContent = tr(isTouch ? 'hint.mobile' : 'hint.pc'); h.style.opacity = 1; hintUntil = 7; } else { $('hint').style.opacity = 0; hintUntil = 0; }
  initAudio(); startMusic(TRACKS[sel.track].id, 1); setMusicIntensity(1);
  platform.gameplayStop();
}

// ---------- Figures ----------
let trickTimer;
function showTrick(txt, bad) {
  const el = $('trick'); el.textContent = txt; el.className = bad ? 'crash' : ''; el.style.opacity = 1;
  clearTimeout(trickTimer); trickTimer = setTimeout(() => { el.style.opacity = 0; }, 1500);
}
const trickName = (nx, nz) => {
  const parts = [];
  if (nx) parts.push(`${Math.abs(nx) > 1 ? Math.abs(nx) + 'x ' : ''}${tr(nx > 0 ? 'trick.front' : 'trick.back')}`);
  if (nz) parts.push(`${Math.abs(nz) > 1 ? Math.abs(nz) + 'x ' : ''}${tr('trick.whip')}`);
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
    fx.burst(p.x, p.y, p.z, dust, 30, 9); shake = 1; sfx.crash(); vib(220);
    if (state === 'racing') { raceCrashes++; store.get().stats.crashes++; combo = 0; }
    showTrick(tr('trick.crash'), true);
    return;
  }
  if (nx || nz) {
    const n = Math.abs(nx) + Math.abs(nz);
    combo = raceTime - lastTrickT < 6 ? combo + 1 : 1; lastTrickT = raceTime;
    p.nitro = Math.min(1, p.nitro + 0.3 * n);
    raceTricks += n; raceTrickPay += 25 * n * combo;
    const st = store.get().stats; if (n > st.bestTrick) st.bestTrick = n;
    showTrick(`${trickName(nx, nz)}  +NITRO${combo > 1 ? '  ' + tr('trick.combo', { n: combo }) : ''}`, false); sfx.trick(); vib(40);
  }
  if (impact < -12) { fx.burst(p.x, p.y, p.z, dust, 14, 5); shake = Math.max(shake, 0.4); sfx.land(clamp(-impact / 25, 0.3, 1)); }
  if (impact < -18) p.speed *= 0.9;
}

// ---------- Joueur ----------
function updatePlayer(dt) {
  const p = player, racing = state === 'racing', ctl = racing && p.stun <= 0, def = TRACKS[sel.track], grip = def.grip * physFx.grip;
  p.stun = Math.max(0, p.stun - dt);
  const up = ctl && keys.up, down = ctl && keys.down;
  const steer = ctl ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0; // + = gauche
  const nitroOn = ctl && keys.nitro && p.nitro > 0 && p.speed > 5;
  p.nitro = nitroOn ? Math.max(0, p.nitro - dt * 0.3) : Math.min(1, p.nitro + dt * 0.05 * phys.recharge * physFx.recharge);
  if (nitroOn && !p.nitroOn) sfx.nitro();
  p.nitroOn = nitroOn;

  const nr = track.nearest(p.x, p.z, lastIdx);
  lastIdx = nr.i;
  const nl = track.normalAt(nr.i), sp = track.samples[nr.i];
  p.lat = (p.x - sp.x) * nl.x + (p.z - sp.z) * nl.z;
  const offTrack = nr.d > track.width * 0.62;
  const maxSpeed = (phys.max * physFx.speed + (nitroOn ? 16 * phys.nitro : 0)) * (offTrack ? 0.6 : 1);

  if (p.grounded) {
    const fx_ = Math.sin(p.heading), fz_ = Math.cos(p.heading);
    const slope = (track.heightAt(p.x + fx_, p.z + fz_, lastIdx) - track.heightAt(p.x - fx_, p.z - fz_, lastIdx)) / 2;
    if (up) p.speed += (phys.acc * physFx.accel + (nitroOn ? 18 : 0)) * dt;
    if (down) p.speed -= 45 * grip * dt;
    if (p.stun > 0) p.speed -= p.speed * 2.2 * dt;
    p.speed -= slope * 9.8 * 0.7 * dt;
    p.speed -= p.speed * (offTrack ? 0.35 : 0.06) * dt;
    if (p.speed > maxSpeed) p.speed -= (p.speed - maxSpeed) * 2.5 * dt;
    p.speed = Math.max(0, p.speed);
    p.heading += steer * (1.9 - p.speed / 48) * phys.handling * Math.min(1, grip + 0.1) * Math.min(1, p.speed / 8) * dt;
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
  const ground = track.heightAt(nx, nz, lastIdx), G = 24 * physFx.gravity;
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
  setEngine(p.speed / 62, up ? 1 : 0.2, nitroOn, p.grounded);
}

function advanceProgress(r, i) {
  const S = track.SAMPLES;
  let d = i - (r.idx % S);
  if (d > S / 2) d -= S; else if (d < -S / 2) d += S;
  r.prog += d; r.idx = i;
  r.lap = clamp(Math.floor(r.prog / S) + 1, 1, raceLaps);
  if (!r.finished && r.prog >= raceLaps * S) { r.finished = true; r.finishTime = raceTime; finishOrder.push(r); }
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
  const target = racing ? (42 + 2 * Math.max(0, loadedTrack)) * a.skill * DIFF_K[sel.diff] * rubber * (1 - Math.min(0.45, curv * 4.5)) : 0;
  a.speed += (target - a.speed) * Math.min(1, 1.6 * dt);
  a.aiProg += (a.speed * dt) / MPS;

  // Évite les pilotes juste devant
  const lim = track.width * 0.42;
  for (const r of racers) {
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
  a.lap = clamp(Math.floor(a.prog / S) + 1, 1, raceLaps);
  if (!a.finished && a.prog >= raceLaps * S) { a.finished = true; a.finishTime = raceTime; finishOrder.push(a); }
}

// ---------- Collisions joueur / IA ----------
function collide(dt) {
  player.hitCd = Math.max(0, player.hitCd - dt);
  if (state !== 'racing') return;
  const R = 1.5, lim = track.width * 0.42;
  for (const a of activeAIs) {
    const dx = player.x - a.x, dz = player.z - a.z, d = Math.hypot(dx, dz);
    if (d >= R || d < 0.001 || Math.abs(player.y - a.y) > 2.2) continue;
    const nx = dx / d, nz = dz / d, ov = R - d, nl = track.normalAt(a.idx);
    player.x += nx * ov * 0.7; player.z += nz * ov * 0.7;
    a.lane = clamp(a.lane - (nx * nl.x + nz * nl.z) * ov * 1.8, -lim, lim);
    const rel = player.speed - a.speed;
    if (rel > 0) { player.speed -= rel * 0.3; a.speed += rel * 0.3; }
    if (player.hitCd <= 0 && (rel > 4 || ov > 0.5)) {
      player.hitCd = 0.3; shake = Math.max(shake, 0.35); sfx.bump(); vib(25);
      for (let k = 0; k < 6; k++) fx.spark(player.x - nx * 0.7, player.y + 1, player.z - nz * 0.7);
    }
  }
}

// ---------- Effets (poussière, flammes) ----------
function emitFX(r, dt) {
  const sx = Math.sin(r.heading), sz = Math.cos(r.heading);
  if (r.grounded && r.speed > 7 && state !== 'menu') {
    r.dustAcc += r.speed * dt * (r.isPlayer ? 0.9 : 0.45) * LEVELS[level].particles;
    while (r.dustAcc >= 1) { r.dustAcc -= 1; fx.dust(r.x - sx * 1.0, r.y, r.z - sz * 1.0, TRACKS[sel.track].dust, r.speed); }
  }
  if (r.nitroOn) for (let k = 0, n = Math.max(1, Math.round(3 * LEVELS[level].particles)); k < n; k++) fx.flame(r.x - sx * 1.5, r.y + 0.9, r.z - sz * 1.5, -sx * 9, -sz * 9, true);
  else if (r.isPlayer && state === 'racing' && r.speed > 3 && keys.up && Math.random() < 0.3) fx.flame(r.x - sx * 1.5, r.y + 0.9, r.z - sz * 1.5, -sx * 4, -sz * 4, false);
}

function applyMesh(r, dt) {
  r.mesh.position.set(r.x, r.y, r.z);
  r.mesh.rotation.y = r.heading;
  const { body, front, rear, wheelR, steer, upper, shadow } = r.mesh.userData;
  if (shadow) shadow.visible = r.grounded !== false;
  steer.rotation.y = -r.roll * 0.55;
  upper.rotation.z = r.roll * 0.3; upper.rotation.x = clamp(-r.pitch * 0.3, -0.2, 0.2);
  body.rotation.x = r.pitch + (r.spinX || 0);
  body.rotation.z = r.roll + (r.spinZ || 0) + (r.crashTilt || 0);
  front.rotation.x = rear.rotation.x = (front.rotation.x + (r.speed * dt) / wheelR) % TAU;
}

// ---------- Classement et fin de course ----------
const rank = () => [...racers].sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishTime - b.finishTime : b.prog - a.prog)).indexOf(player) + 1;
const finalOrder = () => [...finishOrder, ...racers.filter((r) => !r.finished).sort((a, b) => b.prog - a.prog)];
const cupRanking = () => cup.pts.map((p, idx) => ({ idx, p })).sort((a, b) => (b.p - a.p) || (a.idx - b.idx));
function standingsHTML() {
  const rows = cupRanking().map((e, i) => `<tr class="${e.idx === 0 ? 'me' : ''}"><td>${i + 1}</td><td>${riderName(all[e.idx])}</td><td>${tr('cup.pts', { n: e.p })}</td></tr>`).join('');
  return `<b>${tr('cup.standings')}</b><table class="st">${rows}</table>`;
}

function endRace() {
  if (sel.mode === 'daily') return endDaily();
  state = 'finished';
  stopEngine(); setMusicIntensity(0.3); platform.gameplayStop();
  $('nitrofx').classList.remove('on'); $('hint').style.opacity = 0;
  const trial = sel.mode === 'trial', def = TRACKS[sel.track], st = store.get();
  const order = finalOrder(), place = finishOrder.indexOf(player) + 1, time = player.finishTime;
  const prevBest = best, isRecord = !best || time < best;
  if (isRecord) {
    best = time;
    try { localStorage.setItem('motocross_best_' + def.id, String(time)); localStorage.setItem(ghostKey(), JSON.stringify({ t: time, d: ghostRec })); } catch (e) {}
  }
  const mult = DIFF_MULT[sel.diff] * (1 + 0.3 * sel.track);
  const base = trial ? 0 : Math.round(PLACE_COINS[Math.min(5, place - 1)] * mult);
  const coinPay = raceCoins, trickPay = raceTrickPay, recBonus = trial && isRecord && prevBest ? 100 : 0;
  const total = base + coinPay + trickPay + recBonus;
  st.stats.races++; st.stats.tricks += raceTricks; st.stats.coins += total;
  if (!trial && place === 1) { st.stats.wins++; if (raceCrashes === 0) st.stats.flawless++; }
  const extra = [];
  if (!trial && place <= 3 && !st.podium[def.id]) {
    st.podium[def.id] = true;
    const nx = TRACKS[sel.track + 1]; if (nx) extra.push(tr('end.unlock', { name: tr('track.' + nx.id) }));
  }
  store.addCoins(total);

  // Étoiles (objectifs) — uniquement en Normal / Difficile, hors contre-la-montre
  const newStars = !trial && sel.diff >= 1 ? prog.awardObjectives(def.id, { place, coins: coinPay, tricks: raceTricks, crashes: raceCrashes }) : [];
  newStars.forEach((s) => extra.push(tr('end.star', { text: s.text, n: s.coins })));

  // Championnat
  let cupPos = 0, cupReward = 0;
  if (sel.mode === 'cup' && cup) {
    order.forEach((r, i) => { cup.pts[all.indexOf(r)] += CUP_POINTS[i]; });
    cup.round++;
    if (cup.round >= cupTracks().length) {
      cup.done = true; cupPos = cupRanking().findIndex((e) => e.idx === 0) + 1;
      if (cupPos <= 3) { cupReward = Math.round(CUP_REWARD[cupPos - 1] * DIFF_MULT[sel.diff] * (1 + 0.8 * cup.idx)); store.addCoins(cupReward); extra.push(tr('cup.reward', { n: cupReward })); }
      if (cupPos === 1) { st.cupWins++; if (cup.idx === 1) st.stats.cupBWins++; }
    }
  }

  // XP, niveau, succès
  const xp = (trial ? 40 : PLACE_XP[Math.min(5, place - 1)]) + Math.round(coinPay / 2) + raceTricks * 10 + newStars.length * 60 + (cup && cup.done ? 150 : 0);
  const lv = prog.addXp(xp);
  extra.unshift(tr('end.xp', { n: xp }));
  if (lv.after > lv.before) extra.push(tr('end.levelup', { n: lv.after, c: lv.reward }));
  const newAchv = prog.checkAchievements();
  newAchv.forEach((a) => extra.push(tr('end.achv', { name: prog.achvName(a), n: a.reward })));
  if (trial) extra.push(!prevBest ? tr('trial.first') : isRecord ? tr('trial.beat') : tr('trial.slower', { t: '+' + (time - prevBest).toFixed(2) + 's' }));
  store.save();

  // Affichage
  const winish = trial ? isRecord && !!prevBest : cup && cup.done ? cupPos === 1 : place === 1;
  $('endTitle').textContent = trial ? `🏁 ${fmt(time)}` : cup && cup.done ? (cupPos === 1 ? tr('cup.champion') : tr('cup.final', { p: ord(cupPos) })) : place === 1 ? tr('end.win') : tr('end.place', { p: ord(place) });
  $('endInfo').textContent = `${tr('track.' + def.id)} · ${trial ? tr('mode.trial') : tr('end.time', { t: fmt(time) })}${isRecord ? tr('end.newrecord') : ''}${sel.mode === 'cup' ? ' · ' + tr('cup.round', { a: cup.round, b: cupTracks().length }) : ''}`;
  const parts = [];
  if (!trial) parts.push(`${tr('earn.place')}: <b>+${base}</b> 🪙`);
  parts.push(`${tr('earn.coins')}: <b>+${coinPay}</b> 🪙`, `${tr('earn.tricks', { n: raceTricks })}: <b>+${trickPay}</b> 🪙`);
  $('endEarn').innerHTML = `${parts.join(' · ')}<br>${tr('earn.total')}: <b>+${total + cupReward}</b> 🪙 — ${tr('earn.balance')}: <b>${store.get().coins}</b> 🪙`;
  $('endExtra').innerHTML = extra.join('<br>');
  $('standings').innerHTML = sel.mode === 'cup' && cup ? standingsHTML() : '';
  $('again').textContent = sel.mode === 'cup' && cup ? (cup.done ? tr('cup.new') : tr('end.next')) : tr('end.again');
  showWallet(); offerAd(total + cupReward);
  $('touch').style.display = 'none'; document.querySelector('.iconbtn').style.display = 'flex';
  $('hud').style.display = 'none'; $('end').style.display = 'flex';
  if (winish) { confetti(place === 1 || cupPos === 1 ? 180 : 100); platform.happytime(); }
  if (place === 1 || winish) sfx.win(); else sfx.lose();
  if (newStars.length) setTimeout(() => sfx.star(), 900);
  if (lv.after > lv.before) setTimeout(() => sfx.levelup(), 1500);
  else if (newAchv.length) setTimeout(() => sfx.star(), 1500);
}

// ---------- Fin du défi quotidien : médailles, récompenses, classement ----------
function endDaily() {
  state = 'finished';
  stopEngine(); setMusicIntensity(0.3); platform.gameplayStop();
  $('nitrofx').classList.remove('on'); $('hint').style.opacity = 0;
  const dd = dailyInfo(), st = store.get(), ch = st.challenge, time = player.finishTime;
  const prevBest = ch.best[dd.day] || 0, first = !prevBest, improved = first || time < prevBest;
  if (improved) { ch.best[dd.day] = time; best = time; try { localStorage.setItem(ghostKey(), JSON.stringify({ t: time, d: ghostRec })); } catch (e) {} }
  const bestT = ch.best[dd.day], medal = medalFor(dd.id, bestT), paid = ch.paid[dd.day] | 0;
  let reward = 0, medalPay = 0;
  if (first) {
    ch.streak.count = ch.streak.last === shiftDay(dd.day, -1) ? ch.streak.count + 1 : 1; ch.streak.last = dd.day;
    reward = 250 + 50 * Math.min(ch.streak.count - 1, 6);
  }
  if (medal > paid) { medalPay = MEDAL_COINS[medal] - MEDAL_COINS[paid]; ch.paid[dd.day] = medal; }
  ch.history[dd.day] = { time: bestT, medal, track: dd.id };
  Object.keys(ch.history).sort().slice(0, -30).forEach((k) => { delete ch.history[k]; delete ch.best[k]; delete ch.paid[k]; });
  const coins = reward + medalPay;
  st.stats.races++; st.stats.coins += coins; st.stats.tricks += raceTricks;
  store.addCoins(coins);
  const lv = prog.addXp(first ? 120 : improved ? 40 : 20);
  const newAchv = prog.checkAchievements();

  const extra = [tr('end.xp', { n: first ? 120 : improved ? 40 : 20 })];
  if (first) extra.push(tr('end.dailyStreak', { n: ch.streak.count }));
  if (lv.after > lv.before) extra.push(tr('end.levelup', { n: lv.after, c: lv.reward }));
  newAchv.forEach((a) => extra.push(tr('end.achv', { name: prog.achvName(a), n: a.reward })));
  const tg = medalTargets(dd.id);
  $('endTitle').textContent = medal ? tr('medal.' + medal) : tr('daily.title');
  $('endInfo').textContent = `${tr('track.' + dd.id)} · ${tr('mod.' + dd.mod)} · ${tr('end.time', { t: fmt(time) })}${!first && improved ? tr('end.newrecord') : ''}`;
  const parts = [];
  if (reward) parts.push(tr('end.dailyReward', { n: reward }).replace(/\+(\d+)/, '<b>+$1</b>'));
  if (medalPay) parts.push(tr('end.medalBonus', { n: medalPay }).replace(/\+(\d+)/, '<b>+$1</b>'));
  $('endEarn').innerHTML = `${parts.join(' · ') || tr('daily.best', { t: fmt(bestT) })}<br>${tr('daily.targets', { g: fmt(tg.gold), s: fmt(tg.silver), b: fmt(tg.bronze) })} — ${tr('earn.balance')}: <b>${store.get().coins}</b> 🪙`;
  $('endExtra').innerHTML = extra.join('<br>');
  $('standings').innerHTML = '';
  $('again').textContent = tr('end.retry'); $('endLb').style.display = '';
  showWallet(); offerAd(coins);
  $('touch').style.display = 'none'; document.querySelector('.iconbtn').style.display = 'flex';
  $('hud').style.display = 'none'; $('end').style.display = 'flex';
  if (medal >= 2) { confetti(medal === 3 ? 180 : 90); platform.happytime(); sfx.win(); } else if (medal === 1) sfx.win(); else sfx.lose();
  if (newAchv.length || lv.after > lv.before) setTimeout(() => sfx.levelup(), 1200);

  // Envoi au classement en ligne (si configuré) — il faut d'abord un pseudo
  if (lb.lbEnabled && improved) {
    const send = () => lb.submitScore({ day: dd.day, track: dd.id, time: bestT }).then((res) => {
      if ($('end').style.display === 'none') return;
      $('endExtra').innerHTML += '<br>' + (res ? `${tr('lb.rank', { r: res.rank, t: res.total })} · ${tr('lb.sent')}` : tr('lb.unreachable'));
    });
    if (st.playerName) send();
    else {
      $('nameBox').style.display = 'block'; $('nameErr').textContent = ''; $('nameInput').value = '';
      const ok = () => {
        const n = cleanName($('nameInput').value);
        if (!n) { $('nameErr').textContent = tr('lb.badName'); sfx.error(); return; }
        st.playerName = n; store.save(); $('nameBox').style.display = 'none'; send();
      };
      $('nameOk').onclick = ok; $('nameInput').onkeydown = (e) => { if (e.key === 'Enter') ok(); e.stopPropagation(); };
    }
  }
}

// ---------- Pièces ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function updateCoins() {
  const racing = state === 'racing';
  for (let i = 0; i < coinList.length; i++) {
    const c = coinList[i];
    if (c.on && racing) {
      const dx = player.x - c.x, dz = player.z - c.z;
      if (dx * dx + dz * dz < 7.8 && Math.abs(player.y + 1 - c.y) < 3.2) {
        c.on = false; raceCoins += COIN_VALUE; sfx.coin();
        fx.burst(c.x, c.y - 0.4, c.z, 0xffd84d, 6, 3);
      }
    }
    const k = c.on ? 1 : 0;
    coinMesh.setMatrixAt(i, _m.compose(_p.set(c.x, c.y, c.z), _q.setFromEuler(_e.set(0, t * 3 + i, 0)), _s.set(k, k, k)));
  }
  coinMesh.instanceMatrix.needsUpdate = true;
}

// ---------- Boucle ----------
let prev = performance.now(), ema = 16, lowAcc = 0;
const camTarget = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(0.1, (now - prev) / 1000), dt = Math.min(0.05, raw); prev = now;
  t += dt;
  ema += (raw * 1000 - ema) * 0.05;
  // Qualité adaptative : si le jeu rame en course, on baisse d'un cran (résolution, ombres, particules)
  if (state === 'racing' && raceTime > 3 && qMode === 'auto' && level > 0) {
    if (ema > 26) lowAcc += raw; else lowAcc = Math.max(0, lowAcc - raw * 0.5);
    if (lowAcc > 2.5) { level--; applyLevel(); lowAcc = 0; ema = 16; }
  }
  updateCoins();
  if (state === 'menu') {
    if (garageOpen) { // la caméra tourne autour de la moto
      const a = t * 0.6;
      camera.position.set(player.x + Math.cos(a) * 5.6, player.y + 1.5, player.z + Math.sin(a) * 5.6);
      camera.lookAt(player.x, player.y + 0.95, player.z);
      camera.fov = 48;
      const W = innerWidth, H = innerHeight;      // en paysage, la moto se place à gauche du panneau ; en portrait, au-dessus
      if (W / H > 1) camera.setViewOffset(W, H, W * 0.2, 0, W, H); else camera.setViewOffset(W, H, 0, H * 0.22, W, H);
      camera.updateProjectionMatrix();
      applyMesh(player, dt);
    } else {
      // la caméra balance doucement devant la ligne de départ où posent les 6 pilotes
      let cx = 0, cy = 0, cz = 0; all.forEach((r) => { cx += r.x; cy += r.y; cz += r.z; }); cx /= all.length; cy /= all.length; cz /= all.length;
      const hd = player.heading, fx = Math.sin(hd), fz = Math.cos(hd), rx = fz, rz = -fx;
      const ang = Math.sin(t * 0.22) * 0.85, dist = 13 + Math.sin(t * 0.15) * 1.5;
      camera.fov = 46; camera.clearViewOffset(); camera.updateProjectionMatrix();
      camera.position.set(cx + (fx * Math.cos(ang) + rx * Math.sin(ang)) * dist, cy + 2.3 + Math.sin(t * 0.3) * 0.3, cz + (fz * Math.cos(ang) + rz * Math.sin(ang)) * dist);
      camera.lookAt(cx, cy + 1.0, cz);
      if (import.meta.env.DEV && window.__cam) { const c = window.__cam; camera.position.set(...c.pos); camera.fov = c.fov || 40; camera.updateProjectionMatrix(); camera.lookAt(...c.look); }
      all.forEach((r, i) => { r.pitch = Math.sin(t * 2.4 + i) * 0.012; r.roll = Math.sin(t * 1.3 + i * 2) * 0.02; applyMesh(r, dt); });
    }
    fx.update(dt, camera, renderer.domElement.height);
    sky.update(t, camera);
    renderer.render(scene, camera);
    return;
  }
  if (state === 'countdown') {
    const c = 3 - Math.floor(t);
    if (c !== lastCount) {
      lastCount = c;
      if (c > 0) { $('big').textContent = c; sfx.count(); }
      else { $('big').textContent = tr('hud.go'); sfx.go(); state = 'racing'; platform.gameplayStart(); setTimeout(() => { if (state !== 'countdown') $('big').textContent = ''; }, 800); }
    }
  }
  // Simulation en pas fixes (~1/60 s) : physique stable même si l'affichage ralentit
  const steps = Math.max(1, Math.round(dt * 60)), h = dt / steps;
  for (let s = 0; s < steps; s++) {
    if (state === 'racing') raceTime += h;
    updatePlayer(h);
    activeAIs.forEach((a) => updateAI(a, h));
    collide(h);
    recordGhost(h);
    if (state === 'racing' && player.finished) endRace();
  }
  racers.forEach((r) => { emitFX(r, dt); applyMesh(r, dt); });
  updateGhost(dt);
  fx.update(dt, camera, renderer.domElement.height);

  // Annonces : tours, dépassements, conseils
  if (state === 'racing') {
    if (player.lap > lastLap) { lastLap = player.lap; banner(player.lap === raceLaps ? tr('hud.finalLap') : tr('hud.lapN', { n: player.lap })); sfx.lap(); }
    const rk = rank();
    if (raceTime > 2 && rk < lastRank && racers.length > 1) { rankPop(tr('hud.overtake', { n: rk })); sfx.overtake(); }
    lastRank = rk;
    if (hintUntil > 0) { hintUntil -= dt; if (hintUntil <= 0) $('hint').style.opacity = 0; }
  }
  $('nitrofx').classList.toggle('on', !!player.nitroOn);
  sky.update(t, camera);

  // Caméra de poursuite
  camera.clearViewOffset();
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
  if (import.meta.env.DEV && window.__closeup !== undefined) { // caméra cinématique (outils de capture)
    const a = window.__closeup, d = window.__closeDist || 3.6, hh = window.__closeH ?? 1.5;
    camera.position.set(player.x + Math.sin(player.heading + a) * d, player.y + hh, player.z + Math.cos(player.heading + a) * d);
    camera.fov = window.__closeFov || 55; camera.updateProjectionMatrix(); camera.lookAt(player.x, player.y + 1.0, player.z);
  }
  sun.position.set(player.x + 60, player.y + 90, player.z + 40);
  sun.target.position.set(player.x, player.y, player.z);
  headlight.position.set(player.x + Math.sin(player.heading) * 7, player.y + 3, player.z + Math.cos(player.heading) * 7);

  $('pos').textContent = sel.mode === 'trial' || sel.mode === 'daily' ? tr('mode.' + sel.mode) : tr('hud.pos', { a: rank(), b: racers.length });
  $('lap').textContent = tr('hud.lap', { a: player.lap, b: raceLaps });
  $('time').textContent = fmt(raceTime);
  $('best').textContent = best ? tr('hud.record', { t: fmt(best) }) : '';
  $('coins').textContent = raceCoins;
  $('speed').innerHTML = `${Math.round(player.speed * 3.6)} <small>km/h</small>`;
  $('nitro').style.width = `${player.nitro * 100}%`;
  renderer.render(scene, camera);
}

// ---------- Interface : outils ----------
const cycle = (v, d, n) => (v + d + n) % n;
const bar = (v, lo, hi) => `<i style="width:${clamp(((v - lo) / (hi - lo)) * 100, 8, 100)}%"></i>`;
const statsHTML = (b) => `<span>${tr('stat.speed')}</span>${bar(b.max, 30, 58)}<span>${tr('stat.acc')}</span>${bar(b.acc, 12, 34)}<span>${tr('stat.handling')}</span>${bar(b.handling, 0.6, 1.35)}<span>${tr('stat.nitro')}</span>${bar(b.nitro, 0.6, 1.8)}`;
let toastQ = [], toastBusy = false;
function toast(msg, ms = 3200) { toastQ.push([msg, ms]); if (!toastBusy) nextToast(); }
function nextToast() {
  const it = toastQ.shift(), el = $('toast');
  if (!it) { el.style.display = 'none'; toastBusy = false; return; }
  toastBusy = true; el.textContent = it[0]; el.style.display = 'block'; setTimeout(nextToast, it[1]);
}
const showWallet = () => { $('wallet').textContent = `🪙 ${store.get().coins}`; $('wallet').style.display = 'block'; };
const SCREENS = ['menu', 'garageScreen', 'settings', 'achvScreen', 'lbScreen', 'helpScreen'];
function showScreen(id) { SCREENS.forEach((s) => { $(s).style.display = s === id ? 'flex' : 'none'; }); }
function renderIcons() {
  $('bMusic').textContent = isMusicOn() ? '🎵' : '🔇'; $('bMusic').style.opacity = isMusicOn() ? 1 : 0.5;
  $('bSfx').textContent = isSfxOn() ? '🔊' : '🔈'; $('bSfx').style.opacity = isSfxOn() ? 1 : 0.5;
  if ($('settings').style.display !== 'none') renderSettings();
}
function toggleMusic() { const v = !isMusicOn(); setMusicOn(v); store.get().settings.music = v; store.save(); renderIcons(); }
function toggleSfx() { const v = !isSfxOn(); setSfxOn(v); store.get().settings.sfx = v; store.save(); renderIcons(); }
$('bMusic').onclick = toggleMusic; $('bSfx').onclick = toggleSfx;
setMusicOn(store.get().settings.music); setSfxOn(store.get().settings.sfx);

// ---------- Défi quotidien ----------
const nextDailyReward = () => { const s = store.get().challenge.streak, y = shiftDay(dayString(), -1); return 250 + 50 * Math.min(s.last === y ? s.count : 0, 6); };
function dailyHTML(dd) {
  const ch = store.get().challenge, done = ch.best[dd.day], med = done ? medalFor(dd.id, done) : 0, tg = medalTargets(dd.id);
  return `<b>${tr('mod.' + dd.mod)}</b> — ${tr('mod.' + dd.mod + '.d')}<br>${tr('daily.same', { laps: DAILY_LAPS })}<br>${tr('daily.targets', { g: fmt(tg.gold), s: fmt(tg.silver), b: fmt(tg.bronze) })}<br>`
    + (done ? `${tr('daily.best', { t: fmt(done) })} ${med ? tr('medal.' + med) : ''}` : tr('daily.todo', { n: nextDailyReward() }))
    + `<br><small id="dNext">${tr('daily.next', { t: hms(secondsToNextDay()) })}</small>`;
}
let shownDay = dayString();
setInterval(() => {
  const n = $('dNext'), l = $('lbNext'), txt = tr('daily.next', { t: hms(secondsToNextDay()) });
  if (n) n.textContent = txt; if (l) l.textContent = txt;
  if (dayString() !== shownDay) { shownDay = dayString(); if (state === 'menu') { renderMenu(); if ($('lbScreen').style.display !== 'none') renderLb(); toast(tr('daily.ready'), 3500); } }
}, 1000);

const MEDAL_ICON = ['', '🥉', '🥈', '🥇'];
function historyHTML() {
  const h = store.get().challenge.history, days = Object.keys(h).sort().reverse().slice(0, 7);
  if (!days.length) return '';
  return `<div style="margin-top:6px"><b style="font-size:13px;opacity:.75">${tr('lb.history')}</b><table class="lbtable">${days.map((d) => `<tr><td>${d.slice(5)}</td><td>${MEDAL_ICON[h[d].medal] || ''} ${tr('track.' + h[d].track)}</td><td>${fmt(h[d].time)}</td></tr>`).join('')}</table></div>`;
}
let lbReturn = 'menu';
function openLb(from) {
  lbReturn = from; if (from === 'end') $('end').style.display = 'none';
  showScreen('lbScreen'); $('lbName').value = store.get().playerName || ''; $('lbMsg').textContent = '';
  renderLb(); lb.flushPending();
}
function closeLb() { if (lbReturn === 'end') { $('lbScreen').style.display = 'none'; $('end').style.display = 'flex'; } else { showScreen('menu'); renderMenu(); } }
async function renderLb() {
  const dd = dailyInfo(), box = $('lbTable'), tg = medalTargets(dd.id), done = store.get().challenge.best[dd.day];
  $('lbInfo').innerHTML = `<b>${dd.day}</b> · ${tr('track.' + dd.id)} · ${tr('mod.' + dd.mod)}<br><small>${tr('mod.' + dd.mod + '.d')} — ${tr('daily.same', { laps: DAILY_LAPS })}</small><br>${tr('daily.targets', { g: fmt(tg.gold), s: fmt(tg.silver), b: fmt(tg.bronze) })}<br>${done ? tr('daily.best', { t: fmt(done) }) : tr('daily.todo', { n: nextDailyReward() })}<br><small id="lbNext">${tr('daily.next', { t: hms(secondsToNextDay()) })}</small>`;
  const note = (k) => `<div style="font-size:13px;opacity:.85;margin:6px;max-width:92vw">${tr(k)}</div>`;
  if (!lb.lbEnabled) { box.innerHTML = note('lb.offline') + historyHTML(); return; }
  box.innerHTML = `<div style="margin:8px">${tr('lb.loading')}</div>`;
  const res = await lb.fetchBoard(dd.day, 20);
  if ($('lbScreen').style.display === 'none') return;
  if (!res) { box.innerHTML = note('lb.unreachable') + historyHTML(); return; }
  const you = res.you, rows = res.entries.map((e) => `<tr class="${you && you.rank === e.rank ? 'me' : ''} ${e.rank <= 3 ? 'medal' : ''}"><td>${MEDAL_ICON[4 - e.rank] && e.rank <= 3 ? MEDAL_ICON[4 - e.rank] : e.rank}</td><td>${e.name.replace(/[<>&]/g, '')}</td><td>${fmt(e.time)}</td></tr>`).join('');
  const extra = you && you.rank > res.entries.length ? `<tr class="me"><td>${you.rank}</td><td>${tr('lb.you')}</td><td>${fmt(you.time)}</td></tr>` : '';
  box.innerHTML = res.entries.length ? `<table class="lbtable"><tr><th>#</th><th>${tr('lb.player')}</th><th>${tr('lb.col.time')}</th></tr>${rows}${extra}</table>${you ? `<div style="font-weight:800;color:#ffd84d">${tr('lb.rank', { r: you.rank, t: res.total })}</div>` : ''}` : note('lb.empty');
}
function saveLbName() {
  const n = cleanName($('lbName').value);
  if (!n) { $('lbMsg').textContent = tr('lb.badName'); sfx.error(); return; }
  store.get().playerName = n; store.save(); $('lbMsg').textContent = '✔'; lb.flushPending();
}
$('lbSaveName').onclick = saveLbName; $('lbRefresh').onclick = () => renderLb(); $('lbBack').onclick = closeLb;
$('lbPlay').onclick = () => { sel.mode = 'daily'; saveSelAll(); $('lbScreen').style.display = 'none'; startRace(); };
$('bLb').onclick = () => openLb('menu'); $('endLb').onclick = () => openLb('end');

// ---------- Menu principal ----------
let baseTrack = sel.track, audioStarted = false;
const themeId = () => TRACKS[sel.track].id;
const saveSelAll = () => { try { localStorage.setItem('motocross_sel', JSON.stringify({ ...sel, track: baseTrack })); } catch (e) {} };

function goalHTML() {
  const d = store.get(), locked = BIKES.map((b, i) => i).filter((i) => !store.owns(i)).sort((a, b) => store.BIKE_PRICES[a] - store.BIKE_PRICES[b]);
  let text, cur = 0, max = 0;
  if (locked.length) { const i = locked[0]; text = tr('menu.goalBike', { name: BIKES[i].name }); cur = d.coins; max = store.BIKE_PRICES[i]; }
  else {
    const costs = [];
    d.owned.forEach((b) => store.UPGRADES.forEach((u) => { const l = store.upgLevel(b, u.key); if (l < store.MAX_UPG) costs.push(store.upgCost(l, b)); }));
    if (costs.length) { text = tr('menu.goalUpg'); max = Math.min(...costs); cur = d.coins; } else text = tr('menu.goalAll');
  }
  return max ? `${text} — ${Math.min(cur, max)}/${max} 🪙<div class="xpbar"><i style="width:${clamp((cur / max) * 100, 0, 100)}%"></i></div>` : text;
}

function renderMenu() {
  const mode = sel.mode, cupMode = mode === 'cup', dailyMode = mode === 'daily', dd = dailyMode ? dailyInfo() : null;
  const ti = dailyMode ? dd.trackIdx : cupMode ? (cup && !cup.done ? cupTracks()[cup.round] : CUPS[sel.cup][0]) : sel.track, def = TRACKS[ti];
  const unlocked = dailyMode || (cupMode ? cupUnlocked(sel.cup) : trackUnlocked(sel.track));
  $('modeName').textContent = tr('mode.' + mode);
  $('trkLab').textContent = tr(cupMode ? 'menu.cup' : 'menu.track');
  $('trkP').style.visibility = $('trkN').style.visibility = dailyMode || (cupMode && cup && !cup.done && cup.round > 0) ? 'hidden' : 'visible';
  $('bLb').style.display = dailyMode ? '' : 'none';
  const nm = cupMode ? tr('cup.name.' + sel.cup) : tr('track.' + def.id);
  $('trkName').innerHTML = !unlocked ? `<span class="lock">🔒 ${nm}</span>` : `${nm}${mode === 'race' ? `<span class="stars">${starsStr(def.id)}</span>` : ''}`;
  if (!unlocked) {
    $('objs').innerHTML = tr(cupMode ? 'toast.cupLocked' : 'toast.locked');
  } else if (mode === 'race') {
    const list = prog.OBJECTIVES[def.id] || [], got = prog.starsOf(def.id);
    $('objs').innerHTML = `<b>${tr('obj.title')}</b>${sel.diff < 1 ? ` <small style="opacity:.7">(${tr('menu.noStars')})</small>` : ''}<br>` + list.map((o, i) => `${got[i] ? '⭐' : '☆'} ${prog.objectiveText(o)}`).join('<br>');
  } else if (dailyMode) {
    $('objs').innerHTML = dailyHTML(dd);
  } else if (cupMode) {
    $('objs').innerHTML = cup && !cup.done ? tr('menu.cupInfo', { a: cup.round + 1, b: cupTracks().length, p: cup.pts[0] }) : tr('menu.cupStart', { tracks: CUPS[sel.cup].map((i) => tr('track.' + TRACKS[i].id)).join(' → ') });
  } else $('objs').innerHTML = `${tr('menu.trialInfo')}${best ? `<br>🏁 ${fmt(best)}` : ''}`;
  $('difName').textContent = tr('diff.' + sel.diff);
  const lv = ['eng', 'han', 'nit'].reduce((s, k) => s + store.upgLevel(sel.bike, k), 0);
  $('bkName').textContent = dailyMode ? `${BIKES[DAILY_BIKE].name} 🎯` : `${bike.name}${lv ? ` (+${lv})` : ''}`;
  $('play').disabled = !unlocked; $('playLbl').textContent = unlocked ? tr('menu.play') : '🔒';
  renderHome(def, mode, unlocked, dailyMode);
  const li = prog.levelInfo();
  $('lvlTxt').textContent = tr('menu.level', { n: li.lvl }); $('xpFill').style.width = `${(li.rem / li.need) * 100}%`; $('xpTxt').textContent = `${li.rem}/${li.need} XP`;
  $('goal').innerHTML = goalHTML();
  showWallet();
}
// ----- Accueil visuel : pastilles à icônes au lieu de listes de texte -----
let infoOpen = false;
const hex6 = (c) => '#' + c.toString(16).padStart(6, '0');
function renderHome(def, mode, unlocked, dailyMode) {
  const ICO = { race: '🏁', cup: '🏆', trial: '⏱', daily: '🎯' };
  $('chipModeIco').textContent = ICO[mode]; $('chipModeTxt').textContent = tr('mode.' + mode);
  $('chipThumb').style.background = `linear-gradient(${hex6(def.sky)} 0 45%, ${hex6(def.ground)} 45% 70%, ${hex6(def.dirt)} 70%)`;
  $('chipLock').style.display = unlocked ? 'none' : 'flex';
  $('chipTrackTxt').textContent = mode === 'cup' ? tr('cup.name.' + sel.cup) : tr('track.' + def.id);
  $('chipStars').textContent = mode === 'race' && unlocked ? starsStr(def.id) : '';
  const DOT = ['#4be36b', '#ffc233', '#ff5a4d'];
  [...$('chipDots').children].forEach((d, i) => { d.style.background = i <= sel.diff ? DOT[sel.diff] : ''; });
  $('chipDiffTxt').textContent = tr('diff.' + sel.diff);
  const b = dailyMode ? BIKES[DAILY_BIKE] : bike;
  $('chipSwatch').style.background = hex6(dailyMode ? b.color : store.paintColor(sel.bike, b.color));
  $('chipBikeTxt').textContent = b.name;
  const li = prog.levelInfo();
  $('lvlNum').textContent = li.lvl; $('ringFg').style.strokeDashoffset = 119.4 * (1 - li.rem / li.need);
  $('lvlRing').title = `${tr('menu.level', { n: li.lvl })} · ${li.rem}/${li.need} XP`;
  // fiche d'info : affichée seulement pour le défi quotidien, une piste verrouillée, ou à la demande (ℹ)
  const card = $('infoCard'); card.innerHTML = $('objs').innerHTML;
  card.style.display = dailyMode || !unlocked || infoOpen ? 'block' : 'none';
  $('garage').title = tr('menu.garage'); $('bAchv').title = tr('menu.achv'); $('bSet').title = tr('menu.settings');
  $('bLb').title = tr('menu.leaderboard'); $('bSignIn').title = tr('menu.signin'); $('bInfo').title = tr('obj.title');
}
// Vitrine : les 6 pilotes côte à côte sur la ligne de départ (accueil et garage)
function placeGrid() {
  all.forEach((r, i) => resetRider(r, gridSlot(i)));
  const S = track.SAMPLES, idx = S - 10, p = track.samples[idx], q = track.samples[(idx + 3) % S], nv = track.normalAt(idx);
  const hd = Math.atan2(q.x - p.x, q.z - p.z);
  all.forEach((r, i) => {
    const off = (i - 2.5) * 2.7, fw = (i % 2) * 1.5;
    r.x = p.x + nv.x * off + Math.sin(hd) * fw; r.z = p.z + nv.z * off + Math.cos(hd) * fw; r.heading = hd;
    r.y = track.heightAt(r.x, r.z, idx); r.idx = idx;
    applyMesh(r, 0);
  });
  lastIdx = player.idx;
}
function restoreTrack() { if (sel.mode !== 'cup' && sel.track !== baseTrack) { sel.track = baseTrack; loadTrack(baseTrack); placeGrid(); } }
function changeTrack() { baseTrack = sel.track; saveSelAll(); loadTrack(sel.track); placeGrid(); renderMenu(); if (audioStarted) startMusic(themeId(), 0.2); }
const stepTrack = (d) => {
  if (sel.mode === 'cup') { sel.cup = cycle(sel.cup, d, CUPS.length); cup = null; saveSelAll(); renderMenu(); return; }
  sel.track = cycle(sel.track, d, TRACKS.length); changeTrack();
};
$('trkP').onclick = () => stepTrack(-1); $('trkN').onclick = () => stepTrack(1);
$('difP').onclick = () => { sel.diff = cycle(sel.diff, -1, 3); saveSelAll(); renderMenu(); };
$('difN').onclick = () => { sel.diff = cycle(sel.diff, 1, 3); saveSelAll(); renderMenu(); };
const changeMode = (d) => { sel.mode = MODES[cycle(MODES.indexOf(sel.mode), d, MODES.length)]; saveSelAll(); restoreTrack(); renderMenu(); };
$('modeP').onclick = () => changeMode(-1); $('modeN').onclick = () => changeMode(1);

// ---------- Garage : acheter, équiper, améliorer, peindre ----------
let gi = 0;
function openGarage() {
  garageOpen = true; gi = sel.bike;
  showScreen('garageScreen');
  ais.forEach((a) => { a.mesh.visible = false; });
  setPlayerBike(gi); placeGrid(); renderGarage();
}
function closeGarage() {
  garageOpen = false; showScreen('menu');
  ais.forEach((a) => { a.mesh.visible = true; });
  setPlayerBike(sel.bike); placeGrid(); renderMenu();
}
function renderGarage() {
  const b = BIKES[gi], owned = store.owns(gi), eq = gi === sel.bike, coins = store.get().coins;
  $('gName').textContent = b.name;
  $('gStatus').innerHTML = owned ? (eq ? tr('garage.equipped') : tr('garage.owned')) : `<span class="lock">🔒 ${store.BIKE_PRICES[gi]} 🪙</span>`;
  $('gStats').innerHTML = statsHTML(owned ? store.effectiveStats(b, gi) : b) + `<span style="grid-column:1/3;opacity:.7">${tr('bike.' + gi)}</span>`;
  const box = $('gUpg'); box.innerHTML = '';
  for (const u of store.UPGRADES) {
    const lvl = store.upgLevel(gi, u.key), cost = store.upgCost(lvl, gi), max = lvl >= store.MAX_UPG;
    const left = document.createElement('div');
    left.innerHTML = `<b>${tr('upg.' + u.key)}</b> <small style="opacity:.7">${tr('upg.' + u.key + '.d')}</small><br><span class="pips">${'●'.repeat(lvl)}${'○'.repeat(store.MAX_UPG - lvl)}</span>`;
    const btn = document.createElement('button');
    btn.style.cssText = 'font-size:16px;padding:6px 16px';
    btn.textContent = !owned ? '—' : max ? tr('garage.max') : `🪙 ${cost}`;
    btn.disabled = !owned || max || coins < cost;
    btn.onclick = () => { if (store.buyUpgrade(gi, u.key)) { sfx.buy(); if (gi === sel.bike) stats = store.effectiveStats(bike, gi); renderGarage(); toastAchv(); } else sfx.error(); };
    box.append(left, btn);
  }
  // Peintures
  const pr = $('gPaint'); pr.innerHTML = '';
  const lab = document.createElement('span'); lab.textContent = tr('garage.paint'); lab.style.cssText = 'font-size:14px;opacity:.8'; pr.append(lab);
  store.PAINTS.forEach((c, i) => {
    const own = store.get().paints.includes(i), eqp = owned && store.paintOf(gi) === i, hex = '#' + (c === null ? b.color : c).toString(16).padStart(6, '0');
    const sw = document.createElement('button');
    sw.style.cssText = `width:34px;height:34px;padding:0;border-radius:50%;background:${hex};border:3px solid ${eqp ? '#fff' : '#0009'};font-size:13px;opacity:${!owned || (!own && coins < store.PAINT_COST) ? 0.45 : 1}`;
    sw.textContent = own ? '' : '🔒'; sw.title = own ? '' : `🪙 ${store.PAINT_COST}`; sw.disabled = !owned;
    sw.onclick = () => {
      if (!own) { if (!store.buyPaint(i)) { sfx.error(); return; } sfx.buy(); }
      store.setPaint(gi, i); setPlayerBike(gi); placeGrid(); renderGarage();
    };
    pr.append(sw);
  });
  const act = $('gAct');
  if (!owned) { act.textContent = tr('garage.buy', { n: store.BIKE_PRICES[gi] }); act.disabled = coins < store.BIKE_PRICES[gi]; }
  else if (!eq) { act.textContent = tr('garage.equip'); act.disabled = false; }
  else { act.textContent = tr('garage.equippedBtn'); act.disabled = true; }
  showWallet();
}
$('gAct').onclick = () => {
  if (!store.owns(gi)) { if (!store.buyBike(gi)) { sfx.error(); return; } sfx.buy(); }
  sel.bike = gi; saveSelAll(); bike = BIKES[gi]; stats = store.effectiveStats(bike, gi); renderGarage(); toastAchv();
};
const stepBike = (d) => { const o = store.BIKE_ORDER; gi = o[cycle(o.indexOf(gi), d, o.length)]; setPlayerBike(gi); placeGrid(); renderGarage(); };
$('gP').onclick = () => stepBike(-1); $('gN').onclick = () => stepBike(1);
$('garage').onclick = openGarage; $('gBack').onclick = closeGarage;

// Succès débloqués en dehors des courses (achats…)
function toastAchv() {
  prog.checkAchievements().forEach((a) => { toast(tr('toast.achv', { name: prog.achvName(a), n: a.reward }), 3800); sfx.star(); });
  showWallet();
}

// ---------- Réglages et succès ----------
function fillLangSelects() {
  for (const id of ['langSel', 'langSel2']) {
    const s = $(id); s.innerHTML = LANGS.map((l) => `<option value="${l.id}">${l.name}</option>`).join(''); s.value = getLang();
    s.onchange = () => changeLang(s.value);
  }
}
function changeLang(v) {
  store.get().settings.lang = v; store.save();
  setLang(v);
  $('langSel').value = $('langSel2').value = v;
}
function changeQuality(d) {
  qMode = QMODES[cycle(QMODES.indexOf(qMode), d, QMODES.length)];
  store.get().settings.quality = qMode; store.save();
  level = qMode === 'auto' ? autoLevel() : qMode;
  applyLevel(); loadTrack(loadedTrack >= 0 ? loadedTrack : sel.track); placeGrid(); renderSettings();
}
function renderSettings() {
  $('qName').textContent = qMode === 'auto' ? tr('q.auto', { l: tr('q.' + level) }) : tr('q.' + qMode);
  $('setMusic').textContent = isMusicOn() ? tr('set.on') : tr('set.off');
  $('setSfx').textContent = isSfxOn() ? tr('set.on') : tr('set.off');
  $('langSel2').value = getLang();
}
function renderAchv() {
  const d = store.get();
  $('achvCount').textContent = `${Object.keys(d.achv).length}/${prog.ACHIEVEMENTS.length}`;
  $('achvGrid').innerHTML = prog.ACHIEVEMENTS.map((a) => `<div class="${d.achv[a.id] ? 'on' : ''}"><b>${d.achv[a.id] ? '🏅' : '🔒'} ${prog.achvName(a)}</b>${prog.achvDesc(a)}<br><small>+${a.reward} 🪙</small></div>`).join('');
}
$('qP').onclick = () => changeQuality(-1); $('qN').onclick = () => changeQuality(1);
$('setMusic').onclick = toggleMusic; $('setSfx').onclick = toggleSfx;
$('bSet').onclick = () => { renderSettings(); showScreen('settings'); };
$('setBack').onclick = () => showScreen('menu');
$('bAchv').onclick = () => { renderAchv(); showScreen('achvScreen'); };
$('achvBack').onclick = () => showScreen('menu');
$('setReset').onclick = () => {
  if (!confirm(tr('set.resetConfirm'))) return;
  try {
    ['motocross_save_v2', 'motocross_sel'].forEach((k) => localStorage.removeItem(k));
    TRACKS.forEach((d) => { localStorage.removeItem('motocross_best_' + d.id); localStorage.removeItem('motocross_ghost_' + d.id); });
  } catch (e) {}
  location.reload();
};
onLang(() => {
  renderMenu(); renderIcons();
  if (garageOpen) renderGarage();
  if ($('achvScreen').style.display !== 'none') renderAchv();
  if ($('settings').style.display !== 'none') renderSettings();
});

// ---------- Accueil : pastilles (toucher = suivant, clic droit = précédent) ----------
const chipAct = (id, next, prev) => { $(id).onclick = next; $(id).oncontextmenu = (e) => { e.preventDefault(); prev(); }; };
chipAct('chipMode', () => $('modeN').click(), () => $('modeP').click());
chipAct('chipTrack', () => stepTrack(1), () => stepTrack(-1));
chipAct('chipDiff', () => $('difN').click(), () => $('difP').click());
$('chipBike').onclick = () => openGarage();
$('bInfo').onclick = () => { infoOpen = !infoOpen; renderMenu(); };
$('bHelp').onclick = () => showScreen('helpScreen');
$('helpBack').onclick = () => showScreen('menu');

// ---------- Boutons principaux ----------
$('play').onclick = startRace;
$('again').onclick = async () => { if (!skipMidgame) await platform.showMidgameAd(); skipMidgame = false; if (sel.mode === 'cup' && cup && cup.done) cup = newCup(); startRace(); };
$('toMenu').onclick = async () => {
  if (!skipMidgame) await platform.showMidgameAd(); skipMidgame = false;
  if (cup && cup.done) cup = null;
  clearConfetti();
  state = 'menu'; $('end').style.display = 'none'; $('hud').style.display = 'none'; $('touch').style.display = 'none';
  showScreen('menu'); document.querySelector('.iconbtn').style.display = 'flex';
  ais.forEach((a) => { a.mesh.visible = true; }); if (ghostMesh) ghostMesh.visible = false;
  stopEngine(); if (audioStarted) { startMusic(themeId(), 0.2); setMusicIntensity(0.2); }
  restoreTrack(); setPlayerBike(sel.bike); placeGrid(); renderMenu();
};

// Premier geste de l'utilisateur : le navigateur autorise alors le son
const firstGesture = () => { if (audioStarted) return; audioStarted = true; initAudio(); startMusic(themeId(), state === 'menu' ? 0.2 : 1); };
addEventListener('pointerdown', firstGesture); addEventListener('keydown', firstGesture);
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) sfx.click(); });

// ---------- Pub avec récompense (bouton de l'écran de fin) ----------
let adAmount = 0, adBusy = false, skipMidgame = false;   // règle CrazyGames : pas de pub midgame après une pub récompensée dans la même pause
function offerAd(earned) {
  const btn = $('adBonus'); skipMidgame = false;
  adAmount = clamp(Math.max(Math.round(earned), 100), 100, 2000);
  if (!platform.ready) { btn.style.display = 'none'; return; }
  btn.textContent = tr('end.adBonus', { n: adAmount }); btn.disabled = false; btn.style.display = '';
  platform.hasAdblock().then((blocked) => { if (blocked) btn.style.display = 'none'; });
}
$('adBonus').onclick = async () => {
  if (adBusy) return;
  adBusy = true; $('adBonus').disabled = true;
  const ok = await platform.showRewardedAd();
  adBusy = false;
  if (ok) { skipMidgame = true; store.addCoins(adAmount); showWallet(); $('adBonus').style.display = 'none'; sfx.buy(); toast(tr('end.adThanks', { n: adAmount })); }
  else { $('adBonus').disabled = false; toast(tr('end.adFail')); }
};
// Le jeu est mis en pause côté plateforme quand l'onglet est caché
document.addEventListener('visibilitychange', () => { if (state === 'racing') { if (document.hidden) platform.gameplayStop(); else platform.gameplayStart(); } });

// ---------- Synchronisation avec la plateforme (sauvegarde cloud, compte, langue) ----------
let cloudTimer = 0, platformBound = false;
async function syncPlatform() {
  if (!platform.ready) return;
  const raw = await platform.cloudGet(store.SAVE_KEY);
  if (raw) store.mergeCloud(raw);
  else platform.cloudSet(store.SAVE_KEY, JSON.stringify(store.get()));            // première connexion : on envoie la sauvegarde locale
  store.setSaveHook(() => { clearTimeout(cloudTimer); cloudTimer = setTimeout(() => platform.cloudSet(store.SAVE_KEY, JSON.stringify(store.get())), 1500); });
  const st = store.get(), name = await platform.username();
  if (name && !st.playerName) { const n = cleanName(name); if (n) { st.playerName = n; store.save(); } }
  setLang(detect(st.settings.lang, platform.locale()));
  // la sauvegarde cloud peut avoir changé la moto/piste possédées, le son…
  if (!store.owns(sel.bike)) sel.bike = 0;
  if (!trackUnlocked(sel.track)) sel.track = 0;
  baseTrack = sel.track;
  setMusicOn(st.settings.music); setSfxOn(st.settings.sfx);
  if (!platformBound) {
    platformBound = true;
    // « Couper le son » demandé par la plateforme : prioritaire sur le son du jeu
    setPlatformMute(platform.muteAudio);
    platform.onSettingsChange((s) => setPlatformMute(s && typeof s === 'object' && 'muteAudio' in s ? s.muteAudio : platform.muteAudio));
    // Connexion / déconnexion au compte CrazyGames : on recharge la sauvegarde du compte
    platform.onAuthChange(async () => { await syncPlatform(); setPlayerBike(); placeGrid(); renderMenu(); renderIcons(); updateSignIn(); });
  }
}
async function updateSignIn() { $('bSignIn').style.display = platform.accountAvailable && !(await platform.getUser()) ? '' : 'none'; }
$('bSignIn').onclick = () => platform.showAuth();

// ---------- Démarrage ----------
// Ordre imposé par le SDK : init → loadingStart → chargement du jeu → loadingStop
async function boot() {
  await platform.init();
  platform.loadingStart();
  await syncPlatform();
  fillLangSelects();
  loadTrack(sel.track); setPlayerBike(); placeGrid(); renderMenu(); renderIcons();
  const bonus = store.claimDaily();
  if (bonus) { toast(tr('toast.daily', { n: bonus, s: store.get().daily.streak }), 4500); renderMenu(); }
  toastAchv();
  if (!store.get().challenge.best[dailyInfo().day]) toast(tr('daily.ready'), 3500);
  lb.flushPending();
  updateSignIn();
  if (import.meta.env.DEV) window.__g = { all, lb, platform, dailyInfo, setRaceTime: (v) => { raceTime = v; }, player, ais, keys, fx, store, prog, sel, get cup() { return cup; }, get state() { return state; }, get track() { return track; }, get coins() { return coinList; }, get level() { return level; } };
  requestAnimationFrame(frame);
  const ld = $('loading'); if (ld) ld.remove();
  platform.loadingStop();
  // Nouveau joueur sur CrazyGames : on l'amène directement en course (pas d'écran « Jouer » à cliquer)
  if (platform.ready && store.get().stats.races === 0 && sel.mode === 'race') startRace();
}
boot();
