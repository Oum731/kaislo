// Restauration et règles locales : confirmation obligatoire dans les pays concernés (Belgique, France, Canada). Lancer : npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reglementRestauration, TYPES_RESTAURATION } from '../src/lib/donnees/restauration.js';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-resto-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, compteur = 0;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const inscrire = (pays, type, extra = {}) => {
  const n = String(++compteur).padStart(2, '0');
  const tel = { BE: '0470', FR: '0612', CI: '0712', CA: '5145' };
  return api('POST', '/inscription', {
    commerce: { nom: 'Commerce ' + n, type, pays, ville: 'Ville', quartier: 'Centre', telephone: (tel[pays] || '0712') + '3456' + n },
    gerant: { nom: 'Gérant ' + n, telephone: (tel[pays] || '0712') + '3457' + n, pin: '1234' }, conditionsAcceptees: true, ...extra,
  });
};

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('règle par pays et par type de commerce (même règle côté site)', () => {
  assert.deepEqual(TYPES_RESTAURATION, ['restaurant', 'maquis', 'bar']);
  for (const p of ['BE', 'FR', 'CA']) for (const t of TYPES_RESTAURATION) assert.equal(reglementRestauration(p, t), 'avis', p + ' ' + t);
  assert.equal(reglementRestauration('CI', 'restaurant'), '');
  assert.equal(reglementRestauration('BE', 'epicerie'), '', 'une épicerie belge n’est pas concernée');
  assert.equal(reglementRestauration('XX', 'bar'), '');
});

test('restaurant en Belgique : refusé sans la confirmation, accepté avec, date gardée', async () => {
  const sans = await inscrire('BE', 'restaurant');
  assert.equal(sans.statut, 400);
  assert.match(sans.erreur, /outil de gestion/);
  assert.equal((await inscrire('BE', 'restaurant', { avisRestauration: false })).statut, 400);
  assert.equal((await inscrire('BE', 'restaurant', { avisRestauration: 'oui' })).statut, 400, 'seul « true » vaut confirmation');
  const avec = await inscrire('BE', 'restaurant', { avisRestauration: true });
  assert.equal(avec.statut, 201, JSON.stringify(avec));
  const l = sql("SELECT type, pays, avis_restauration_le FROM commerces WHERE type = 'restaurant' AND pays = 'BE'");
  assert.equal(l.length, 1);
  assert.match(l[0].avis_restauration_le, /^\d{4}-\d\d-\d\dT/);
});

test('bar en France et maquis au Canada : même règle ; hors restauration ou autre pays : rien de plus', async () => {
  assert.equal((await inscrire('FR', 'bar')).statut, 400);
  assert.equal((await inscrire('FR', 'bar', { avisRestauration: true })).statut, 201);
  assert.equal((await inscrire('CA', 'maquis')).statut, 400);
  assert.equal((await inscrire('BE', 'epicerie')).statut, 201, 'une épicerie belge s’inscrit comme avant');
  const ci = await inscrire('CI', 'restaurant');
  assert.equal(ci.statut, 201, 'Côte d’Ivoire : pas de confirmation demandée');
  assert.equal(sql("SELECT avis_restauration_le FROM commerces WHERE pays = 'CI'")[0].avis_restauration_le, null);
});

test('ajout d’un commerce par un gérant : la confirmation est aussi demandée', async () => {
  const g = await inscrire('BE', 'epicerie');
  assert.equal(g.statut, 201, JSON.stringify(g));
  const corps = (extra = {}) => ({ commerce: { nom: 'Mon café', type: 'bar', ville: 'Bruxelles', quartier: 'Ixelles' }, pin: '1234', conditionsAcceptees: true, ...extra });
  const sans = await api('POST', '/ajouter-commerce', corps(), g.jeton);
  assert.equal(sans.statut, 400, JSON.stringify(sans));
  assert.match(sans.erreur, /outil de gestion/);
  const avec = await api('POST', '/ajouter-commerce', corps({ avisRestauration: true }), g.jeton);
  assert.equal(avec.statut, 201, JSON.stringify(avec));
  assert.ok(sql("SELECT avis_restauration_le FROM commerces WHERE nom = 'Mon café'")[0].avis_restauration_le);
});
