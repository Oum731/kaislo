// Tests du carnet des retours utilisateurs (Espace Amorac) : création, modification, classement des fonctions demandées, droits.
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
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-retours-'));
const fichierBase = path.join(dossier, 'test.sqlite');
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, support, commerceA, commerceB;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}
const inscrire = (nom, tel) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  commerceA = await inscrire('Épicerie Awa', '0712345701');
  commerceB = await inscrire('Boutique Bako', '0712345711');
  assert.equal(commerceA.ok && commerceB.ok, true);
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.equal(install.ok, true, JSON.stringify(install));
  admin = install.jeton;
  const eq = await api('POST', '/admin/equipe', { nom: 'Aide', email: 'aide@kaislo.test', role: 'support', motDePasse: 'MotDePasse2026' }, admin);
  assert.equal(eq.ok, true, JSON.stringify(eq));
  const cx = await api('POST', '/admin/connexion', { email: 'aide@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.equal(cx.ok, true, JSON.stringify(cx));
  support = cx.jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

const retour = (extra) => ({ action: 'creer', canal: 'whatsapp', type: 'manque', texte: 'Il me faut ça', ...extra });

test('le carnet est réservé à l’équipe Amorac', async () => {
  assert.equal((await api('GET', '/admin/retours')).statut, 401);
  assert.equal((await api('GET', '/admin/retours', null, commerceA.jeton)).statut, 401);
  assert.equal((await api('POST', '/admin/retours', retour({ nom: 'X' }), commerceA.jeton)).statut, 401);
});

test('noter un retour : commerce ou nom obligatoire, valeurs contrôlées', async () => {
  assert.equal((await api('POST', '/admin/retours', retour({}), admin)).statut, 400); // ni commerce ni nom
  assert.equal((await api('POST', '/admin/retours', retour({ commerceId: 'inconnu' }), admin)).statut, 404);
  assert.equal((await api('POST', '/admin/retours', retour({ nom: 'Paulina', type: 'bizarre' }), admin)).statut, 400);
  assert.equal((await api('POST', '/admin/retours', retour({ nom: 'Paulina', canal: 'pigeon' }), admin)).statut, 400);
  assert.equal((await api('POST', '/admin/retours', retour({ nom: 'Paulina', statut: 'fini' }), admin)).statut, 400);
  assert.equal((await api('POST', '/admin/retours', retour({ nom: 'Paulina', texte: '' }), admin)).statut, 400);
  const ok = await api('POST', '/admin/retours', retour({ commerceId: commerceA.commerce.id, fonction: 'Facture PDF', texte: 'Je voudrais envoyer une facture PDF à mes clients' }), admin);
  assert.equal(ok.statut, 201, JSON.stringify(ok));
  assert.equal(ok.retour.commerce, 'Épicerie Awa');
  assert.equal(ok.retour.statut, 'recu');
  assert.equal(ok.retour.creePar, 'Équipe');
});

test('classement : un commerce qui répète ne compte qu’une fois, les accents et majuscules sont ignorés, les refusés sortent', async () => {
  await api('POST', '/admin/retours', retour({ commerceId: commerceA.commerce.id, fonction: 'facture  pdf' }), admin); // même commerce : 2e demande
  await api('POST', '/admin/retours', retour({ commerceId: commerceB.commerce.id, fonction: 'FACTURE PDF' }), admin);
  await api('POST', '/admin/retours', retour({ nom: 'Paulina Ngandza', fonction: 'Gestion des fournisseurs' }), admin);
  await api('POST', '/admin/retours', retour({ nom: 'Paulina Ngandza', type: 'aime', texte: 'J’aime la caisse rapide' }), admin);
  const refuse = await api('POST', '/admin/retours', retour({ nom: 'Jean', fonction: 'Réseau social', statut: 'refuse' }), admin);
  assert.equal(refuse.statut, 201);
  const l = await api('GET', '/admin/retours', null, admin);
  assert.equal(l.retours.length, 6);
  assert.equal(l.comptes.recu, 5);
  assert.equal(l.comptes.refuse, 1);
  assert.deepEqual(l.classement.map((c) => [c.demandeurs, c.demandes]), [[2, 3], [1, 1]]);
  assert.match(l.classement[0].fonction, /facture/i);
  assert.equal(l.classement.some((c) => /réseau/i.test(c.fonction)), false);
});

test('modifier le statut, filtrer par commerce, le support ne supprime pas', async () => {
  const l = await api('GET', '/admin/retours', null, support);
  assert.equal(l.ok, true);
  const premier = l.retours.find((r) => /facture/i.test(r.fonction));
  const m = await api('POST', '/admin/retours', { ...premier, action: 'modifier', statut: 'prevu' }, support);
  assert.equal(m.statut, 200, JSON.stringify(m));
  assert.equal(m.retour.statut, 'prevu');
  assert.equal((await api('GET', '/admin/retours', null, admin)).classement[0].statut, 'prevu');
  const deA = await api('GET', `/admin/retours?commerceId=${commerceA.commerce.id}`, null, admin);
  assert.equal(deA.retours.length, 2);
  assert.deepEqual(deA.classement, []);
  assert.equal((await api('POST', '/admin/retours', { action: 'modifier', id: 'rt-inconnu', nom: 'X', texte: 'abc' }, admin)).statut, 404);
  assert.equal((await api('POST', '/admin/retours', { action: 'supprimer', id: premier.id }, support)).statut, 403);
  assert.equal((await api('POST', '/admin/retours', { action: 'supprimer', id: premier.id }, admin)).ok, true);
  assert.equal((await api('GET', '/admin/retours', null, admin)).retours.length, 5);
});
