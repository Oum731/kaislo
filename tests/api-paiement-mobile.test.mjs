// Paiement mobile (Orange Money, Wave…) : numéros, codes QR et liens de l'équipe, visibles par les gérants des commerces des pays choisis (les autres ne voient que le virement), avec le prix dans leur devise.
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
let serveur, admin, support, ivoire, maroc, congo;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const inscrire = (nom, tel, pays, ville) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays, ville, quartier: 'Centre', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});
const ORANGE = { operateur: 'Orange Money', pays: ['CI'], numero: '+225 07 00 00 00 01', titulaire: 'Amorac', note: 'Envoyez depuis votre compte Orange Money' };

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  ivoire = await inscrire('Chez Awa Mobile', '0712346101', 'CI', 'Abidjan');
  maroc = await inscrire('Épicerie Bako Mobile', '0612346111', 'MA', 'Casablanca');
  congo = await inscrire('Boutique Congo Mobile', '061234611', 'CG', 'Brazzaville');
  assert.equal(congo.statut, 201, JSON.stringify(congo));
  assert.equal(ivoire.statut, 201, JSON.stringify(ivoire));
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  admin = install.jeton;
  assert.equal((await api('POST', '/admin/equipe', { nom: 'Aide', email: 'aide@kaislo.test', role: 'support', motDePasse: 'MotDePasse2026' }, admin)).ok, true);
  support = (await api('POST', '/admin/connexion', { email: 'aide@kaislo.test', motDePasse: 'MotDePasse2026' })).jeton;
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('par défaut : Orange Money, Wave et MTN MoMo pour la Côte d’Ivoire, avec le prix en FCFA ; Maroc et Congo ne voient que le virement', async () => {
  const r = await api('GET', '/paiement-virement', null, ivoire.jeton);
  assert.deepEqual(r.mobiles.map((m) => m.operateur), ['Orange Money', 'Wave', 'MTN MoMo']);
  const [orange, wave, mtn] = r.mobiles;
  assert.equal(mtn.numero, '+2250507131267');
  assert.equal(mtn.qr, '/paiement/mtn-momo.png');
  assert.deepEqual(mtn.liens, []);
  assert.equal(orange.numero, '+2250779872585');
  assert.equal(orange.qr, '/paiement/orange-money.png');
  assert.equal(orange.devise, 'FCFA');
  assert.ok(orange.parMois > 0 && orange.annuel > orange.parMois);
  // Wave : le lien reçoit le montant de la formule (1 mois, 12 mois) : l'application en tire un code QR qui remplit le montant au scan ; le code fixe reste en secours
  assert.equal(wave.titulaire, 'Traoreservice');
  assert.equal(wave.qr, '/paiement/wave.png');
  assert.deepEqual(wave.liens.map((l) => l.mois), [1, 12]);
  assert.equal(wave.liens[0].url, `https://pay.wave.com/m/M_ci_9JyOKoTX4xvQ/c/ci/?amount=${wave.parMois}`);
  assert.equal(wave.liens[1].url, `https://pay.wave.com/m/M_ci_9JyOKoTX4xvQ/c/ci/?amount=${wave.annuel}`);
  assert.equal(wave.lien, undefined); // le gérant reçoit les liens calculés, pas le modèle
  assert.match(r.reference, /^KAISLO-\d{6}$/);
  // Pays où ces moyens n'existent pas : aucun moyen mobile (le virement reste affiché par l'application)
  assert.deepEqual((await api('GET', '/paiement-virement', null, maroc.jeton)).mobiles, []);
  assert.deepEqual((await api('GET', '/paiement-virement', null, congo.jeton)).mobiles, []);
});

test('les images des codes QR par défaut sont rangées dans le site (public/paiement/)', () => {
  for (const nom of ['wave.png', 'orange-money.png', 'mtn-momo.png']) {
    const png = fs.readFileSync('public/paiement/' + nom);
    assert.equal(png.subarray(1, 4).toString(), 'PNG', nom);
    assert.ok(png.length > 5000 && png.length < 200000, nom);
  }
});

