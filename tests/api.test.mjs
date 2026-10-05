// Tests de l'API PHP avec une vraie base (SQLite) et le serveur intégré de PHP : droits des vendeurs,
// contrôle des ventes, annulation avec le code du gérant, abonnement expiré.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { creerLigne } from '../src/lib/donnees/vente.js';
import { creerDonneesDemo } from '../src/lib/donnees/demo.js';

const PORT = 4390 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-api-'));
const fichierBase = path.join(dossier, 'test.sqlite');
const fichierEnv = path.join(dossier, '.env');
let serveur;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}

const maintenant = () => new Date().toISOString();
const sql = (requete) => execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); $p->exec(${JSON.stringify(requete)});`]);
const lire = (requete) => Number(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo $p->query(${JSON.stringify(requete)})->fetchColumn();`]).toString());
const envoyer = (jeton, elements) => api('POST', '/donnees', { elements }, jeton);
const element = (type, id, contenu) => ({ type, id, contenu, modifieLe: maintenant() });

function uneVente(id, vendeurId, { quantite = 2, remise = 0 } = {}) {
  const produit = { id: 'p1', nom: 'Huile', prix: 2500, promo: null, prixAchat: 0, groupes: [] };
  const l = creerLigne(produit, {}, quantite, 'FCFA');
  return {
    id, numero: 1, date: maintenant(), vendeurId, vendeurNom: 'Awa', paiement: 'Espèces', recu: 0, clientId: null, clientNom: null,
    lignes: [l], sousTotal: l.total, remise, total: l.total - remise,
  };
}

let gerant, vendeur, idVendeur, idGerant;

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const ins = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Test', type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: '0712345601' },
    gerant: { nom: 'Gérant Test', telephone: '0712345602', pin: '1234' },
    conditionsAcceptees: true,
  });
  assert.equal(ins.ok, true, JSON.stringify(ins));
  gerant = ins.jeton;
  idGerant = ins.utilisateur.id;
  const cree = await api('POST', '/utilisateurs', { nom: 'Awa', telephone: '0712345603', pin: '5678', actif: true }, gerant);
  assert.equal(cree.ok, true, JSON.stringify(cree));
  idVendeur = cree.id;
  const conn = await api('POST', '/connexion', { telephone: '0712345603', pays: 'CI', pin: '5678' });
  assert.equal(conn.ok, true, JSON.stringify(conn));
  vendeur = conn.jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('santé : l’API et la base répondent', async () => {
  const r = await api('GET', '/sante');
  assert.equal(r.ok, true);
});

test('un vendeur enregistre une vente à son nom', async () => {
  const r = await envoyer(vendeur, [element('ventes', 'v1', uneVente('v1', idVendeur))]);
  assert.deepEqual(r.refuses, []);
  assert.deepEqual(r.acceptes, ['ventes:v1']);
});

test('une vente au nom d’un autre vendeur est refusée', async () => {
  const r = await envoyer(vendeur, [element('ventes', 'v2', uneVente('v2', idGerant))]);
  assert.match(r.refuses[0].raison, /autre vendeur/);
});

test('lignes manquantes ou montants négatifs : vente refusée', async () => {
  const sansLigne = { ...uneVente('v3', idVendeur), lignes: [] };
  const negative = uneVente('v4', idVendeur);
  negative.lignes[0].total = -500;
  const r = await envoyer(vendeur, [element('ventes', 'v3', sansLigne), element('ventes', 'v4', negative)]);
  assert.equal(r.refuses.length, 2);
  assert.match(r.refuses[0].raison, /invalide/);
});

test('un vendeur ne peut pas modifier le montant d’une vente enregistrée', async () => {
  const triche = uneVente('v1', idVendeur);
  triche.total = 100;
  const r = await envoyer(vendeur, [element('ventes', 'v1', triche)]);
  assert.match(r.refuses[0].raison, /ne peut pas être modifiée/);
});

test('renvoyer la même vente ne change rien et n’est pas refusé', async () => {
  const lu = await api('GET', '/donnees', null, vendeur);
  const v1 = lu.elements.find((e) => e.id === 'v1').contenu;
  const r = await envoyer(vendeur, [element('ventes', 'v1', v1)]);
  assert.deepEqual(r.refuses, []);
});

test('la demande d’impression sur une vente reste possible pour un vendeur (postes)', async () => {
  const lu = await api('GET', '/donnees', null, vendeur);
  const v1 = lu.elements.find((e) => e.id === 'v1').contenu;
  const r = await envoyer(vendeur, [element('ventes', 'v1', { ...v1, impressionDemandee: maintenant() })]);
  assert.deepEqual(r.refuses, []);
});

