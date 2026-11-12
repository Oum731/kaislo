// Tests du retour d'article côté serveur : le négatif n'est accepté qu'avec le code du gérant, jamais plus que la vente, jamais sur une vente annulée.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { creerLigne } from '../src/lib/donnees/vente.js';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-retour-'));
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


const vente = (id, vendeurId) => {
  const produit = { id: 'p1', nom: 'Huile', prix: 2500, promo: null, prixAchat: 0, groupes: [] };
  const l = creerLigne(produit, {}, 2, 'FCFA');
  return { id, numero: 1, date: maintenant(), vendeurId, vendeurNom: 'Awa', paiement: 'Espèces', recu: 0, clientId: null, clientNom: null, lignes: [l], sousTotal: l.total, remise: 0, total: l.total };
};
// Retour de `q` huiles (2 500 chacune) sur la vente v
const retour = (id, de, vendeurId, q = 1, extra = {}) => ({
  id, numero: 'R1', retourDe: de, retourDeNumero: 1, date: maintenant(), vendeurId, vendeurNom: 'Awa', paiement: 'Espèces', recu: 0, clientId: null, clientNom: null,
  lignes: [{ produitId: 'p1', produitNom: 'Huile', nom: 'Huile', quantite: -q, prixUnitaire: 2500, total: -2500 * q, details: [], ligneIndex: 0 }],
  sousTotal: -2500 * q, remise: 0, total: -2500 * q, motifRetour: 'abîmé', ...extra,
});

let gerant, vendeur, idVendeur;

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nDefi=non\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const ins = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Retour', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712345611' },
    gerant: { nom: 'Gérant Test', telephone: '0712345612', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(ins.ok, true, JSON.stringify(ins));
  gerant = ins.jeton;
  const cree = await api('POST', '/utilisateurs', { nom: 'Awa', telephone: '0712345613', pin: '5678', actif: true }, gerant);
  assert.equal(cree.ok, true, JSON.stringify(cree));
  idVendeur = cree.id;
  const conn = await api('POST', '/connexion', { telephone: '0712345613', pays: 'CI', pin: '5678' });
  assert.equal(conn.ok, true, JSON.stringify(conn));
  vendeur = conn.jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('un retour sur une vente existante : refusé à un vendeur sans le code du gérant, accepté après', async () => {
  assert.deepEqual((await envoyer(vendeur, [element('ventes', 'v1', vente('v1', idVendeur))])).refuses, []);
  const sans = await envoyer(vendeur, [element('ventes', 'r1', retour('r1', 'v1', idVendeur))]);
  assert.match(sans.refuses[0].raison, /code du gérant/);
  assert.equal((await api('POST', '/verifier-gerant', { pin: '1234' }, vendeur)).ok, true);
  assert.deepEqual((await envoyer(vendeur, [element('ventes', 'r1', retour('r1', 'v1', idVendeur))])).refuses, []);
});

test('le gérant peut rendre, mais jamais plus que la vente (total cumulé) ni sur une vente inconnue ou annulée', async () => {
  // v1 = 5 000 ; r1 a rendu 2 500
  const trop = await envoyer(gerant, [element('ventes', 'r2', retour('r2', 'v1', 'x', 2))]);
  assert.match(trop.refuses[0].raison, /plus que le montant/);
  assert.deepEqual((await envoyer(gerant, [element('ventes', 'r3', retour('r3', 'v1', 'x', 1))])).refuses, []);
  assert.match((await envoyer(gerant, [element('ventes', 'r4', retour('r4', 'v1', 'x', 1))])).refuses[0].raison, /plus que le montant/); // tout est rendu
  assert.match((await envoyer(gerant, [element('ventes', 'r5', retour('r5', 'inconnue', 'x'))])).refuses[0].raison, /introuvable/);
  const annulee = { ...vente('v2', 'x'), annulee: { date: maintenant(), par: 'Gérant Test', motif: 'erreur' } };
  assert.deepEqual((await envoyer(gerant, [element('ventes', 'v2', annulee)])).refuses, []);
  assert.match((await envoyer(gerant, [element('ventes', 'r6', retour('r6', 'v2', 'x'))])).refuses[0].raison, /introuvable ou annulée/);
});

test('un retour doit être négatif et cohérent, et ne se modifie pas après coup', async () => {
  assert.deepEqual((await envoyer(gerant, [element('ventes', 'v3', vente('v3', 'x'))])).refuses, []);
  const positif = retour('r7', 'v3', 'x');
  positif.lignes[0].quantite = 1;
  assert.match((await envoyer(gerant, [element('ventes', 'r7', positif)])).refuses[0].raison, /négatifs/);
  assert.match((await envoyer(gerant, [element('ventes', 'r8', retour('r8', 'v3', 'x', 1, { total: -100 }))])).refuses[0].raison, /total/);
  assert.match((await envoyer(gerant, [element('ventes', 'r9', retour('r9', 'v3', 'x', 1, { remise: 50 }))])).refuses[0].raison, /remise/);
  assert.deepEqual((await envoyer(gerant, [element('ventes', 'r10', retour('r10', 'v3', 'x'))])).refuses, []);
  assert.match((await envoyer(gerant, [element('ventes', 'r10', { ...retour('r10', 'v3', 'x'), motifRetour: 'autre' })])).refuses[0].raison, /ne peut pas être modifié/);
  // Une vente ordinaire ne peut toujours pas être négative
  const neg = vente('v4', 'x');
  neg.lignes[0].quantite = -1; neg.lignes[0].total = -2500; neg.sousTotal = -2500; neg.total = -2500;
  assert.match((await envoyer(gerant, [element('ventes', 'v4', neg)])).refuses[0].raison, /négatif/);
});
