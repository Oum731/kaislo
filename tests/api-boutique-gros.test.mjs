// Boutique : lien privé des grossistes (prix de gros au carton). Lancer : npm test
// Un détaillant (lien public) ne voit jamais un prix de gros ; un grossiste (lien privé) ne voit que le gros.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-gros-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, gerant, cle, lienPro;
const maintenant = () => new Date().toISOString();
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const client = { nom: 'Koffi Gros', telephone: '0701020304', adresse: 'Marché de gros, Adjamé' };

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, entetes: r.headers, texte: null, ...(await r.json()) };
}

before(async () => {
  fs.mkdirSync(path.join(dossier, 'boutique'));
  fs.writeFileSync(path.join(dossier, 'boutique', 'index.html'), '<!DOCTYPE html><html><head><title>Boutique</title><meta name="robots" content="noindex, nofollow"></head><body>vitrine</body></html>');
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\nDossierSite=${dossier}\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Dépôt Awa', type: 'grossiste', pays: 'CI', ville: 'Abidjan', quartier: 'Adjamé', telephone: '0712345951' },
    gerant: { nom: 'Awa', telephone: '0712345952', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const r = await api('POST', '/donnees', { elements: [
    { type: 'categories', id: 'c1', modifieLe: maintenant(), contenu: { id: 'c1', nom: 'Boissons' } },
    { type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Coca 33 cl', prix: 500, categorieId: 'c1', actif: true, enLigne: true, groupes: [], gros: { prix: 10800, unite: 'carton', contenance: 24, minimum: 2, demi: { prix: 5800 } } } },
    { type: 'produits', id: 'p2', modifieLe: maintenant(), contenu: { id: 'p2', nom: 'Eau 1,5 L', prix: 300, categorieId: 'c1', actif: true, enLigne: true, groupes: [] } },
  ] }, gerant.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
  const b = await api('POST', '/boutique', { actif: true, slug: 'depot-awa', whatsapp: '0712345952', conditionsAcceptees: true }, gerant.jeton);
  assert.equal(b.ok, true, JSON.stringify(b));
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('sans lien privé : pas de lien de gros, et le public ne voit que le détail', async () => {
  const m = await api('GET', '/boutique', null, gerant.jeton);
  assert.equal(m.boutique.proActif, false);
  assert.equal(m.boutique.lienPro, '');
  const pub = await api('GET', '/public/boutique?b=depot-awa');
  assert.deepEqual(pub.boutique.produits.map((p) => [p.nom, p.prix]), [['Coca 33 cl', 500], ['Eau 1,5 L', 300]]);
  assert.doesNotMatch(JSON.stringify(pub), /10800|carton|"gros"|"minimum"/i);
  // Une clé inventée ne donne rien
  assert.equal((await api('GET', '/public/boutique?b=depot-awa&pro=0123456789abcdef')).statut, 404);
});

test('le gérant active le lien privé : une clé secrète, jamais dans le public', async () => {
  const r = await api('POST', '/boutique', { actif: true, slug: 'depot-awa', whatsapp: '0712345952', pro: true }, gerant.jeton);
  assert.equal(r.boutique.proActif, true);
  assert.equal(r.boutique.articlesGros, 1);
  assert.match(r.boutique.lienPro, /\/boutique\/depot-awa\/\?pro=[0-9a-f]{16}$/);
  lienPro = r.boutique.lienPro;
  cle = lienPro.split('?pro=')[1];
  // Enregistrer sans toucher à « pro » garde la même clé
  const encore = await api('POST', '/boutique', { actif: true, slug: 'depot-awa', whatsapp: '0712345952' }, gerant.jeton);
  assert.equal(encore.boutique.lienPro, lienPro);
  const pub = await api('GET', '/public/boutique?b=depot-awa');
  assert.doesNotMatch(JSON.stringify(pub), new RegExp(cle));
  assert.equal(pub.boutique.produits.length, 2);
});

test('lien privé : seulement les articles avec prix de gros, à ce prix, au carton', async () => {
  const r = await api('GET', `/public/boutique?b=depot-awa&pro=${cle}`);
  assert.equal(r.statut, 200);
  assert.equal(r.boutique.gros, true);
  assert.deepEqual(r.boutique.produits.map((p) => [p.id, p.nom, p.prix, p.minimum]), [['p1', 'Coca 33 cl (carton de 24)', 10800, 2], ['p1:demi', 'Coca 33 cl (demi-carton de 12)', 5800, 1]]);
  assert.doesNotMatch(JSON.stringify(r), /"prix":500\b/); // le prix de détail n'y est jamais
});

test('commande de gros : minimum respecté, prix de gros recalculé par le serveur', async () => {
  const lignes = (q) => [{ produitId: 'p1', quantite: q }];
  const trop = await api('POST', '/public/commande', { b: 'depot-awa', pro: cle, client, lignes: lignes(1) });
  assert.equal(trop.statut, 400);
  assert.match(trop.erreur, /Minimum 2 carton/);
  // Un article sans prix de gros ne se commande pas par le lien de gros
  const sans = await api('POST', '/public/commande', { b: 'depot-awa', pro: cle, client, lignes: [{ produitId: 'p2', quantite: 5 }] });
  assert.equal(sans.statut, 400);
  const ok = await api('POST', '/public/commande', { b: 'depot-awa', pro: cle, client, lignes: lignes(3) });
  assert.equal(ok.statut, 201, JSON.stringify(ok));
  assert.equal(ok.commande.total, 32400);
  assert.equal(ok.commande.gros, true);
  assert.equal(ok.commande.lignes[0].nom, 'Coca 33 cl (carton de 24)');
  // Demi-carton : un article de plus, au prix du demi-carton, dès 1
  const demi = await api('POST', '/public/commande', { b: 'depot-awa', pro: cle, client, lignes: [{ produitId: 'p1:demi', quantite: 1 }, { produitId: 'p1', quantite: 2 }] });
  assert.equal(demi.statut, 201, JSON.stringify(demi));
  assert.equal(demi.commande.total, 5800 + 21600);
  assert.deepEqual(demi.commande.lignes.map((l) => l.produitId), ['p1:demi', 'p1']);
  // Le demi-carton n'existe pas dans le catalogue de détail
  assert.equal((await api('POST', '/public/commande', { b: 'depot-awa', client, lignes: [{ produitId: 'p1:demi', quantite: 1 }] })).statut, 400);
  // Mauvaise clé : refus
  assert.equal((await api('POST', '/public/commande', { b: 'depot-awa', pro: 'ffffffffffffffff', client, lignes: lignes(3) })).statut, 404);
  // Le gérant la voit, marquée « gros »
  const liste = await api('GET', '/commandes-en-ligne', null, gerant.jeton);
  assert.equal(liste.commandes[1].gros, true);
  assert.equal(liste.commandes[1].total, 32400);
});

test('commande par le lien public : toujours le prix de détail, jamais le gros', async () => {
  const r = await api('POST', '/public/commande', { b: 'depot-awa', client, lignes: [{ produitId: 'p1', quantite: 1 }] });
  assert.equal(r.statut, 201);
  assert.equal(r.commande.total, 500);
  assert.equal(r.commande.gros, false);
  assert.equal(r.commande.lignes[0].nom, 'Coca 33 cl');
});

test('la page du lien privé n\'est jamais indexée ni mise en cache', async () => {
  const r = await fetch(`${U}/page-boutique?b=depot-awa&pro=${cle}`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  assert.match(r.headers.get('cache-control'), /no-store/);
  const html = await r.text();
  assert.match(html, /noindex, nofollow/);
  assert.doesNotMatch(html, /seo-boutique|10800|10 800/);
  // La page publique écrite pour Google ne parle jamais de gros
  const pub = await (await fetch(`${U}/page-boutique?b=depot-awa`)).text();
  assert.doesNotMatch(pub, /10800|10\s?800|carton|pro=/);
});

test('changer le lien : l\'ancien cesse de marcher ; le désactiver aussi', async () => {
  const r = await api('POST', '/boutique', { actif: true, slug: 'depot-awa', whatsapp: '0712345952', regenererPro: true }, gerant.jeton);
  assert.notEqual(r.boutique.lienPro, lienPro);
  assert.equal((await api('GET', `/public/boutique?b=depot-awa&pro=${cle}`)).statut, 404);
  const nouvelle = r.boutique.lienPro.split('?pro=')[1];
  assert.equal((await api('GET', `/public/boutique?b=depot-awa&pro=${nouvelle}`)).statut, 200);
  const off = await api('POST', '/boutique', { actif: true, slug: 'depot-awa', whatsapp: '0712345952', pro: false }, gerant.jeton);
  assert.equal(off.boutique.proActif, false);
  assert.equal((await api('GET', `/public/boutique?b=depot-awa&pro=${nouvelle}`)).statut, 404);
});

test('restauration (restaurant, fast-food, snack, bar) : pas de vente en gros', async () => {
  const resto = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Koffi Snack', type: 'maquis', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712346151' },
    gerant: { nom: 'Koffi', telephone: '0712346152', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(resto.statut, 201, JSON.stringify(resto));
  await api('POST', '/donnees', { elements: [
    { type: 'categories', id: 'c1', modifieLe: maintenant(), contenu: { id: 'c1', nom: 'Plats' } },
    { type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Garba', prix: 1500, categorieId: 'c1', actif: true, enLigne: true, groupes: [], gros: { prix: 12000, unite: 'carton', contenance: 10, minimum: 1 } } },
  ] }, resto.jeton);
  const r = await api('POST', '/boutique', { actif: true, slug: 'snack-koffi', whatsapp: '0712346152', conditionsAcceptees: true, pro: true }, resto.jeton);
  assert.equal(r.boutique.grosDisponible, false);
  assert.equal(r.boutique.proActif, false);
  assert.equal(r.boutique.lienPro, '');
  // Même avec une clé devinée, jamais de catalogue de gros
  assert.equal((await api('GET', '/public/boutique?b=snack-koffi&pro=0123456789abcdef')).statut, 404);
  // Et le dépôt (grossiste) l'a bien
  assert.equal((await api('GET', '/boutique', null, gerant.jeton)).boutique.grosDisponible, true);
});