test('annuler une vente : refusé sans le code du gérant, accepté après', async () => {
  const lu = await api('GET', '/donnees', null, vendeur);
  const v1 = lu.elements.find((e) => e.id === 'v1').contenu;
  const annulee = { ...v1, annulee: { date: maintenant(), par: 'Gérant Test', motif: 'erreur' } };

  const sans = await envoyer(vendeur, [element('ventes', 'v1', annulee)]);
  assert.match(sans.refuses[0].raison, /code du gérant/);

  const faux = await api('POST', '/verifier-gerant', { pin: '0000' }, vendeur);
  assert.equal(faux.ok, false);
  assert.match((await envoyer(vendeur, [element('ventes', 'v1', annulee)])).refuses[0].raison, /code du gérant/);

  const bon = await api('POST', '/verifier-gerant', { pin: '1234' }, vendeur);
  assert.equal(bon.ok, true);
  const avec = await envoyer(vendeur, [element('ventes', 'v1', annulee)]);
  assert.deepEqual(avec.refuses, []);

  // Déjà annulée : plus de changement possible
  const encore = await envoyer(vendeur, [element('ventes', 'v1', { ...annulee, annulee: { ...annulee.annulee, motif: 'autre' } })]);
  assert.match(encore.refuses[0].raison, /déjà annulée/);
});

test('un vendeur ne peut pas toucher aux réglages ni supprimer une vente', async () => {
  const r1 = await envoyer(vendeur, [element('reglages', 'commerce', { nom: 'Piraté' })]);
  assert.match(r1.refuses[0].raison, /gérant/);
  const r2 = await envoyer(vendeur, [{ type: 'ventes', id: 'v1', supprime: true, modifieLe: maintenant() }]);
  assert.match(r2.refuses[0].raison, /gérant/);
});

test('les ventes de la démo (produites par l’application) sont toutes acceptées', async () => {
  const demo = creerDonneesDemo('resto-ivoire', 'CI');
  const ventes = demo.ventes.slice(0, 150).map((v) => ({ ...v, vendeurId: idGerant }));
  const r = await envoyer(gerant, ventes.map((v) => element('ventes', v.id, v)));
  assert.deepEqual(r.refuses, []);
  assert.equal(r.acceptes.length, ventes.length);
  // Les totaux calculés par l'application correspondent aux lignes : rien n'est signalé comme incohérent
  assert.equal(lire("SELECT COUNT(*) FROM journal WHERE action = 'vente-incoherente'"), 0);
});

test('un total qui ne correspond pas aux lignes est accepté mais signalé dans le journal', async () => {
  const louche = uneVente('vlouche', idGerant);
  louche.total = 10;
  const r = await envoyer(gerant, [element('ventes', 'vlouche', louche)]);
  assert.deepEqual(r.refuses, []);
  assert.equal(lire("SELECT COUNT(*) FROM journal WHERE action = 'vente-incoherente'"), 1);
});

test('abonnement : essai terminé depuis peu → encore accepté ; expiré depuis plus de 7 jours → lecture seule', async () => {
  const il_y_a = (jours) => new Date(Date.now() - jours * 86400000).toISOString().slice(0, 10);
  sql(`UPDATE commerces SET essai_fin = '${il_y_a(3)}'`);
  const grace = await envoyer(gerant, [element('clients', 'c1', { id: 'c1', nom: 'Client' })]);
  assert.deepEqual(grace.refuses, []);

  sql(`UPDATE commerces SET essai_fin = '${il_y_a(20)}'`);
  const expire = await envoyer(gerant, [element('clients', 'c2', { id: 'c2', nom: 'Client 2' })]);
  assert.equal(expire.ok, false);
  assert.equal(expire.statut, 403);
  assert.match(expire.erreur, /Abonnement expiré/);
  const lecture = await api('GET', '/donnees', null, gerant);
  assert.equal(lecture.ok, true); // on peut toujours lire ses données

  // L'équipe Amorac prolonge : l'écriture reprend
  sql(`UPDATE commerces SET essai_fin = '${il_y_a(-10)}'`);
  const repris = await envoyer(gerant, [element('clients', 'c2', { id: 'c2', nom: 'Client 2' })]);
  assert.deepEqual(repris.refuses, []);
});

test('pays du visiteur : en-tête du serveur reconnu, adresse locale sans résultat', async () => {
  const avec = await fetch(U + '/pays', { headers: { 'CF-IPCountry': 'ma' } }).then((r) => r.json());
  assert.deepEqual(avec, { ok: true, pays: 'MA' });
  const sans = await fetch(U + '/pays').then((r) => r.json()); // 127.0.0.1 : aucune recherche
  assert.deepEqual(sans, { ok: true, pays: null });
  const faux = await fetch(U + '/pays', { headers: { 'CF-IPCountry': 'XX' } }).then((r) => r.json());
  assert.equal(faux.pays, null);
});