test('l’équipe enregistre ses moyens : contrôles et droits', async () => {
  assert.equal((await api('GET', '/admin/paiements-mobiles')).statut, 401);
  assert.equal((await api('GET', '/admin/paiements-mobiles', null, support)).ok, true);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [ORANGE] }, support)).statut, 403);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...ORANGE, operateur: 'Inconnu' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...ORANGE, numero: '12' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...ORANGE, pays: [] }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...ORANGE, pays: ['ZZ'] }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: Array(9).fill(ORANGE) }, admin)).statut, 400);
  // Code QR : un nom de fichier seulement (pas de chemin ni d'adresse)
  const qr = { operateur: 'Wave', pays: ['CI'], numero: '', qr: 'wave.png' };
  for (const mauvais of ['../wave.png', 'http://exemple.com/x.png', 'wave.svg', 'a/b.png', '.png', 'WAVE.png']) {
    assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...qr, qr: mauvais }] }, admin)).statut, 400, mauvais);
  }
  // Lien : Wave seulement, en https, sans identifiants ; un numéro, un code QR ou un lien au moins
  const wave = { operateur: 'Wave', pays: ['CI'], numero: '', lien: 'https://pay.wave.com/m/M_ci_test/c/ci/' };
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'http://pay.wave.com/m/x' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'https://exemple.com/pay' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'https://pay.wave.com.evil.com/x' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: 'https://user@pay.wave.com/x' }] }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [{ ...wave, lien: '' }] }, admin)).statut, 400); // ni numéro, ni QR, ni lien
  const ok = await api('POST', '/admin/paiements-mobiles', { moyens: [ORANGE, { operateur: 'MTN MoMo', pays: ['CG'], numero: '06 600 00 00' }, { ...qr, pays: ['CI', 'SN'] }] }, admin);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal(ok.moyens[0].numero, '+2250700000001'); // espaces retirés
  assert.deepEqual(ok.moyens[2].pays, ['CI', 'SN']);
});

test('chaque pays voit ses moyens : Côte d’Ivoire Orange et Wave, Congo MTN ; le Maroc, aucun', async () => {
  assert.deepEqual((await api('GET', '/paiement-virement', null, ivoire.jeton)).mobiles.map((m) => m.operateur), ['Orange Money', 'Wave']);
  const c = await api('GET', '/paiement-virement', null, congo.jeton);
  assert.deepEqual(c.mobiles.map((m) => m.operateur), ['MTN MoMo']);
  assert.equal(c.mobiles[0].devise, 'FCFA');
  assert.equal(c.mobiles[0].numero, '066000000');
  assert.deepEqual((await api('GET', '/paiement-virement', null, maroc.jeton)).mobiles, []);
});

test('un lien Wave reçoit le montant de la formule du commerce (au bon endroit) ; facultatif, à côté du code QR', async () => {
  await api('POST', '/admin/paiements-mobiles', { moyens: [
    { operateur: 'Wave', pays: ['CI'], qr: 'wave.png', lien: 'https://pay.wave.com/m/M_ci_test/c/ci/?amount={montant}&ref=kaislo' },
    { operateur: 'Wave', pays: ['CI'], lien: 'https://pay.wave.com/m/M_ci_autre/c/ci/?lang=fr' },
  ] }, admin);
  const [a, b] = (await api('GET', '/paiement-virement', null, ivoire.jeton)).mobiles;
  assert.equal(a.qr, '/paiement/wave.png');
  assert.deepEqual(a.liens.map((l) => l.mois), [1, 12]);
  assert.equal(a.liens[0].url, `https://pay.wave.com/m/M_ci_test/c/ci/?amount=${a.parMois}&ref=kaislo`);
  assert.equal(b.liens[0].url, `https://pay.wave.com/m/M_ci_autre/c/ci/?lang=fr&amount=${b.parMois}`);
  assert.equal(b.qr, '');
});

test('liste vide enregistrée = plus aucun moyen mobile (le numéro par défaut ne revient pas)', async () => {
  assert.equal((await api('POST', '/admin/paiements-mobiles', { moyens: [] }, admin)).ok, true);
  assert.deepEqual((await api('GET', '/admin/paiements-mobiles', null, admin)).moyens, []);
  assert.deepEqual((await api('GET', '/paiement-virement', null, ivoire.jeton)).mobiles, []);
});
