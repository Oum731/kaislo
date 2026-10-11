// Audio 100 % généré par le code : moteur, effets et musique (aucun fichier à charger).
let ctx, master, musicBus, sfxBus, noiseBuf;
let eng = null;
let musicOn = true, sfxOn = true, adMuted = false, platMuted = false;
const silenced = () => adMuted || platMuted;

export function initAudio() {
  if (ctx) { ctx.resume && ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn && !silenced() ? 0.5 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn && !silenced() ? 1 : 0; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    buildEngine();
  } catch (e) { ctx = null; }
}
const now = () => ctx.currentTime;
const ok = () => !!ctx;
export function setMusicOn(v) { musicOn = v; if (ctx) musicBus.gain.setTargetAtTime(v && !silenced() ? 0.5 : 0, now(), 0.05); }
export function setSfxOn(v) { sfxOn = v; if (ctx) sfxBus.gain.setTargetAtTime(v && !silenced() ? 1 : 0, now(), 0.05); }
export function muteForAd(v) { adMuted = v; setMusicOn(musicOn); setSfxOn(sfxOn); }
// Réglage « couper le son » de la plateforme : prioritaire sur les réglages du jeu
export function setPlatformMute(v) { platMuted = !!v; setMusicOn(musicOn); setSfxOn(sfxOn); }
export const isMusicOn = () => musicOn;
export const isSfxOn = () => sfxOn;
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });

// ---------- briques ----------
function tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0, bus = sfxBus) {
  if (!ok()) return;
  const t = now() + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, freq = 1000, q = 1, vol = 0.2, type = 'bandpass', delay = 0, bus = sfxBus, sweepTo = 0) {
  if (!ok()) return;
  const t = now() + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}

// ---------- effets ----------
let coinCombo = 0, coinT = 0;
export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.12); },
  count() { tone(520, 0.18, 'square', 0.12); },
  go() { tone(780, 0.5, 'square', 0.14); tone(1170, 0.5, 'triangle', 0.1); },
  coin() {
    if (!ok()) return;
    coinCombo = now() - coinT < 0.6 ? Math.min(coinCombo + 1, 8) : 0; coinT = now();
    const f = 880 * Math.pow(1.0595, coinCombo * 2);
    tone(f, 0.08, 'square', 0.08); tone(f * 1.5, 0.18, 'triangle', 0.1, 0, 0.06);
  },
  land(power = 1) { noise(0.25, 300, 0.8, 0.35 * power, 'lowpass'); tone(90, 0.2, 'sine', 0.35 * power, -50); },
  bump() { noise(0.12, 900, 1, 0.25); tone(160, 0.1, 'square', 0.1, -80); },
  crash() { noise(0.7, 1500, 0.6, 0.5, 'lowpass', 0, sfxBus, 120); tone(70, 0.5, 'sawtooth', 0.3, -40); },
  trick() { [660, 880, 1320].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, 0, i * 0.07)); },
  nitro() { noise(0.6, 400, 0.7, 0.3, 'bandpass', 0, sfxBus, 3500); tone(120, 0.5, 'sawtooth', 0.12, 220); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'square', 0.11, 0, i * 0.12)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, 0, i * 0.15)); },
  buy() { tone(988, 0.1, 'square', 0.1); tone(1319, 0.3, 'square', 0.1, 0, 0.09); },
  error() { tone(150, 0.2, 'square', 0.12, -30); },
  star() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, 0, i * 0.08)); },
  levelup() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.09, 0, i * 0.09)); },
  overtake() { noise(0.3, 600, 0.8, 0.2, 'bandpass', 0, sfxBus, 2500); },
  lap() { tone(880, 0.12, 'square', 0.1); tone(1320, 0.25, 'square', 0.1, 0, 0.1); },
};

// ---------- moteur (boîte de vitesses simulée) ----------
function buildEngine() {
  const g = ctx.createGain(); g.gain.value = 0;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
  const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
  const o2 = ctx.createOscillator(); o2.type = 'square';
  const o3 = ctx.createOscillator(); o3.type = 'sawtooth';           // couche nitro
  const g3 = ctx.createGain(); g3.gain.value = 0;
  o1.connect(f); o2.connect(f); o3.connect(g3); g3.connect(f); f.connect(g); g.connect(sfxBus);
  const wind = ctx.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
  const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 900; wf.Q.value = 0.5;
  const wg = ctx.createGain(); wg.gain.value = 0;
  wind.connect(wf); wf.connect(wg); wg.connect(sfxBus);
  o1.start(); o2.start(); o3.start(); wind.start();
  eng = { g, f, o1, o2, o3, g3, wg, wf, gear: 0 };
}
export function setEngine(speedRatio, throttle, nitro, grounded = true) {
  if (!ok() || !eng) return;
  const r = Math.min(1, Math.max(0, speedRatio)), gearF = r * 5, gear = Math.min(4, Math.floor(gearF)), rpm = gearF - gear;
  const freq = 48 + rpm * 85 + gear * 9 + (grounded ? 0 : 35);        // régime qui monte puis retombe à chaque rapport
  const t = now();
  eng.o1.frequency.setTargetAtTime(freq, t, 0.04); eng.o2.frequency.setTargetAtTime(freq * 0.5, t, 0.04);
  eng.o3.frequency.setTargetAtTime(freq * 1.5 + 6, t, 0.04);
  eng.f.frequency.setTargetAtTime(450 + throttle * 900 + rpm * 500, t, 0.08);
  eng.g.gain.setTargetAtTime(0.05 + throttle * 0.06, t, 0.1);
  eng.g3.gain.setTargetAtTime(nitro ? 0.5 : 0, t, 0.05);
  eng.wg.gain.setTargetAtTime(r * r * 0.12, t, 0.15); eng.wf.frequency.setTargetAtTime(500 + r * 1500, t, 0.15);
}
export function stopEngine() { if (ok() && eng) { eng.g.gain.setTargetAtTime(0, now(), 0.1); eng.wg.gain.setTargetAtTime(0, now(), 0.1); eng.g3.gain.setTargetAtTime(0, now(), 0.1); } }
export function startEngine() { initAudio(); }

