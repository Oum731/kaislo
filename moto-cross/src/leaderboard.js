// Client du classement quotidien. L'adresse du serveur se règle à la compilation :
//   VITE_LEADERBOARD_URL=https://votre-worker.workers.dev npm run build
// Sans adresse, le défi fonctionne quand même : résultats et historique restent sur l'appareil.
import * as store from './save.js';

export const LB_URL = String(import.meta.env.VITE_LEADERBOARD_URL || '').replace(/\/$/, '');
export const lbEnabled = !!LB_URL;

async function call(path, opts) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(LB_URL + path, { ...opts, signal: ctl.signal });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; } finally { clearTimeout(to); }
}

export const fetchBoard = (day, limit = 20) => (lbEnabled ? call(`/daily?day=${day}&limit=${limit}&playerId=${encodeURIComponent(store.playerId())}`) : Promise.resolve(null));

// Envoie un temps. En cas d'échec réseau, le score est gardé et renvoyé plus tard.
export async function submitScore({ day, track, time }) {
  if (!lbEnabled) return null;
  const payload = { day, track, time, name: store.get().playerName, playerId: store.playerId() };
  const res = await call('/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const ch = store.get().challenge;
  if (res && res.ok) { if (ch.pending && ch.pending.day === day) { ch.pending = null; store.save(); } return res; }
  ch.pending = { day, track, time }; store.save();
  return null;
}
export async function flushPending() {
  const p = store.get().challenge.pending;
  return p && lbEnabled && store.get().playerName ? submitScore(p) : null;
}
