// Cloudflare Worker + base D1 (SQLite). Voir server/README.md pour le déploiement (gratuit).
import { handle } from './core.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };

const d1 = (DB) => ({
  async upsertBest(day, pid, name, ms) {
    await DB.prepare('INSERT INTO scores (day, pid, name, ms, created) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(day, pid) DO UPDATE SET name = excluded.name, ms = MIN(scores.ms, excluded.ms)').bind(day, pid, name, ms, Date.now()).run();
  },
  async getBest(day, pid) { const r = await DB.prepare('SELECT ms FROM scores WHERE day = ?1 AND pid = ?2').bind(day, pid).first(); return r ? r.ms : 0; },
  async top(day, limit) { const r = await DB.prepare('SELECT name, ms FROM scores WHERE day = ?1 ORDER BY ms ASC, created ASC LIMIT ?2').bind(day, limit).all(); return r.results || []; },
  async rankOf(day, ms) { const r = await DB.prepare('SELECT COUNT(*) AS c FROM scores WHERE day = ?1 AND ms < ?2').bind(day, ms).first(); return r ? r.c : 0; },
  async count(day) { const r = await DB.prepare('SELECT COUNT(*) AS c FROM scores WHERE day = ?1').bind(day).first(); return r ? r.c : 0; },
});

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    let body = null;
    if (request.method === 'POST') { try { body = await request.json(); } catch (e) { return new Response('{"error":"bad_json"}', { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }); } }
    const res = await handle({ method: request.method, path: url.pathname, query: url.searchParams, body, ip: request.headers.get('CF-Connecting-IP') }, d1(env.DB));
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'Content-Type': 'application/json', ...CORS, ...res.headers } });
  },
};
