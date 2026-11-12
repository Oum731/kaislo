// Sauvegardes sur le serveur : copie du jour, copie manuelle, restauration avec le code PIN, retour en arrière, isolation entre commerces.
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
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-sauvegardes-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, awa, bako;
const maintenant = () => new Date().toISOString();

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const el = (type, id, contenu) => ({ type, id, modifieLe: maintenant(), contenu });
const produit = (id, nom) => el('produits', id, { id, nom, prix: 1000, categorieId: 'c1', actif: true, groupes: [] });
const envoyer = (jeton, elements) => api('POST', '/donnees', { elements }, jeton);
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const inscrire = (nom, tel) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});
// Tous les éléments vivants d'un commerce, tels que les voit un appareil neuf
async function vivants(jeton) {
  const d = await api('GET', '/donnees', null, jeton);
  return Object.fromEntries(d.elements.filter((e) => !e.supprime).map((e) => [e.type + ':' + e.id, e.contenu]));
}

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nDefi=non\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  awa = await inscrire('Épicerie Awa', '0712345901');
  bako = await inscrire('Boutique Bako', '0712345911');
  assert.equal(awa.statut, 201, JSON.stringify(awa));
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('réservé au gérant connecté', async () => {
  assert.equal((await api('GET', '/sauvegardes')).statut, 401);
  assert.equal((await api('POST', '/sauvegardes', { action: 'creer' })).statut, 401);
  assert.equal((await api('POST', '/sauvegardes/restaurer', { id: 'x', pin: '1234' })).statut, 401);
});

test('copie du jour : prise avant la première écriture qui suit, une seule par jour', async () => {
  assert.deepEqual((await api('GET', '/sauvegardes', null, awa.jeton)).sauvegardes, []);
  assert.deepEqual((await envoyer(awa.jeton, [produit('p1', 'Riz'), produit('p2', 'Huile'), el('clients', 'k1', { id: 'k1', nom: 'Bako' })])).refuses, []);
  assert.equal((await api('GET', '/sauvegardes', null, awa.jeton)).sauvegardes.length, 0); // rien à copier avant la toute première écriture
  assert.deepEqual((await envoyer(awa.jeton, [produit('p3', 'Sucre')])).refuses, []); // copie du jour : l'état avant cette écriture (3 éléments)
  assert.deepEqual((await envoyer(awa.jeton, [produit('p4', 'Sel')])).refuses, []);
  const l = (await api('GET', '/sauvegardes', null, awa.jeton)).sauvegardes;
  assert.equal(l.length, 1);
  assert.equal(l[0].raison, 'auto');
  assert.equal(l[0].nbElements, 3);
  assert.deepEqual(l[0].details, { produits: 2, clients: 1 });
});

test('copie manuelle : une par minute', async () => {
  const a = await api('POST', '/sauvegardes', { action: 'creer' }, awa.jeton);
  assert.equal(a.statut, 201, JSON.stringify(a));
  assert.equal(a.sauvegarde.raison, 'manuelle');
  assert.equal(a.sauvegarde.nbElements, 5);
  assert.equal((await api('POST', '/sauvegardes', { action: 'creer' }, awa.jeton)).statut, 429);
  assert.equal((await api('POST', '/sauvegardes', { action: 'autre' }, awa.jeton)).statut, 400);
});

test('restauration : PIN exigé, copie d’un autre commerce refusée, données remises comme dans la copie, retour en arrière possible', async () => {
  const manuelle = (await api('GET', '/sauvegardes', null, awa.jeton)).sauvegardes.find((s) => s.raison === 'manuelle');
  // Après la copie : un article supprimé, un autre ajouté, un client modifié
  await envoyer(awa.jeton, [{ type: 'produits', id: 'p1', supprime: true, modifieLe: maintenant() }, produit('p9', 'Erreur'), el('clients', 'k1', { id: 'k1', nom: 'Modifié' })]);
  const avant = await vivants(awa.jeton);
  assert.ok(!avant['produits:p1'] && avant['produits:p9'] && avant['clients:k1'].nom === 'Modifié');
  // Contrôles
  assert.equal((await api('POST', '/sauvegardes/restaurer', { id: manuelle.id, pin: '0000' }, awa.jeton)).statut, 401);
  assert.equal((await api('POST', '/sauvegardes/restaurer', { id: manuelle.id }, awa.jeton)).statut, 400);
  assert.equal((await api('POST', '/sauvegardes/restaurer', { id: manuelle.id, pin: '1234' }, bako.jeton)).statut, 404); // copie d'un autre commerce
  assert.equal((await api('POST', '/sauvegardes/restaurer', { id: 'inconnue', pin: '1234' }, awa.jeton)).statut, 404);
  // Restauration
  const heure = (await api('GET', '/donnees', null, awa.jeton)).heure;
  const r = await api('POST', '/sauvegardes/restaurer', { id: manuelle.id, pin: '1234' }, awa.jeton);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.restaures, 5);
  assert.equal(r.supprimes, 1);
  const apres = await vivants(awa.jeton);
  assert.equal(apres['produits:p1'].nom, 'Riz');
  assert.ok(!apres['produits:p9']);
  assert.equal(apres['clients:k1'].nom, 'Bako');
  assert.equal(Object.keys(apres).filter((k) => k.startsWith('produits:')).length, 4);
  // Les appareils reçoivent la restauration (suppression comprise) à la prochaine synchronisation
  const nouveautes = (await api('GET', '/donnees?depuis=' + encodeURIComponent(heure), null, awa.jeton)).elements;
  assert.ok(nouveautes.some((e) => e.type === 'produits' && e.id === 'p9' && e.supprime));
  assert.ok(nouveautes.some((e) => e.type === 'produits' && e.id === 'p1' && !e.supprime));
  // La copie « avant restauration » permet de revenir en arrière
  const liste = (await api('GET', '/sauvegardes', null, awa.jeton)).sauvegardes;
  const avantResto = liste.find((s) => s.raison === 'avant-restauration');
  assert.ok(avantResto);
  assert.equal((await api('POST', '/sauvegardes/restaurer', { id: avantResto.id, pin: '1234' }, awa.jeton)).ok, true);
  const retour = await vivants(awa.jeton);
  assert.ok(!retour['produits:p1'] && retour['produits:p9'] && retour['clients:k1'].nom === 'Modifié');
});

test('le commerce voisin n’est pas touché', async () => {
  assert.deepEqual((await api('GET', '/sauvegardes', null, bako.jeton)).sauvegardes, []);
  assert.deepEqual(Object.keys(await vivants(bako.jeton)).filter((k) => k.startsWith('produits:')), []);
});
