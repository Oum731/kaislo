// Saisie sécurisée côté serveur : majuscules et minuscules des noms, villes, numéros visiblement faux ou qui n'existent pas dans le pays.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-saisie-'));
let serveur;
async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const inscrire = (commerce, gerant) => api('POST', '/inscription', { commerce: { type: 'epicerie', pays: 'MA', ville: 'Casablanca', quartier: 'Maarif', ...commerce }, gerant: { pin: '1234', ...gerant }, conditionsAcceptees: true });

before(async () => {
  const env = path.join(dossier, '.env');
  fs.writeFileSync(env, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\nDefi=non\nNotificationsMode=test\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: env }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await api('GET', '/sante')).ok) break; } catch { /* démarrage */ } await new Promise((r) => setTimeout(r, 100)); }
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('numéros inventés ou impossibles refusés à l’inscription', async () => {
  for (const faux of ['0600000000', '0611111122', '0612345678', '0666666666', '0661616161', '0412345679', '0861482735']) {
    const r = await inscrire({ nom: 'Test', telephone: faux }, { nom: 'Hassan', telephone: '0661482735' });
    assert.equal(r.statut, 400, faux + ' : ' + JSON.stringify(r));
  }
  const r = await inscrire({ nom: 'Test', telephone: '0661482735' }, { nom: 'Hassan', telephone: '0600000000' });
  assert.equal(r.statut, 400);
  assert.match(r.erreur, /ne semble pas réel|opérateur|incomplet/);
});

test('majuscules et minuscules corrigées : noms de personnes, commerce, ville, quartier', async () => {
  const r = await inscrire({ nom: 'épicerie AL BARAKA', ville: 'CASABLANCA', quartier: 'maarif extension', telephone: '0661482735' }, { nom: 'hASSAN   ben ali', telephone: '0672581493' });
  assert.equal(r.statut, 201, JSON.stringify(r));
  assert.equal(r.utilisateur.nom, 'Hassan Ben Ali');
  const c = await api('GET', '/commerce', null, r.jeton);
  const commerce = c.commerce || r.commerce;
  assert.equal(commerce.nom, 'Épicerie Al Baraka');
  assert.equal(commerce.ville, 'Casablanca');
  assert.equal(commerce.quartier, 'Maarif Extension');
});

test('un nom sans lettres est refusé ; un nom de commerce déjà soigné reste tel quel', async () => {
  assert.equal((await inscrire({ nom: 'Test', telephone: '0661482735' }, { nom: '12345', telephone: '0672581493' })).statut, 400);
  const r = await inscrire({ nom: 'iPhone Store', telephone: '0655234187' }, { nom: 'Salma', telephone: '0698147253' });
  assert.equal(r.statut, 201, JSON.stringify(r));
  assert.equal((r.commerce || (await api('GET', '/commerce', null, r.jeton)).commerce).nom, 'iPhone Store');
});
