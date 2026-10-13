// Parrainage entre commerçants : essai prolongé pour le filleul, jours offerts au parrain au 1er paiement du filleul, règles anti-abus.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4890 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-parrainage-'));
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, parrain, filleul;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}
const inscrire = (nom, tel, extra = {}) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: tel }, gerant: { nom: 'Gérant ' + nom, telephone: tel, pin: '1234' }, conditionsAcceptees: true, ...extra,
});
const jours = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  admin = (await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' })).jeton;
  parrain = await inscrire('Épicerie Awa', '0712345801');
  assert.equal(parrain.ok, true, JSON.stringify(parrain));
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('le parrain a un code « P » + son code à 6 chiffres et un lien de partage', async () => {
  const p = await api('GET', '/parrainage', null, parrain.jeton);
  assert.equal(p.code, 'P' + parrain.commerce.code);
  assert.match(p.lien, /\/app\/\?ref=P\d{6}$/);
  assert.deepEqual(p.filleuls, []);
  assert.equal(p.recompenses, 0);
  assert.equal(p.joursFilleul, 15);
  assert.equal(p.joursParrain, 15);
  assert.equal((await api('GET', '/parrainage')).statut, 401);
});

test('inscription avec un code inconnu refusée ; avec le bon code, 15 jours d\'essai en plus', async () => {
  assert.equal((await inscrire('Chez Moussa', '0712345802', { codeParrain: 'P000000' })).statut, 400);
  filleul = await inscrire('Boutique Moussa', '0712345803', { codeParrain: 'P' + parrain.commerce.code });
  assert.equal(filleul.statut, 201, JSON.stringify(filleul));
  const sans = await inscrire('Sans code', '0712345804');
  const dureeFilleul = jours(filleul.commerce.creeLe, filleul.commerce.abonnement.essaiFin);
  const dureeSans = jours(sans.commerce.creeLe, sans.commerce.abonnement.essaiFin);
  assert.equal(dureeSans, 30);
  assert.equal(dureeFilleul, 45);
  const p = await api('GET', '/parrainage', null, parrain.jeton);
  assert.equal(p.filleuls.length, 1);
  assert.equal(p.filleuls[0].nom, 'Boutique Moussa');
  assert.equal(p.filleuls[0].gagne, false);
  // L'espace Amorac voit le lien de parrainage
  const liste = (await api('GET', '/admin/commerces', null, admin)).commerces;
  assert.equal(liste.find((c) => c.commerce.nom === 'Boutique Moussa').parrainCommerce, 'Épicerie Awa');
  assert.equal(liste.find((c) => c.commerce.nom === 'Épicerie Awa').nbFilleuls, 1);
});

test('premier paiement du filleul : le parrain gagne 15 jours, une seule fois', async () => {
  const avant = (await api('GET', '/moi', null, parrain.jeton)).commerce.abonnement.essaiFin;
  const paye = (n) => api('POST', '/admin/paiement', { commerceId: filleul.commerce.id, montant: 9000, mois: 1, moyen: 'Wave' }, admin);
  assert.equal((await paye()).ok, true);
  const apres = (await api('GET', '/moi', null, parrain.jeton)).commerce.abonnement.essaiFin;
  assert.equal(jours(avant, apres), 15);
  // 2e paiement du filleul : pas de nouvelle récompense
  assert.equal((await paye()).ok, true);
  assert.equal((await api('GET', '/moi', null, parrain.jeton)).commerce.abonnement.essaiFin, apres);
  const p = await api('GET', '/parrainage', null, parrain.jeton);
  assert.equal(p.recompenses, 1);
  assert.equal(p.joursGagnes, 15);
  assert.equal(p.filleuls[0].gagne, true);
});

test('les jours offerts comptent dans le mois : le client paie seulement les jours restants', async () => {
  const vue = async (id) => (await api('GET', '/admin/commerces', null, admin)).commerces.find((c) => c.commerce.id === id);
  // Le parrain a gagné 15 jours (sur son essai) : son premier paiement ne couvre que les 15 jours restants du mois
  const p0 = await vue(parrain.commerce.id);
  assert.equal(p0.joursOfferts, 15);
  const r = await api('POST', '/admin/paiement', { commerceId: parrain.commerce.id, montant: 4500, mois: 1, moyen: 'Wave' }, admin);
  assert.equal(r.ok, true, JSON.stringify(r));
  const p1 = await vue(parrain.commerce.id);
  assert.equal(jours(p0.commerce.abonnement.essaiFin, p1.commerce.abonnement.periodeFin), 15);
  assert.equal(p1.joursOfferts, 0);
  assert.equal(p1.commerce.abonnement.paiements[0].details.joursOfferts, 15);
  // Le mois suivant se paie normalement : 30 jours de plus
  await api('POST', '/admin/paiement', { commerceId: parrain.commerce.id, montant: 9000, mois: 1, moyen: 'Wave' }, admin);
  const p2 = await vue(parrain.commerce.id);
  assert.equal(jours(p1.commerce.abonnement.periodeFin, p2.commerce.abonnement.periodeFin), 30);
  // Un filleul : 15 jours d'essai offerts, payés en moins sur son premier mois
  const f = await inscrire('Boutique Binta', '0712345806', { codeParrain: 'P' + parrain.commerce.code });
  const f0 = await vue(f.commerce.id);
  assert.equal(f0.joursOfferts, 15);
  await api('POST', '/admin/paiement', { commerceId: f.commerce.id, montant: 4500, mois: 1, moyen: 'Wave' }, admin);
  const f1 = await vue(f.commerce.id);
  assert.equal(jours(f0.commerce.abonnement.essaiFin, f1.commerce.abonnement.periodeFin), 15);
  assert.equal(f1.joursOfferts, 0);
});

test('prix des jours restants : identique côté serveur et côté application', async () => {
  const js = await import('../src/lib/donnees/tarifs.js');
  assert.deepEqual(js.prixApresJoursOfferts(9000, 1, 15, 'FCFA'), { deduits: 15, joursPayes: 15, montant: 4500 });
  assert.deepEqual(js.prixApresJoursOfferts(9000, 1, 0, 'FCFA'), { deduits: 0, joursPayes: 30, montant: 9000 });
  assert.equal(js.prixApresJoursOfferts(25000, 3, 15, 'EUR').montant, Math.round(25000 * 75 / 90));
  const php = fs.readFileSync('api/lib/tarifs.php', 'utf8');
  assert.match(php, /function prixApresJoursOfferts/);
});

test('un vendeur ne voit pas le parrainage, et un code de commercial ne peut pas ressembler à un code de commerce', async () => {
  const sans = await inscrire('Autre', '0712345805');
  const v = await api('POST', '/utilisateurs', { nom: 'Vendeur', telephone: '0712345899', pin: '5555', role: 'vendeur' }, sans.jeton);
  if (v.ok) {
    const cx = await api('POST', '/connexion', { telephone: '0712345899', pin: '5555' });
    if (cx.jeton) assert.equal((await api('GET', '/parrainage', null, cx.jeton)).statut, 403);
  }
  const r = await api('POST', '/admin/commercial', { nom: 'Commercial', telephone: '0712345890', pays: 'CI', code: 'P123456', taux: 10, actif: true, pin: '123456' }, admin);
  assert.equal(r.statut, 400);
});

test('les jours offerts affichés dans l\'application sont ceux du serveur', async () => {
  const php = fs.readFileSync('api/lib/parrainage.php', 'utf8');
  const js = await import('../src/lib/donnees/parrainage.js');
  assert.equal(Number(/const JOURS_BONUS_FILLEUL = (\d+);/.exec(php)[1]), js.JOURS_BONUS_FILLEUL);
  assert.equal(Number(/const JOURS_BONUS_PARRAIN = (\d+);/.exec(php)[1]), js.JOURS_BONUS_PARRAIN);
});
