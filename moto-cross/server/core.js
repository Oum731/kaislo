// Logique du classement quotidien — indépendante de l'hébergeur (Cloudflare Worker, Node, …).
// Le stockage est injecté (`db`) : voir memory-db.js (dev/tests) et worker.js (Cloudflare D1).
import { dayString, isDay, shiftDay, dailyFor, cleanName, isPlayerId, PAR, TRACK_IDS, MIN_RATIO, MAX_TIME } from '../shared/daily.js';

const json = (status, body, extra = {}) => ({ status, body, headers: { 'Cache-Control': 'no-store', ...extra } });
const hits = new Map();   // limitation de débit par IP (au mieux : mémoire de l'instance)
function limited(ip, now) {
  const k = ip || 'anon', e = hits.get(k);
  if (!e || now - e.t > 60000) { hits.set(k, { n: 1, t: now }); if (hits.size > 5000) hits.clear(); return false; }
  return ++e.n > 20;
}

/**
 * @param {{method:string, path:string, query:URLSearchParams|Record<string,string>, body?:any, ip?:string, now?:Date}} req
 * @param {{upsertBest:Function, getBest:Function, top:Function, rankOf:Function, count:Function}} db
 */
export async function handle(req, db) {
  const now = req.now || new Date(), q = req.query instanceof URLSearchParams ? Object.fromEntries(req.query) : req.query || {};
  const today = dayString(now);
  if (req.path === '/health') return json(200, { ok: true, day: today });
  if (req.path !== '/daily') return json(404, { error: 'not_found' });

  if (req.method === 'GET') {
    const day = q.day || today;
    if (!isDay(day) || day > today || day < shiftDay(today, -30)) return json(400, { error: 'bad_day' });
    const limit = Math.min(50, Math.max(1, parseInt(q.limit, 10) || 20));
    const rows = await db.top(day, limit), total = await db.count(day);
    const entries = rows.map((r, i) => ({ rank: i + 1, name: r.name, time: r.ms / 1000 }));
    let you = null;
    if (isPlayerId(q.playerId)) { const ms = await db.getBest(day, q.playerId); if (ms) you = { rank: (await db.rankOf(day, ms)) + 1, time: ms / 1000 }; }
    return json(200, { day, track: dailyFor(day).id, total, entries, you }, { 'Cache-Control': 'public, max-age=10' });
  }

  if (req.method === 'POST') {
    if (limited(req.ip, now.getTime())) return json(429, { error: 'rate_limited' });
    const b = req.body || {};
    // Seul le défi d'aujourd'hui (ou d'hier, pour une partie commencée avant minuit UTC) est accepté
    if (!isDay(b.day) || (b.day !== today && b.day !== shiftDay(today, -1))) return json(400, { error: 'bad_day' });
    if (!isPlayerId(b.playerId)) return json(400, { error: 'bad_player' });
    const name = cleanName(b.name);
    if (!name) return json(400, { error: 'bad_name' });
    if (!TRACK_IDS.includes(b.track) || b.track !== dailyFor(b.day).id) return json(400, { error: 'bad_track' });
    const t = Number(b.time);
    if (!Number.isFinite(t) || t < PAR[b.track] * MIN_RATIO || t > MAX_TIME) return json(400, { error: 'bad_time' });
    const ms = Math.round(t * 1000);
    await db.upsertBest(b.day, b.playerId, name, ms);
    const best = await db.getBest(b.day, b.playerId);
    return json(200, { ok: true, best: best / 1000, rank: (await db.rankOf(b.day, best)) + 1, total: await db.count(b.day) });
  }
  return json(405, { error: 'method_not_allowed' });
}
export const _resetRateLimit = () => hits.clear();
