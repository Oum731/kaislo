// Défi anti-robot : les formulaires publics exigent un défi résolu, valable une seule fois et pour peu de temps
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';
import { trouverNonce, zerosEnTete } from '../src/lib/defi.js';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-defi-'));
const fichierEnv = path.join(dossier, '.env');
let serveur;

async function api(methode, chemin, corps) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
async function defiResolu() {
  const d = await api('GET', '/defi');
  assert.equal(d.bits, 10);
  return { sel: d.sel, expire: d.expire, signature: d.signature, nonce: await trouverNonce(d.sel, d.bits) };
}
const contact = (defi) => ({ nom: 'Visiteur', contact: 'visiteur@exemple.com', texte: 'Bonjour, une question sur les tarifs', ...(defi ? { defi } : {}) });

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\nDefiBits=10\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('zerosEnTete compte les zéros binaires du début', () => {
  assert.equal(zerosEnTete(new Uint8Array([0x80])), 0);
  assert.equal(zerosEnTete(new Uint8Array([0x0f])), 4);
  assert.equal(zerosEnTete(new Uint8Array([0, 0x01])), 15);
});

test('sans défi, avec un faux défi ou un nombre faux : refusé', async () => {
  assert.equal((await api('POST', '/contact', contact())).statut, 400);
  const d = await api('GET', '/defi');
  assert.equal((await api('POST', '/contact', contact({ sel: d.sel, expire: d.expire, signature: d.signature, nonce: 'x'.repeat(30) }))).statut, 400);
  assert.equal((await api('POST', '/contact', contact({ sel: d.sel, expire: d.expire, signature: 'a'.repeat(64), nonce: '1' }))).statut, 400);
  // Signature valable mais expiration repoussée : refusé
  assert.equal((await api('POST', '/contact', contact({ sel: d.sel, expire: d.expire + 9999, signature: d.signature, nonce: await trouverNonce(d.sel, 10) }))).statut, 400);
});

test('défi résolu : accepté une fois, refusé au rejeu', async () => {
  const defi = await defiResolu();
  assert.equal((await api('POST', '/contact', contact(defi))).statut, 201);
  const rejeu = await api('POST', '/contact', contact(defi));
  assert.equal(rejeu.statut, 400);
  assert.match(rejeu.erreur, /anti-robot/);
});

test('les autres formulaires publics et la connexion exigent aussi le défi ; les lectures non', async () => {
  for (const [chemin, corps] of [['/inscription', {}], ['/connexion', { telephone: '0712345678', pays: 'CI', pin: '1234' }], ['/public/commande', {}], ['/public/chat', {}], ['/admin/connexion', {}]]) {
    const r = await api('POST', chemin, corps);
    assert.equal(r.statut, 400, chemin);
    assert.match(r.erreur, /anti-robot/, chemin);
  }
  assert.equal((await api('GET', '/sante')).ok, true);
  assert.equal((await api('GET', '/tarifs')).ok, true);
});
