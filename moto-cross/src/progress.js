// Progression : niveaux (XP), objectifs à étoiles, succès.
import * as store from './save.js';
import { t } from './i18n.js';

// ----- Niveaux -----
export const xpNeed = (lvl) => 200 + (lvl - 1) * 120;
export function levelInfo(xp = store.get().xp) {
  let lvl = 1, rem = xp;
  while (rem >= xpNeed(lvl)) { rem -= xpNeed(lvl); lvl++; }
  return { lvl, rem, need: xpNeed(lvl) };
}
export function addXp(n) {
  const d = store.get(), before = levelInfo().lvl;
  d.xp += Math.round(n);
  const after = levelInfo().lvl;
  let reward = 0;
  for (let l = before + 1; l <= after; l++) reward += 150 * l;
  d.coins += reward; store.save();
  return { before, after, reward };
}

// ----- Objectifs (3 étoiles par piste) -----
export const OBJECTIVES = {
  forest: [{ k: 'place', n: 3 }, { k: 'coins', n: 50 }, { k: 'tricks', n: 3 }],
  desert: [{ k: 'place', n: 2 }, { k: 'coins', n: 80 }, { k: 'nocrash' }],
  snow: [{ k: 'place', n: 1 }, { k: 'coins', n: 70 }, { k: 'tricks', n: 5 }],
  volcano: [{ k: 'place', n: 2 }, { k: 'coins', n: 90 }, { k: 'tricks', n: 6 }],
  night: [{ k: 'place', n: 2 }, { k: 'coins', n: 100 }, { k: 'nocrash' }],
  tropic: [{ k: 'place', n: 1 }, { k: 'coins', n: 100 }, { k: 'tricks', n: 8 }],
};
export function objectiveText(o) {
  if (o.k === 'place') return o.n === 1 ? t('obj.win') : t('obj.place', { n: o.n });
  if (o.k === 'nocrash') return t('obj.nocrash');
  return t('obj.' + o.k, { n: o.n });
}
const met = (o, r) => (o.k === 'place' ? r.place <= o.n : o.k === 'coins' ? r.coins >= o.n : o.k === 'tricks' ? r.tricks >= o.n : r.crashes === 0);
export const starsOf = (id) => store.get().stars[id] || [false, false, false];
export const starCount = (id) => starsOf(id).filter(Boolean).length;
export const totalStars = () => Object.values(store.get().stars).reduce((s, a) => s + a.filter(Boolean).length, 0);
// Valide les objectifs atteints pour la première fois ; renvoie les nouvelles étoiles
export function awardObjectives(id, r) {
  const d = store.get(), list = OBJECTIVES[id] || [], cur = (d.stars[id] ||= [false, false, false]), out = [];
  list.forEach((o, i) => {
    if (!cur[i] && met(o, r)) { cur[i] = true; const coins = 100 * (i + 1); d.coins += coins; out.push({ i, text: objectiveText(o), coins }); }
  });
  if (out.length) store.save();
  return out;
}

// ----- Succès -----
const sum = (o) => Object.values(o);
export const ACHIEVEMENTS = [
  { id: 'firstWin', reward: 100, check: (d) => d.stats.wins >= 1 },
  { id: 'wins10', reward: 300, check: (d) => d.stats.wins >= 10 },
  { id: 'races25', reward: 200, check: (d) => d.stats.races >= 25 },
  { id: 'tricks50', reward: 250, check: (d) => d.stats.tricks >= 50 },
  { id: 'flip3', reward: 300, check: (d) => d.stats.bestTrick >= 3 },
  { id: 'flawless', reward: 300, check: (d) => d.stats.flawless >= 1 },
  { id: 'coins1k', reward: 150, check: (d) => d.stats.coins >= 1000 },
  { id: 'coins10k', reward: 500, check: (d) => d.stats.coins >= 10000 },
  { id: 'bike2', reward: 200, check: (d) => d.owned.length >= 2 },
  { id: 'allbikes', reward: 800, check: (d) => d.owned.length >= store.BIKE_PRICES.length },
  { id: 'maxUpg', reward: 300, check: (d) => sum(d.upg).some((u) => sum(u).some((v) => v >= store.MAX_UPG)) },
  { id: 'stars3', reward: 300, check: (d) => sum(d.stars).some((a) => a.every(Boolean)) },
  { id: 'allStars', reward: 1000, check: () => totalStars() >= Object.keys(OBJECTIVES).length * 3 },
  { id: 'champion', reward: 500, check: (d) => d.cupWins >= 1 },
  { id: 'champion2', reward: 800, check: (d) => d.stats.cupBWins >= 1 },
  { id: 'daily1', reward: 150, check: (d) => Object.keys(d.challenge.history).length >= 1 },
  { id: 'daily7', reward: 700, check: (d) => d.challenge.streak.count >= 7 },
  { id: 'dailyGold', reward: 400, check: (d) => Object.values(d.challenge.history).some((h) => h.medal === 3) },
  { id: 'level5', reward: 200, check: () => levelInfo().lvl >= 5 },
  { id: 'streak3', reward: 150, check: (d) => d.daily.streak >= 3 },
];
export function checkAchievements() {
  const d = store.get(), out = [];
  for (const a of ACHIEVEMENTS) if (!d.achv[a.id] && a.check(d)) { d.achv[a.id] = true; d.coins += a.reward; out.push(a); }
  if (out.length) store.save();
  return out;
}
export const achvName = (a) => t(`achv.${a.id}.n`);
export const achvDesc = (a) => t(`achv.${a.id}.d`, { n: a.id === 'allbikes' ? store.BIKE_PRICES.length : Object.keys(OBJECTIVES).length * 3 });
