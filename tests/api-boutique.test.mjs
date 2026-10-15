// Boutique en ligne : articles publiés, commande par WhatsApp, prix recalculés par le serveur, suivi des commandes.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5390 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-boutique-'));
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, gerant;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}



const maintenant = () => new Date().toISOString();
const el = (type, id, contenu) => ({ type, id, contenu, modifieLe: maintenant() });

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Awa Boutique', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712345601' },
    gerant: { nom: 'Awa', telephone: '0712345602', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const r = await api('POST', '/donnees', { elements: [
    el('categories', 'c1', { id: 'c1', nom: 'Boissons' }),
    el('categories', 'c2', { id: 'c2', nom: 'Hors ligne' }),
    el('produits', 'p1', { id: 'p1', nom: 'Jus de bissap', prix: 1000, promo: null, prixAchat: 400, categorieId: 'c1', enLigne: true, image: 'img_abc', groupes: [
      { id: 'g1', nom: 'Taille', type: 'unique', obligatoire: true, options: [{ id: 'o1', nom: 'Petit', prix: 0 }, { id: 'o2', nom: 'Grand', prix: 500 }] },
      { id: 'g2', nom: 'Suppléments', type: 'multiple', obligatoire: false, options: [{ id: 'o3', nom: 'Glace', prix: 100 }] },
    ] }),
    el('produits', 'p2', { id: 'p2', nom: 'Eau 1,5 L', prix: 600, promo: 500, prixAchat: 200, categorieId: 'c1', enLigne: true, groupes: [] }),
    el('produits', 'p3', { id: 'p3', nom: 'Article privé', prix: 900, promo: null, categorieId: 'c2', enLigne: false, groupes: [] }),
    el('images', 'img_abc', { dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' }),
    el('images', 'img_secret', { dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' }),
  ] }, gerant.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

const reglages = { actif: true, slug: 'chez-awa', whatsapp: '0712345603', description: 'Boissons fraîches', livraison: 'Livraison à Cocody' };

test('la boutique est introuvable tant qu\'elle n\'est pas activée, et réservée au gérant', async () => {
  assert.equal((await api('GET', '/public/boutique?b=chez-awa')).statut, 404);
  const l = await api('GET', '/boutique', null, gerant.jeton);
  assert.equal(l.boutique.actif, false);
  assert.equal(l.boutique.suggestion, 'chez-awa-boutique');
  assert.equal(l.boutique.articlesPublies, 2);
  assert.equal((await api('POST', '/boutique', { ...reglages, slug: 'AB' }, gerant.jeton)).statut, 400);
  assert.equal((await api('POST', '/boutique', { ...reglages, slug: 'admin' }, gerant.jeton)).statut, 400);
  assert.equal((await api('POST', '/boutique', { ...reglages, whatsapp: '12' }, gerant.jeton)).statut, 400);
  assert.equal((await api('POST', '/boutique', reglages)).statut, 401);
  const ok = await api('POST', '/boutique', reglages, gerant.jeton);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.match(ok.boutique.lien, /\/boutique\/\?b=chez-awa$/);
});

test('la vitrine ne montre que les articles publiés, sans prix d\'achat', async () => {
  const v = await api('GET', '/public/boutique?b=chez-awa');
  assert.equal(v.ok, true);
  assert.deepEqual(v.boutique.produits.map((p) => p.id).sort(), ['p1', 'p2']);
  assert.deepEqual(v.boutique.categories.map((c) => c.id), ['c1']);
  assert.equal(v.boutique.whatsapp, '2250712345603');
  assert.equal(JSON.stringify(v).includes('prixAchat'), false);
  assert.equal(v.boutique.produits.find((p) => p.id === 'p2').promo, 500);
  // Photos : seulement celles des articles publiés
  const photo = await fetch(`http://127.0.0.1:${PORT}/api/public/boutique-image?b=chez-awa&i=img_abc`);
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('content-type'), 'image/jpeg');
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/api/public/boutique-image?b=chez-awa&i=img_secret`)).status, 404);
});

test('la commande est recalculée par le serveur et refuse les demandes incorrectes', async () => {
  const client = { nom: 'Koffi', telephone: '0701020304', adresse: 'Cocody Angré' };
  const base = { b: 'chez-awa', client, note: 'Sans sucre' };
  // Prix falsifié ignoré, option obligatoire, article non publié, honeypot
  assert.equal((await api('POST', '/public/commande', { ...base, lignes: [{ produitId: 'p1', quantite: 1, options: [] }] })).statut, 400);
  assert.equal((await api('POST', '/public/commande', { ...base, lignes: [{ produitId: 'p3', quantite: 1 }] })).statut, 400);
  assert.equal((await api('POST', '/public/commande', { ...base, lignes: [{ produitId: 'p2', quantite: 0 }] })).statut, 400);
  assert.equal((await api('POST', '/public/commande', { ...base, client: { nom: 'K', telephone: '12' }, lignes: [{ produitId: 'p2', quantite: 1 }] })).statut, 400);
  assert.equal((await api('POST', '/public/commande', { ...base, lignes: [] })).statut, 400);
  // Nom et adresse de livraison obligatoires
  assert.equal((await api('POST', '/public/commande', { ...base, client: { nom: 'Koffi', telephone: '0701020304' }, lignes: [{ produitId: 'p2', quantite: 1 }] })).statut, 400);
  assert.equal((await api('POST', '/public/commande', { ...base, client: { nom: 'Koffi', telephone: '0701020304', adresse: '  ' }, lignes: [{ produitId: 'p2', quantite: 1 }] })).statut, 400);
  assert.equal((await api('POST', '/public/commande', { ...base, client: { nom: '', telephone: '0701020304', adresse: 'Cocody' }, lignes: [{ produitId: 'p2', quantite: 1 }] })).statut, 400);
  assert.equal((await api('POST', '/public/commande', { ...base, b: 'inconnu', lignes: [{ produitId: 'p2', quantite: 1 }] })).statut, 404);
  const piege = await api('POST', '/public/commande', { ...base, site: 'robot', lignes: [{ produitId: 'p2', quantite: 1 }] });
  assert.equal(piege.ok, true);
  assert.equal(piege.commande, undefined);
  // Commande valide : 2 × (Jus grand + glace = 1000 + 500 + 100) + 3 × eau promo 500
  const r = await api('POST', '/public/commande', { ...base, lignes: [
    { produitId: 'p1', quantite: 2, options: ['o2', 'o3'], prixUnitaire: 1 }, { produitId: 'p2', quantite: 3, total: 1 },
  ] });
  assert.equal(r.statut, 201, JSON.stringify(r));
  assert.equal(r.commande.numero, 1);
  assert.equal(r.commande.total, 2 * 1600 + 3 * 500);
  assert.equal(r.commande.whatsapp, '2250712345603');
  assert.deepEqual(r.commande.lignes[0].options, ['Grand', 'Glace']);
  assert.deepEqual(r.commande.lignes[0].optionIds, ['o2', 'o3']);
  // Photo de l'article : adresse publique de l'image (jamais pour un article sans photo)
  assert.match(r.commande.lignes[0].photo, /\/api\/public\/boutique-image\?b=chez-awa&i=img_abc$/);
  assert.equal(r.commande.lignes[1].photo, null);
  const r2 = await api('POST', '/public/commande', { ...base, lignes: [{ produitId: 'p2', quantite: 1 }] });
  assert.equal(r2.commande.numero, 2);
});

test('le commerçant voit les commandes et change leur statut', async () => {
  const l = await api('GET', '/commandes-en-ligne', null, gerant.jeton);
  assert.equal(l.nouvelles, 2);
  assert.equal(l.commandes.length, 2);
  assert.equal(l.commandes[0].numero, 2);
  assert.equal(l.commandes[1].client.nom, 'Koffi');
  const id = l.commandes[1].id;
  assert.equal((await api('POST', '/commandes-en-ligne', { id, statut: 'bizarre' }, gerant.jeton)).statut, 400);
  const m = await api('POST', '/commandes-en-ligne', { id, statut: 'confirmee' }, gerant.jeton);
  assert.equal(m.commande.statut, 'confirmee');
  assert.equal((await api('GET', '/commandes-en-ligne', null, gerant.jeton)).nouvelles, 1);
  assert.equal((await api('GET', '/commandes-en-ligne')).statut, 401);
});

test('une boutique désactivée ou une adresse déjà prise sont refusées', async () => {
  const autre = await api('POST', '/inscription', {
    commerce: { nom: 'Autre commerce', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Marcory', telephone: '0712345611' },
    gerant: { nom: 'Moussa', telephone: '0712345612', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal((await api('POST', '/boutique', { ...reglages, whatsapp: '0712345613' }, autre.jeton)).statut, 409);
  assert.equal((await api('POST', '/boutique', { ...reglages, actif: false }, gerant.jeton)).ok, true);
  assert.equal((await api('GET', '/public/boutique?b=chez-awa')).statut, 404);
  assert.equal((await api('POST', '/public/commande', { b: 'chez-awa', client: { nom: 'K', telephone: '0701020304' }, lignes: [{ produitId: 'p2', quantite: 1 }] })).statut, 404);
});
