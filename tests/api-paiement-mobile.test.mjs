// Paiement mobile (Orange Money…) : numéros de l'équipe visibles par les gérants des commerces dans la même devise, avec le prix dans leur devise.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-mobile-'));
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, support, ivoire, maroc;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const inscrire = (nom, tel, pays, ville) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays, ville, quartier: 'Centre', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});
const ORANGE = { operateur: 'Orange Money', numero: '+225 07 00 00 00 01', titulaire: 'Amorac', devises: ['FCFA'], note: 'Envoyez depuis votre compte Orange Money' };

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  ivoire = await inscrire('Chez Awa Mobile', '0712346101', 'CI', 'Abidjan');
  maroc = await inscrire('Épicerie Bako Mobile', '0612346111', 'MA', 'Casablanca');
  assert.equal(ivoire.statut, 201, JSON.stringify(ivoire));
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  admin = install.jeton;
  assert.equal((await api('POST', '/admin/equipe', { nom: 'Aide', email: 'aide@kaislo.test', role: 'support', motDePasse: 'MotDePasse2026' }, admin)).ok, true);
  support = (await api('POST', '/admin/connexion', { email: 'aide@kaislo.test', motDePasse: 'MotDePasse2026' })).jeton;
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('par défaut : Orange Money et le lien Wave pour les commerces en FCFA, avec leur prix en FCFA ; rien pour un commerce en dirhams', async () => {
  const r = await api('GET', '/paiement-virement', null, ivoire.jeton);
  assert.deepEqual(r.mobiles.map((m) => m.operateur), ['Orange Money', 'Wave']);
  const [orange, wave] = r.mobiles;
  assert.equal(orange.numero, '+2250779872585');
  assert.deepEqual(orange.liens, []);
  assert.equal(orange.devise, 'FCFA');
  assert.ok(orange.parMois > 0 && orange.annuel > orange.parMois);
  // Wave : le montant de la formule du commerce est ajouté au lien (1 mois et 12 mois)
  assert.equal(wave.titulaire, 'Traoreservice');
  assert.equal(wave.liens.length, 2);
  assert.deepEqual(wave.liens.map((l) => l.mois), [1, 12]);
  assert.equal(wave.liens[0].url, `https://pay.wave.com/m/M_ci_9JyOKoTX4xvQ/c/ci/?amount=${wave.parMois}`);
  assert.equal(wave.liens[1].url, `https://pay.wave.com/m/M_ci_9JyOKoTX4xvQ/c/ci/?amount=${wave.annuel}`);
  assert.equal(wave.liens[0].montant, wave.parMois);
  assert.equal(wave.lien, undefined); // le gérant reçoit les liens calculés, pas le modèle
  assert.match(r.reference, /^KAISLO-\d{6}$/);
  assert.deepEqual((await api('GET', '/paiement-virement', null, maroc.jeton)).mobiles, []);
});

test('l’équipe enregistre ses numéros : contrôles et droits', async () => {
  assert.equal((await api('GET', '/admin/paiements-mobiles')).statut, 401);
  assert.equal((await api('GET', '/admin/paiements-mobiles', null, support)).ok, true);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [ORANGE] }, support)).statut, 403);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...ORANGE, operateur: 'Inconnu' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...ORANGE, numero: '12' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...ORANGE, devises: [] }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: Array(9).fill(ORANGE) }, admin)).statut, 400);
  // Lien : Wave seulement, en https, sans identifiants ; un numéro ou un lien au moins
  const wave = { operateur: 'Wave', numero: '', lien: 'https://pay.wave.com/m/M_ci_test/c/ci/', devises: ['FCFA'] };
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'http://pay.wave.com/m/x' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'https://exemple.com/pay' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'https://pay.wave.com.evil.com/x' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'https://user@pay.wave.com/x' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: '' }] }, admin)).statut, 400);
  const ok = await api('POST', '/admin/paiements-mobiles', { moyens: [ORANGE, { operateur: 'Wave', numero: '0700000002', devises: ['FCFA', 'GNF'] }] }, admin);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal(ok.moyens[0].numero, '+2250700000001'); // espaces retirés
  assert.deepEqual(ok.moyens[1].devises, ['FCFA', 'GNF']);
});

test('le gérant voit les numéros enregistrés (pas ceux d’une autre devise) ; liste vide = plus aucun numéro', async () => {
  const r = await api('GET', '/paiement-virement', null, ivoire.jeton);
  assert.deepEqual(r.mobiles.map((m) => m.operateur), ['Orange Money', 'Wave']);
  assert.equal(r.mobiles[0].titulaire, 'Amorac');
  assert.equal(r.mobiles[0].note, 'Envoyez depuis votre compte Orange Money');
  await api('POST', '/admin/paiements-mobiles', { moyens: [{ operateur: 'Wave', numero: '+221700000003', devises: ['GNF'] }] }, admin);
  assert.deepEqual((await api('GET', '/paiement-virement', null, ivoire.jeton)).mobiles, []);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [] }, admin)).ok, true);
  assert.deepEqual((await api('GET', '/admin/paiements-mobiles', null, admin)).moyens, []); // vide enregistré : le numéro par défaut ne revient pas
});

test('un lien avec {montant} et un lien avec paramètres reçoivent le montant au bon endroit', async () => {
  await api('POST', '/admin/paiements-mobiles', { moyens: [
    { operateur: 'Wave', lien: 'https://pay.wave.com/m/M_ci_test/c/ci/?amount={montant}&ref=kaislo', devises: ['FCFA'] },
    { operateur: 'Wave', lien: 'https://pay.wave.com/m/M_ci_autre/c/ci/?lang=fr', devises: ['FCFA'] },
  ] }, admin);
  const [a, b] = (await api('GET', '/paiement-virement', null, ivoire.jeton)).mobiles;
  assert.equal(a.liens[0].url, `https://pay.wave.com/m/M_ci_test/c/ci/?amount=${a.parMois}&ref=kaislo`);
  assert.equal(b.liens[0].url, `https://pay.wave.com/m/M_ci_autre/c/ci/?lang=fr&amount=${b.parMois}`);
  assert.equal(a.numero, '');
});