test('commercial : inscription libre, code automatique, validation par l’équipe, remise du code parrain', async () => {
  // 1. Le commercial s'inscrit lui-même : compte en attente, code généré
  const ins = await api('POST', '/commercial/inscription', { nom: 'Awa Traoré', telephone: '0712340000', pays: 'CI', pin: '123456', conditionsAcceptees: true });
  assert.equal(ins.ok, true, JSON.stringify(ins));
  assert.match(ins.code, /^AWA\d{2,}$/);
  const sansAccord = await api('POST', '/commercial/inscription', { nom: 'Autre', telephone: '0712340001', pays: 'CI', pin: '123456' });
  assert.equal(sansAccord.ok, false);
  const doublon = await api('POST', '/commercial/inscription', { nom: 'Awa bis', telephone: '0712340000', pays: 'CI', pin: '654321', conditionsAcceptees: true });
  assert.equal(doublon.statut, 409);

  // 2. En attente : ni connexion, ni code parrain accepté
  const attente = await api('POST', '/commercial/connexion', { telephone: '0712340000', pays: 'CI', pin: '123456' });
  assert.equal(attente.statut, 403);
  assert.match(attente.erreur, /validation/);
  const codeRefuse = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Avant', type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: '0712345611' },
    gerant: { nom: 'G Avant', telephone: '0712345612', pin: '1234' }, codeParrain: ins.code, conditionsAcceptees: true,
  });
  assert.equal(codeRefuse.ok, false);

  // 3. L'équipe valide
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.equal(install.ok, true, JSON.stringify(install));
  const liste = await api('GET', '/admin/commerciaux', null, install.jeton);
  const awa = liste.commerciaux.find((c) => c.code === ins.code);
  assert.equal(awa.enAttente, true);
  assert.equal((await api('POST', '/admin/commercial-validation', { id: awa.id, action: 'valider' }, install.jeton)).ok, true);
  const conn = await api('POST', '/commercial/connexion', { telephone: '0712340000', pays: 'CI', pin: '123456' });
  assert.equal(conn.ok, true, JSON.stringify(conn));

  // 4. Un commerce inscrit avec le code paie le tarif actuel ; sans code, le prix catalogue (plus élevé, jamais plus bas)
  const avecCode = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Code', type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: '0712345621' },
    gerant: { nom: 'G Code', telephone: '0712345622', pin: '1234' }, codeParrain: ins.code, conditionsAcceptees: true,
  });
  assert.equal(avecCode.ok, true, JSON.stringify(avecCode));
  const sansCode = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Sans Code', type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: '0712345631' },
    gerant: { nom: 'G Sans', telephone: '0712345632', pin: '1234' }, conditionsAcceptees: true,
  });
  const regles = (await api('GET', '/tarifs')).regles;
  const formules = (await api('GET', '/tarifs')).formules;
  const fixerDate = (jours) => api('POST', '/admin/tarifs', { formules, regles: { ...regles, catalogueDepuis: new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10) } }, install.jeton);
  const tarifs = async () => Object.fromEntries((await api('GET', '/admin/commerces', null, install.jeton)).commerces.map((c) => [c.commerce.nom, c.tarif]));

  // Catalogue prévu pour demain : tous les commerces d'aujourd'hui gardent leur prix actuel
  await fixerDate(1);
  let t = await tarifs();
  assert.equal(t['Chez Sans Code'].parMois, 9000);
  assert.equal(t['Chez Sans Code'].mode, 'base');

  // Catalogue en vigueur depuis hier : sans code = prix catalogue ; avec code = tarif actuel ; commerces plus anciens inchangés
  await fixerDate(-1);
  t = await tarifs();
  assert.equal(t['Chez Code'].parMois, 9000); // tarif actuel inchangé
  assert.equal(t['Chez Code'].parrain, true);
  assert.equal(t['Chez Sans Code'].parMois, 10000); // catalogue = 9000 ÷ 0,9
  assert.equal(t['Chez Sans Code'].mode, 'catalogue');
  assert.ok(t['Chez Sans Code'].annuel > t['Chez Code'].annuel);

  // 5. Refuser une demande en attente la supprime
  const autre = await api('POST', '/commercial/inscription', { nom: 'Zoé', telephone: '0712340002', pays: 'CI', pin: '111111', conditionsAcceptees: true });
  const l2 = await api('GET', '/admin/commerciaux', null, install.jeton);
  const zoe = l2.commerciaux.find((c) => c.code === autre.code);
  assert.equal((await api('POST', '/admin/commercial-validation', { id: zoe.id, action: 'refuser' }, install.jeton)).ok, true);
  assert.equal((await api('GET', '/admin/commerciaux', null, install.jeton)).commerciaux.some((c) => c.code === autre.code), false);
});
