// Défi quotidien : logique partagée entre le jeu (navigateur) et le serveur de classement.
// Aucune dépendance (ni DOM, ni THREE) pour pouvoir tourner partout.
export const TRACK_IDS = ['forest', 'desert', 'snow', 'volcano', 'night', 'tropic'];
export const MODIFIERS = ['classic', 'lowgrav', 'slick', 'turbo', 'swift'];
export const DAILY_LAPS = 2;
export const DAILY_BIKE = 1;                    // moto prêtée : la même pour tout le monde (indice dans BIKES)

// Temps de référence (secondes, 2 tours) — voir scripts/calc-par.mjs. Estimations initiales :
// affinez-les avec les vrais temps du classement (médiane / meilleurs 10 %).
export const PAR = { forest: 114, desert: 111, snow: 145, volcano: 104, night: 112, tropic: 95 };
export const MEDAL_RATIO = { gold: 1.0, silver: 1.12, bronze: 1.3 };
export const MEDAL_COINS = [0, 75, 150, 300];   // indice = niveau de médaille (0 aucune, 1 bronze, 2 argent, 3 or)
export const MIN_RATIO = 0.55;                  // temps inférieur à 55 % du par = refusé (triche / bug)
export const MAX_TIME = 20 * 60;                // 20 min

const pad = (n) => String(n).padStart(2, '0');
export const dayString = (d = new Date()) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
export const shiftDay = (day, delta) => dayString(new Date(Date.parse(day + 'T00:00:00Z') + delta * 864e5));
export const secondsToNextDay = (now = new Date()) => Math.max(0, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000));

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Pistes tirées par « sacs » de 6 jours : chaque piste revient une fois par sac, jamais deux jours de suite
const dayNumber = (day) => Math.floor(Date.parse(day + 'T00:00:00Z') / 864e5);
function bag(k) {
  const r = rng(hash('motocross-bag-' + k)), a = TRACK_IDS.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function trackOf(day) {
  const n = dayNumber(day), k = Math.floor(n / TRACK_IDS.length), p = ((n % TRACK_IDS.length) + TRACK_IDS.length) % TRACK_IDS.length, b = bag(k);
  if (p < 2 && b[0] === bag(k - 1)[TRACK_IDS.length - 1]) [b[0], b[1]] = [b[1], b[0]];
  return b[p];
}

// Le défi d'un jour : piste + modificateur (identiques pour tous les joueurs, tirés de la date UTC)
export function dailyFor(day) {
  const trackIdx = trackOf(day);
  const r = rng(hash('motocross-daily-mod-' + day));
  const mod = MODIFIERS[Math.floor(r() * MODIFIERS.length)];
  const id = TRACK_IDS[trackIdx];
  return { day, trackIdx, id, mod, par: PAR[id], laps: DAILY_LAPS };
}

// Niveau de médaille pour un temps (secondes) : 3 or, 2 argent, 1 bronze, 0 aucune
export function medalFor(id, time) {
  if (!time) return 0;
  const par = PAR[id];
  return time <= par * MEDAL_RATIO.gold ? 3 : time <= par * MEDAL_RATIO.silver ? 2 : time <= par * MEDAL_RATIO.bronze ? 1 : 0;
}
export const medalTargets = (id) => ({ gold: PAR[id] * MEDAL_RATIO.gold, silver: PAR[id] * MEDAL_RATIO.silver, bronze: PAR[id] * MEDAL_RATIO.bronze });

// Effets des modificateurs sur la physique
export function modifierEffects(mod) {
  const fx = { gravity: 1, grip: 1, recharge: 1, speed: 1, accel: 1 };
  if (mod === 'lowgrav') fx.gravity = 0.58;
  else if (mod === 'slick') fx.grip = 0.65;
  else if (mod === 'turbo') fx.recharge = 4;
  else if (mod === 'swift') { fx.speed = 1.1; fx.accel = 1.15; }
  return fx;
}

// Nom de joueur : 2 à 14 caractères (lettres, chiffres, espace, _ . -)
const BAD = ['fuck', 'shit', 'bitch', 'nazi', 'hitler', 'rape', 'puta', 'merde', 'pute', 'nigg', 'fdp', 'conn'];
export function cleanName(n) {
  const s = String(n || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!/^[\p{L}\p{N} _.\-]{2,14}$/u.test(s)) return null;
  const low = s.toLowerCase().replace(/[^a-z]/g, '');
  return BAD.some((w) => low.includes(w)) ? null : s;
}
export const isPlayerId = (s) => typeof s === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(s);
