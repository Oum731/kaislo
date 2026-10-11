// Estime un temps de référence (« par ») par piste à partir du modèle de vitesse des IA.
// Usage : node scripts/calc-par.mjs   — le résultat alimente PAR dans shared/daily.js
import { TRACKS, createTrack } from '../src/track.js';
const LAPS = 2;
const out = {};
TRACKS.forEach((def, idx) => {
  const tr = createTrack(def), S = tr.SAMPLES, sm = tr.samples, MPS = tr.length / S;
  const base = (42 + 2 * idx) * 0.97;                       // IA « Normal » moyenne
  let lap = 0;
  for (let i = 0; i < S; i++) {
    const a = sm[i], b = sm[(i + 6) % S], c = sm[(i + 14) % S];
    const d1 = Math.hypot(b.x - a.x, b.z - a.z) || 1, d2 = Math.hypot(c.x - b.x, c.z - b.z) || 1;
    const dot = ((b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z)) / (d1 * d2);
    const curv = Math.acos(Math.max(-1, Math.min(1, dot)));
    lap += MPS / (base * (1 - Math.min(0.45, curv * 4.5)));
  }
  out[def.id] = { length: Math.round(tr.length), aiLap: +lap.toFixed(1), par: Math.round(lap * LAPS * 0.93) };
});
console.log(JSON.stringify(out, null, 1));