// ---------- musique ----------
// 16 pas par mesure, 4 mesures. Chaque thème : tempo, gamme, progression d'accords, motifs.
const THEMES = {
  forest: { bpm: 126, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 5, 3, 4], bass: [0, null, 0, 0, null, 0, 7, null, 0, null, 0, 0, null, 3, 5, null], lead: [0, 2, 4, 2, 5, 4, 2, 0, 0, 2, 4, 6, 5, 4, 2, 4] },
  desert: { bpm: 112, root: 38, scale: [0, 1, 4, 5, 7, 8, 11], chords: [0, 1, 0, 5], bass: [0, null, null, 0, 1, null, 0, null, 0, null, 3, null, 4, null, 1, null], lead: [4, null, 5, 4, null, 2, 1, null, 4, null, 5, 6, null, 5, 4, 2] },
  volcano: { bpm: 134, root: 38, scale: [0, 1, 3, 5, 7, 8, 10], chords: [0, 0, 5, 1], bass: [0, 0, null, 0, null, 0, 1, null, 0, 0, null, 0, null, 3, 1, null], lead: [4, null, 4, 5, null, 4, 2, null, 4, null, 6, 5, null, 4, 3, 1] },
  night: { bpm: 116, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 5, 2, 4], bass: [0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 3, null, 4, null], lead: [4, 6, 4, 7, 4, 6, 4, 9, 5, 7, 5, 8, 6, 8, 6, 9] },
  tropic: { bpm: 108, root: 48, scale: [0, 2, 4, 5, 7, 9, 11], chords: [0, 4, 5, 3], bass: [0, null, null, 0, null, 4, null, null, 0, null, null, 0, null, 4, 3, null], lead: [4, 5, 4, 2, 4, null, 2, 1, 4, 5, 6, 4, 2, null, 1, 2] },
  snow: { bpm: 120, root: 40, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 2, 5, 4], bass: [0, null, null, 0, null, 0, null, 3, 0, null, null, 0, null, 4, null, 2], lead: [4, 6, 7, 6, 4, 6, 7, 9, 8, 7, 6, 4, 6, 4, 2, 4] },
};
let mTimer = 0, mStep = 0, mNext = 0, mTheme = null, mIntensity = 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const degToMidi = (th, deg) => th.root + th.scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);

function playStep(th, step, t) {
  const bar = Math.floor(step / 16) % 4, s = step % 16, chord = th.chords[bar], dt = t - now();
  const d = Math.max(0, dt);
  // basse
  const b = th.bass[s];
  if (b !== null) tone(mtof(degToMidi(th, chord + b)), 0.22, 'sawtooth', 0.16 * (0.5 + 0.5 * mIntensity), 0, d, musicBus);
  // batterie (course seulement)
  if (mIntensity > 0.5) {
    if (s % 4 === 0) { tone(150, 0.16, 'sine', 0.5, -110, d, musicBus); }
    if (s % 8 === 4) noise(0.14, 1800, 0.8, 0.3, 'bandpass', d, musicBus);
    if (s % 2 === 0) noise(0.04, 7000, 1, 0.07, 'highpass', d, musicBus);
    if (s === 15 && bar % 2 === 1) noise(0.1, 7000, 1, 0.1, 'highpass', d + 0.0, musicBus);
  }
  // mélodie
  const l = th.lead[s];
  if (l !== null && (mIntensity > 0.5 ? true : s % 2 === 0)) tone(mtof(degToMidi(th, chord + l) + 12), 0.2, mIntensity > 0.5 ? 'square' : 'triangle', mIntensity > 0.5 ? 0.05 : 0.07, 0, d, musicBus);
  // nappe
  if (s === 0) [0, 2, 4].forEach((k) => tone(mtof(degToMidi(th, chord + k) + 12), 60 / th.bpm * 4 * 0.95, 'triangle', 0.035, 0, d, musicBus));
}
function schedule() {
  if (!ok() || !mTheme) return;
  const spb = 60 / mTheme.bpm / 4;
  while (mNext < now() + 0.15) { playStep(mTheme, mStep, mNext); mNext += spb; mStep++; }
}
export function startMusic(id = 'forest', intensity = 1) {
  if (!ok()) return;
  mIntensity = intensity;
  if (mTheme === THEMES[id] && mTimer) return;
  stopMusic();
  mTheme = THEMES[id] || THEMES.forest; mStep = 0; mNext = now() + 0.1;
  mTimer = setInterval(schedule, 40);
}
export function setMusicIntensity(v) { mIntensity = v; }
export function stopMusic() { clearInterval(mTimer); mTimer = 0; mTheme = null; }
