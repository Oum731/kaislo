// Serveur de classement local pour tester le jeu : node server/dev-server.mjs  (port 8787)
import http from 'node:http';
import { handle } from './core.js';
import { memoryDb } from './memory-db.js';
const db = memoryDb(process.env.DATA_FILE || new URL('./.data.json', import.meta.url).pathname);
const PORT = process.env.PORT || 8787;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const url = new URL(req.url, 'http://localhost');
  let body = null;
  if (req.method === 'POST') { const chunks = []; for await (const c of req) chunks.push(c); try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch (e) { res.writeHead(400, CORS); return res.end('{"error":"bad_json"}'); } }
  const out = await handle({ method: req.method, path: url.pathname, query: url.searchParams, body, ip: req.socket.remoteAddress }, db);
  res.writeHead(out.status, { 'Content-Type': 'application/json', ...CORS, ...out.headers });
  res.end(JSON.stringify(out.body));
}).listen(PORT, () => console.log(`Classement local sur http://localhost:${PORT}`));
