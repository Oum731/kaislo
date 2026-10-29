// Annuaire kaislo.com/boutiques : une boutique créée y apparaît dès qu'elle est active, publique et a un article en ligne ;
// le gérant sait pourquoi elle n'y est pas (raisonAnnuaire). Chaque pays a sa liste.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-annuaire-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur;
const maintenant = () => new Date().toISOString();
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const liste = async (pays) => (await api('GET', '/public/boutiques?pays=' + pays));
const slugs = async (pays) => (await liste(pays)).boutiques.map((b) => b.slug);
const produit = (id, extra = {}) => ({ type: 'produits', id, modifieLe: maintenant(), contenu: { id, nom: 'Article ' + id, prix: 1000, actif: true, groupes: [], ...extra } });

async function creer(nom, tel, pays, slug) {
  const g = await api('POST', '/inscription', {
    commerce: { nom, type: 'boutique', pays, ville: pays === 'MA' ? 'Casablanca' : 'Abidjan', quartier: 'Centre', telephone: tel },
    gerant: { nom: 'Gérant', telephone: tel.slice(0, 2) + String(Number(tel.slice(2)) + 500), pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(g.statut, 201, JSON.stringify(g));
  const publier = (extra = {}) => api('POST', '/boutique', { actif: true, slug, whatsapp: tel, conditionsAcceptees: true, ...extra }, g.jeton);
  return { jeton: g.jeton, publier, ecrire: (elements) => api('POST', '/donnees', { elements }, g.jeton), etat: async () => (await api('GET', '/boutique', null, g.jeton)).boutique };
}

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('une boutique créée sans article en ligne n’est pas dans la liste, et le gérant sait pourquoi', async () => {
  const ci = await creer('Chez Awa', '0712345991', 'CI', 'chez-awa-liste');
  assert.deepEqual((await ci.ecrire([produit('p1')])).refuses, []); // article créé, mais pas « Vendre en ligne »
  assert.equal((await ci.publier()).ok, true);
  assert.deepEqual(await slugs('CI'), []);
  const e = await ci.etat();
  assert.equal(e.dansAnnuaire, false);
  assert.equal(e.raisonAnnuaire, 'aucunArticle');
  assert.equal(Object.keys((await liste('CI')).paysDisponibles).length, 0, 'un pays sans boutique visible n’est pas proposé');
  // Il publie un article : la boutique apparaît tout de suite
  assert.deepEqual((await ci.ecrire([produit('p1', { enLigne: true })])).refuses, []);
  assert.deepEqual(await slugs('CI'), ['chez-awa-liste']);
  assert.equal((await ci.etat()).dansAnnuaire, true);
  assert.equal((await ci.etat()).raisonAnnuaire, '');
});

test('boutique désactivée ou masquée : absente, avec la raison', async () => {
  const ci = await creer('Boutique Cachée', '0712345992', 'CI', 'boutique-cachee');
  await ci.ecrire([produit('p1', { enLigne: true })]);
  await ci.publier();
  assert.ok((await slugs('CI')).includes('boutique-cachee'));
  await ci.publier({ publique: false });
  assert.ok(!(await slugs('CI')).includes('boutique-cachee'));
  assert.equal((await ci.etat()).raisonAnnuaire, 'privee');
  await ci.publier({ publique: true, actif: false });
  assert.ok(!(await slugs('CI')).includes('boutique-cachee'));
  assert.equal((await ci.etat()).raisonAnnuaire, 'desactivee');
  await ci.publier({ publique: true, actif: true });
  assert.ok((await slugs('CI')).includes('boutique-cachee'), 'réactivée : revenue dans la liste');
});

test('chaque pays a sa liste, et les pays qui ont des boutiques sont proposés', async () => {
  const ma = await creer('Épicerie Atlas', '0612345993', 'MA', 'epicerie-atlas');
  await ma.ecrire([produit('p1', { enLigne: true })]);
  await ma.publier();
  assert.deepEqual(await slugs('MA'), ['epicerie-atlas']);
  assert.ok(!(await slugs('CI')).includes('epicerie-atlas'));
  assert.ok(!(await slugs('MA')).includes('chez-awa-liste'));
  const dispo = (await liste('FR')).paysDisponibles;
  assert.ok(dispo.MA >= 1 && dispo.CI >= 1, JSON.stringify(dispo));
  assert.deepEqual((await liste('FR')).boutiques, [], 'un visiteur d’un pays sans boutique ne voit rien, mais peut choisir un autre pays');
});

test('un article sans prix ou sans nom ne rend pas la boutique visible', async () => {
  const ci = await creer('Boutique Vide', '0712345994', 'CI', 'boutique-vide');
  await ci.ecrire([produit('p1', { enLigne: true, prix: undefined })]);
  await ci.publier();
  assert.ok(!(await slugs('CI')).includes('boutique-vide'));
  assert.equal((await ci.etat()).raisonAnnuaire, 'aucunArticle');
});
