// Tests de l'API PHP : un gérant avec plusieurs commerces (séparation des données, changement, ajout),
// détection d'une activité mal déclarée, consultation des produits sans chiffres, paiement groupé.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4590 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-commerces-'));
const fichierBase = path.join(dossier, 'test.sqlite');
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, epicerie, resto;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}
const maintenant = () => new Date().toISOString();
const element = (type, id, contenu) => ({ type, id, contenu, modifieLe: maintenant() });
const produit = (id, nom, extra = {}) => element('produits', id, { id, nom, categorieId: 'c1', prix: 1000, prixAchat: 600, stock: 10, unite: 'pièce', groupes: [], ...extra });

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const ins = await api('POST', '/inscription', {
    commerce: { nom: 'Épicerie Awa', type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: '0712345701' },
    gerant: { nom: 'Awa Koné', telephone: '0712345702', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(ins.ok, true, JSON.stringify(ins));
  epicerie = ins;
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.equal(install.ok, true, JSON.stringify(install));
  admin = install.jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('ajouter un commerce : le code PIN est redemandé, puis le second commerce apparaît avec son propre abonnement', async () => {
  const corps = { commerce: { nom: 'Chez Awa Maquis', type: 'maquis', ville: 'Abidjan' }, conditionsAcceptees: true };
  assert.equal((await api('POST', '/ajouter-commerce', { ...corps, pin: '0000' }, epicerie.jeton)).statut, 401);
  assert.equal((await api('POST', '/ajouter-commerce', { ...corps, pin: '1234', conditionsAcceptees: false }, epicerie.jeton)).statut, 400);
  resto = await api('POST', '/ajouter-commerce', { ...corps, pin: '1234' }, epicerie.jeton);
  assert.equal(resto.statut, 201, JSON.stringify(resto));
  assert.equal(resto.commerce.type, 'maquis');
  assert.notEqual(resto.commerce.id, epicerie.commerce.id);
  const liste = await api('GET', '/mes-commerces', null, resto.jeton);
  assert.equal(liste.commerces.length, 2);
  assert.equal(liste.courant, resto.commerce.id);
  const e = liste.commerces.find((c) => c.type === 'epicerie');
  const m = liste.commerces.find((c) => c.type === 'maquis');
  assert.equal(e.tarif.formule, 'proximite');
  assert.equal(m.tarif.formule, 'maquis');
  // Total à payer = somme des deux abonnements (chacun au tarif de son métier)
  assert.equal(liste.totaux.FCFA, e.tarif.parMois + m.tarif.parMois);
});

test('les données de chaque commerce restent séparées', async () => {
  const v = (id) => element('ventes', id, { id, date: maintenant(), total: 5000, lignes: [], vendeurId: 'x', paiement: 'Espèces' });
  assert.equal((await api('POST', '/donnees', { elements: [produit('p-epic', 'Huile')] }, epicerie.jeton)).ok, true);
  assert.equal((await api('POST', '/donnees', { elements: [produit('p-maq', 'Poulet braisé', { unite: 'portion' }), v('v-maq')] }, resto.jeton)).ok, true);
  const donneesEpicerie = await api('GET', '/donnees', null, epicerie.jeton);
  const ids = (d) => (d.elements || []).map((x) => x.id);
  assert.ok(ids(donneesEpicerie).includes('p-epic'));
  assert.ok(!ids(donneesEpicerie).includes('p-maq') && !ids(donneesEpicerie).includes('v-maq'));
});

test('la connexion ouvre le dernier commerce utilisé, et le gérant change de commerce sans ressaisir son code', async () => {
  const conn = await api('POST', '/connexion', { telephone: '0712345702', pays: 'CI', pin: '1234' });
  assert.equal(conn.ok, true, JSON.stringify(conn));
  assert.equal(conn.commerces.length, 2);
  const autre = await api('POST', '/changer-commerce', { commerceId: epicerie.commerce.id }, resto.jeton);
  assert.equal(autre.ok, true, JSON.stringify(autre));
  assert.equal(autre.commerce.id, epicerie.commerce.id);
  assert.equal((await api('GET', '/moi', null, autre.jeton)).commerce.id, epicerie.commerce.id);
  assert.equal((await api('POST', '/changer-commerce', { commerceId: 'com_inconnu' }, resto.jeton)).statut, 404);
});

test('un vendeur ne peut ni ajouter ni changer de commerce, et ne peut pas prendre le numéro d’un gérant', async () => {
  const cree = await api('POST', '/utilisateurs', { nom: 'Vendeur', telephone: '0712345703', pin: '5678', actif: true }, epicerie.jeton);
  assert.equal(cree.ok, true, JSON.stringify(cree));
  const conn = await api('POST', '/connexion', { telephone: '0712345703', pays: 'CI', pin: '5678' });
  assert.equal(conn.commerces.length, 0);
  assert.equal((await api('POST', '/ajouter-commerce', { commerce: { nom: 'X', type: 'epicerie', ville: 'Abidjan' }, pin: '5678', conditionsAcceptees: true }, conn.jeton)).statut, 403);
  assert.equal((await api('POST', '/changer-commerce', { commerceId: resto.commerce.id }, conn.jeton)).statut, 403);
  // Le numéro du gérant est déjà pris dans les deux commerces : refusé pour un vendeur
  assert.equal((await api('POST', '/utilisateurs', { nom: 'Autre', telephone: '0712345702', pin: '9999', actif: true }, resto.jeton)).statut, 409);
  // Une autre personne ne peut pas s'inscrire avec le numéro d'un gérant
  const ins = await api('POST', '/inscription', { commerce: { nom: 'Intrus', type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: '0712345799' }, gerant: { nom: 'Intrus', telephone: '0712345702', pin: '1111' }, conditionsAcceptees: true });
  assert.equal(ins.statut, 409);
});

test('le numéro d’un commerce qui appartient à quelqu’un d’autre est refusé', async () => {
  const autreGerant = await api('POST', '/inscription', { commerce: { nom: 'Chez Moussa', type: 'boutique', pays: 'CI', ville: 'Abidjan', telephone: '0712345710' }, gerant: { nom: 'Moussa', telephone: '0712345711', pin: '2222' }, conditionsAcceptees: true });
  assert.equal(autreGerant.ok, true);
  const r = await api('POST', '/ajouter-commerce', { commerce: { nom: 'Pirate', type: 'epicerie', ville: 'Abidjan', telephone: '0712345710' }, pin: '1234', conditionsAcceptees: true }, epicerie.jeton);
  assert.equal(r.statut, 409);
});

test('une épicerie qui vend des plats à la portion est signalée, une vraie épicerie non', async () => {
  const plats = ['Attiéké poisson', 'Riz sauce', 'Foutou', 'Poulet braisé', 'Garba', 'Alloco'].map((nom, i) => produit('plat' + i, nom, { unite: 'portion', groupes: [{ id: 'g', nom: 'Accompagnement', obligatoire: true, options: [{ id: 'o', nom: 'Alloco', prix: 0 }] }] }));
  const faux = await api('POST', '/inscription', { commerce: { nom: 'Fausse Épicerie', type: 'epicerie', pays: 'CI', ville: 'Abidjan', telephone: '0712345720' }, gerant: { nom: 'Faux', telephone: '0712345721', pin: '3333' }, conditionsAcceptees: true });
  assert.equal((await api('POST', '/donnees', { elements: plats }, faux.jeton)).ok, true);
  const vraie = ['Huile', 'Riz', 'Sucre', 'Lait', 'Savon'].map((nom, i) => produit('e' + i, nom));
  assert.equal((await api('POST', '/donnees', { elements: vraie }, epicerie.jeton)).ok, true);
  const liste = (await api('GET', '/admin/commerces', null, admin)).commerces;
  const parNom = Object.fromEntries(liste.map((c) => [c.commerce.nom, c]));
  const s = parNom['Fausse Épicerie'].signaux;
  assert.equal(s.length, 1, JSON.stringify(s));
  assert.equal(s[0].code, 'restauration');
  assert.equal(s[0].formuleSuggeree.id, 'maquis');
  assert.ok(s[0].ecartParMois > 0);
  assert.deepEqual(parNom['Épicerie Awa'].signaux, []);
  // Le maquis du même gérant n'est pas signalé (activité déclarée = activité réelle) et les deux commerces sont reliés
  assert.deepEqual(parNom['Chez Awa Maquis'].signaux, []);
  assert.deepEqual(parNom['Épicerie Awa'].autresCommerces.map((c) => c.nom), ['Chez Awa Maquis']);
});

test('l’équipe voit les produits d’un commerce sans aucun chiffre, et la consultation est notée', async () => {
  const r = await api('GET', '/admin/catalogue?commerceId=' + resto.commerce.id, null, admin);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.produits.map((p) => p.nom), ['Poulet braisé']);
  const texte = JSON.stringify(r);
  for (const interdit of ['prix', 'prixAchat', 'stock', 'total', '5000', '1000', '600']) assert.ok(!texte.includes(interdit), `« ${interdit} » ne doit pas apparaître : ${texte}`);
  const notees = Number(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo $p->query("SELECT COUNT(*) FROM journal WHERE action = 'amorac-catalogue' AND commerce_id = '${resto.commerce.id}'")->fetchColumn();`]).toString());
  assert.equal(notees, 1);
  assert.equal((await api('GET', '/admin/catalogue?commerceId=com_inconnu', null, admin)).statut, 404);
  assert.equal((await api('GET', '/admin/catalogue?commerceId=' + resto.commerce.id)).statut, 401);
});

test('paiement groupé : un seul paiement pour tous les commerces du même gérant, pas pour des gérants différents', async () => {
  const montant = (id) => ({ commerceId: id, montant: 9000, mois: 1 });
  const ok = await api('POST', '/admin/paiement-groupe', { lignes: [{ ...montant(epicerie.commerce.id) }, { commerceId: resto.commerce.id, montant: 10000, mois: 1 }], moyen: 'Wave', note: 'Virement groupé' }, admin);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal(ok.commerces.length, 2);
  for (const c of ok.commerces) {
    assert.equal(c.commerce.abonnement.statut, 'actif');
    assert.equal(c.commerce.abonnement.paiements.at(-1).moyen, 'Wave');
  }
  const liste = (await api('GET', '/admin/commerces', null, admin)).commerces;
  const moussa = liste.find((c) => c.commerce.nom === 'Chez Moussa');
  const melange = await api('POST', '/admin/paiement-groupe', { lignes: [montant(epicerie.commerce.id), montant(moussa.id)], moyen: 'Wave' }, admin);
  assert.equal(melange.statut, 400);
  // Rien n'a été enregistré pour le gérant refusé
  const apres = (await api('GET', '/admin/commerces', null, admin)).commerces.find((c) => c.commerce.nom === 'Chez Moussa');
  assert.equal(apres.commerce.abonnement.paiements.length, 0);
});
