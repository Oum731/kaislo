// Paiement par virement bancaire : comptes de l'équipe, montants en euros, référence. Lancer : npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 6860 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-virement-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, gerant, admin;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Awa Virement', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712346051' },
    gerant: { nom: 'Awa', telephone: '0712346052', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  admin = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.ok(admin.jeton, JSON.stringify(admin));
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

const COMPTE_EUR = { devise: 'EUR', beneficiaire: 'Amorac SARL', banque: 'Banque Exemple', iban: 'FR76 3000 6000 0112 3456 7890 189', bic: 'agrifrpp', note: '' };

test('sans compte enregistré : liste vide, mais la référence est donnée', async () => {
  const r = await api('GET', '/paiement-virement', null, gerant.jeton);
  assert.deepEqual(r.comptes, []);
  assert.match(r.reference, /^KAISLO-\d{6}$/);
  assert.equal((await api('GET', '/paiement-virement')).statut, 401);
});

test('l\'équipe enregistre un compte : IBAN nettoyé, contrôles, réservé à l\'administrateur', async () => {
  assert.equal((await api('POST', '/admin/virement', { comptes: [COMPTE_EUR] })).statut, 401);
  assert.equal((await api('POST', '/admin/virement', { comptes: [{ ...COMPTE_EUR, iban: 'abc' }] }, admin.jeton)).statut, 400);
  assert.equal((await api('POST', '/admin/virement', { comptes: [{ ...COMPTE_EUR, devise: 'XYZ' }] }, admin.jeton)).statut, 400);
  assert.equal((await api('POST', '/admin/virement', { comptes: [{ ...COMPTE_EUR, bic: 'zz' }] }, admin.jeton)).statut, 400);
  const ok = await api('POST', '/admin/virement', { comptes: [COMPTE_EUR] }, admin.jeton);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal(ok.comptes[0].iban, 'FR7630006000011234567890189');
  assert.equal(ok.comptes[0].bic, 'AGRIFRPP');
  assert.equal((await api('GET', '/admin/virement', null, admin.jeton)).comptes.length, 1);
});

test('le gérant voit le compte en euros avec le montant de la grille (épicerie : 14 € par mois, catalogue ÷ 0,9 = 16 €)', async () => {
  const r = await api('GET', '/paiement-virement', null, gerant.jeton);
  assert.equal(r.comptes.length, 1);
  assert.equal(r.comptes[0].devise, 'EUR');
  assert.equal(r.comptes[0].iban, 'FR7630006000011234567890189');
  // Nouveau client sans code parrain : prix catalogue (14 / (1 − 10 %) arrondi au pas supérieur = 16)
  assert.equal(r.comptes[0].parMois, 16);
  assert.equal(r.comptes[0].annuel, 160); // 12 mois pour le prix de 10
});

test('l\'équivalent en euros accompagne le tarif du commerce en francs CFA', async () => {
  const d = await api('GET', '/donnees?depuis=', null, gerant.jeton);
  assert.equal(d.tarif.devise, 'FCFA');
  assert.deepEqual(d.tarif.euro, { parMois: 16, annuel: 160 });
});
