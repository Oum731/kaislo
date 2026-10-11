// Tests du serveur de classement : node server/test.mjs
import assert from 'node:assert/strict';
import { handle, _resetRateLimit } from './core.js';
import { memoryDb } from './memory-db.js';
import { dayString, dailyFor, PAR } from '../shared/daily.js';

const db = memoryDb(), now = new Date('2026-10-12T10:00:00Z'), day = dayString(now), d = dailyFor(day);
const post = (b, ip = '1.1.1.1') => handle({ method: 'POST', path: '/daily', body: b, ip, now }, db);
const get = (q) => handle({ method: 'GET', path: '/daily', query: q, now }, db);
const ok = (name, extra = {}) => ({ day, playerId: 'player-' + name + '-0001', name, track: d.id, time: PAR[d.id] + 5, ...extra });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✔', name); };

await t('accepte un score valide et renvoie le rang', async () => {
  const r = await post(ok('Alice', { time: PAR[d.id] + 10 })); assert.equal(r.status, 200); assert.equal(r.body.rank, 1); assert.equal(r.body.total, 1);
});
await t('classe plusieurs joueurs par temps croissant', async () => {
  await post(ok('Bob', { time: PAR[d.id] + 3 })); await post(ok('Carla', { time: PAR[d.id] + 20 }));
  const r = await get({ day, playerId: 'player-Carla-0001' });
  assert.deepEqual(r.body.entries.map((e) => e.name), ['Bob', 'Alice', 'Carla']); assert.equal(r.body.you.rank, 3); assert.equal(r.body.total, 3);
});
await t('ne garde que le meilleur temps d\'un joueur', async () => {
  await post(ok('Carla', { time: PAR[d.id] + 40 })); const r = await get({ day, playerId: 'player-Carla-0001' }); assert.equal(r.body.you.time, PAR[d.id] + 20);
  await post(ok('Carla', { time: PAR[d.id] + 1 })); assert.equal((await get({ day, playerId: 'player-Carla-0001' })).body.you.rank, 1);
});
await t('refuse un temps impossible (trop rapide) ou absurde', async () => {
  assert.equal((await post(ok('Zed', { time: 5 }))).body.error, 'bad_time');
  assert.equal((await post(ok('Zed', { time: 99999 }))).body.error, 'bad_time');
  assert.equal((await post(ok('Zed', { time: 'abc' }))).body.error, 'bad_time');
});
await t('refuse un nom invalide ou grossier', async () => {
  for (const name of ['<script>', 'a', 'x'.repeat(30), 'fuck you']) assert.equal((await post(ok('Q', { name }))).body.error, 'bad_name');
});
await t('refuse un mauvais jour, une mauvaise piste, un identifiant invalide', async () => {
  assert.equal((await post(ok('Dan', { day: '2026-10-01' }))).body.error, 'bad_day');
  assert.equal((await post(ok('Dan', { track: d.id === 'forest' ? 'desert' : 'forest' }))).body.error, 'bad_track');
  assert.equal((await post(ok('Dan', { playerId: 'x' }))).body.error, 'bad_player');
});
await t('limite le débit par IP', async () => {
  _resetRateLimit(); let last; for (let i = 0; i < 25; i++) last = await post(ok('Eve' + i), '9.9.9.9'); assert.equal(last.status, 429);
});
await t('lecture : jour futur refusé, jour vide valide', async () => {
  assert.equal((await get({ day: '2030-01-01' })).status, 400);
  const r = await get({ day: '2026-10-11' }); assert.equal(r.status, 200); assert.equal(r.body.total, 0);
});
console.log(`\n${n} tests OK`);
