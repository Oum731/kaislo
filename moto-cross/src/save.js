// Sauvegarde locale (localStorage) avec valeurs par défaut et migration douce.
const KEY = 'motocross_save_v2';
const defaults = () => ({
  coins: 0,
  owned: [0],
  upg: {},                 // upg[indexMoto] = { eng, han, nit } (niveaux 0..5)
  podium: {},              // podium[idPiste] = true si top 3 obtenu
  daily: { day: '', streak: 0 },
  settings: { music: true, sfx: true, quality: 'auto', lang: null },
  stats: { races: 0, wins: 0, tricks: 0, coins: 0, crashes: 0, bestTrick: 0, flawless: 0, cupBWins: 0 },
  xp: 0,
  stars: {},               // stars[idPiste] = [bool, bool, bool]
  achv: {},                // achv[id] = true
  paints: [0],             // peintures possédées (indices de PAINTS)
  paint: {},               // paint[indexMoto] = indice de peinture équipée
  cupWins: 0,
});
let data = defaults();
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (raw && typeof raw === 'object') {
    const d = defaults();
    data = { ...d, ...raw, settings: { ...d.settings, ...(raw.settings || {}) }, stats: { ...d.stats, ...(raw.stats || {}) }, daily: { ...d.daily, ...(raw.daily || {}) } };
  }
} catch (e) {}
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
export const get = () => data;

export const PAINTS = [null, 0xe8212b, 0xffd400, 0x00b7ff, 0x7dff3a, 0xff5fd2, 0xf5f5f5, 0x1b1b1f];
export const PAINT_COST = 250;
export const paintOf = (bike) => (data.paint[bike] | 0);
export const paintColor = (bike, base) => { const p = PAINTS[paintOf(bike)]; return p === null || p === undefined ? base : p; };
export function buyPaint(i) { if (data.paints.includes(i) || data.coins < PAINT_COST) return false; data.coins -= PAINT_COST; data.paints.push(i); save(); return true; }
export function setPaint(bike, i) { if (!data.paints.includes(i)) return false; data.paint[bike] = i; save(); return true; }

export const MAX_UPG = 5;
export const BIKE_PRICES = [0, 1500, 4000, 9000, 6000, 12000, 20000, 35000];
// Ordre d'affichage au garage : du moins cher au plus cher
export const BIKE_ORDER = BIKE_PRICES.map((p, i) => i).sort((a, b) => BIKE_PRICES[a] - BIKE_PRICES[b]);
export const UPGRADES = [
  { key: 'eng', name: 'Moteur', desc: 'Vitesse max + accélération' },
  { key: 'han', name: 'Suspension', desc: 'Maniabilité' },
  { key: 'nit', name: 'Nitro', desc: 'Puissance et recharge' },
];
export const upgLevel = (bike, key) => ((data.upg[bike] || {})[key]) | 0;
// Les motos haut de gamme coûtent plus cher à améliorer
export const upgCost = (lvl, bike = 0) => Math.round((250 * Math.pow(lvl + 1, 1.5) * (1 + BIKE_PRICES[bike] / 8000)) / 10) * 10;
export const owns = (bike) => data.owned.includes(bike);

export function addCoins(n) { data.coins += Math.round(n); save(); }
export function buyBike(i) {
  if (owns(i) || data.coins < BIKE_PRICES[i]) return false;
  data.coins -= BIKE_PRICES[i]; data.owned.push(i); save(); return true;
}
export function buyUpgrade(bike, key) {
  const lvl = upgLevel(bike, key);
  if (!owns(bike) || lvl >= MAX_UPG || data.coins < upgCost(lvl, bike)) return false;
  data.coins -= upgCost(lvl, bike);
  (data.upg[bike] ||= {})[key] = lvl + 1; save(); return true;
}
// Stats réelles d'une moto = base + améliorations
export function effectiveStats(base, i) {
  const e = upgLevel(i, 'eng'), h = upgLevel(i, 'han'), n = upgLevel(i, 'nit');
  return { ...base, max: base.max + e * 1.1, acc: base.acc + e * 1.0, handling: base.handling + h * 0.04, nitro: base.nitro + n * 0.07, recharge: 1 + n * 0.18 };
}

// Bonus quotidien : 100 pièces x série (max 7 jours)
export function claimDaily() {
  const today = new Date().toISOString().slice(0, 10);
  if (data.daily.day === today) return 0;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  data.daily.streak = data.daily.day === y ? Math.min(7, data.daily.streak + 1) : 1;
  data.daily.day = today;
  const bonus = 100 * data.daily.streak;
  data.coins += bonus; save();
  return bonus;
}
