// Boutique : le logo (ou la photo de profil) choisi par le gérant est visible du public : page, annuaire, image et page pour Google.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-logo-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, gerant;
const maintenant = () => new Date().toISOString();
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
// Un vrai PNG de 1 pixel
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const DATA_URL = 'data:image/png;base64,' + PNG_BASE64;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const ecrire = (elements) => api('POST', '/donnees', { elements }, gerant.jeton);
const reglages = (extra) => ({ type: 'reglages', id: 'commerce', modifieLe: maintenant(), contenu: { nom: 'Boutique Logo', ville: 'Abidjan', type: 'boutique', ...extra } });

before(async () => {
  fs.mkdirSync(path.join(dossier, 'boutique'));
  fs.writeFileSync(path.join(dossier, 'boutique', 'index.html'), '<!DOCTYPE html><html><head><title>Boutique</title><meta name="robots" content="noindex, nofollow"><meta property="og:image" content="x"></head><body>vitrine</body></html>');
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\nDossierSite=${dossier}\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Boutique Logo', type: 'boutique', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712345981' },
    gerant: { nom: 'Awa', telephone: '0712345982', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const r = await ecrire([{ type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Pagne', prix: 2500, actif: true, enLigne: true, groupes: [] } }]);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
  const b = await api('POST', '/boutique', { actif: true, slug: 'boutique-logo', whatsapp: '0712345982', conditionsAcceptees: true }, gerant.jeton);
  assert.equal(b.ok, true, JSON.stringify(b));
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('sans logo : la boutique n’en annonce pas', async () => {
  assert.equal((await api('GET', '/public/boutique?b=boutique-logo')).boutique.logo, null);
  assert.equal((await api('GET', '/public/boutiques?pays=CI')).boutiques[0].logo, null);
});

test('logo choisi mais image pas encore arrivée sur le serveur : pas de logo cassé', async () => {
  assert.deepEqual((await ecrire([reglages({ logo: 'img_logo1' })])).refuses, []);
  assert.equal((await api('GET', '/public/boutique?b=boutique-logo')).boutique.logo, null);
});

test('le logo envoyé par le gérant apparaît sur la page, dans l’annuaire et se télécharge', async () => {
  assert.deepEqual((await ecrire([{ type: 'images', id: 'img_logo1', modifieLe: maintenant(), contenu: { dataUrl: DATA_URL } }])).refuses, []);
  assert.equal((await api('GET', '/public/boutique?b=boutique-logo')).boutique.logo, 'img_logo1');
  const annuaire = await api('GET', '/public/boutiques?pays=CI');
  assert.equal(annuaire.boutiques.find((b) => b.slug === 'boutique-logo').logo, 'img_logo1');
  const r = await fetch(U + '/public/boutique-image?b=boutique-logo&i=img_logo1');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await r.arrayBuffer()).toString('base64'), PNG_BASE64);
});

test('seul le logo et les photos d’articles publiés sont téléchargeables', async () => {
  assert.deepEqual((await ecrire([{ type: 'images', id: 'img_secret', modifieLe: maintenant(), contenu: { dataUrl: DATA_URL } }])).refuses, []);
  assert.equal((await fetch(U + '/public/boutique-image?b=boutique-logo&i=img_secret')).status, 404);
  assert.equal((await fetch(U + '/public/boutique-image?b=boutique-logo&i=img_logo1')).status, 200);
});

test('changer ou retirer le logo : la boutique suit', async () => {
  assert.deepEqual((await ecrire([{ type: 'images', id: 'img_logo2', modifieLe: maintenant(), contenu: { dataUrl: DATA_URL } }, reglages({ logo: 'img_logo2' })])).refuses, []);
  assert.equal((await api('GET', '/public/boutique?b=boutique-logo')).boutique.logo, 'img_logo2');
  assert.equal((await fetch(U + '/public/boutique-image?b=boutique-logo&i=img_logo1')).status, 404, 'l’ancien logo n’est plus public');
  assert.deepEqual((await ecrire([reglages({ logo: null })])).refuses, []);
  assert.equal((await api('GET', '/public/boutique?b=boutique-logo')).boutique.logo, null);
});

test('page pour Google : le logo est dans les données structurées et sert d’image de partage', async () => {
  assert.deepEqual((await ecrire([reglages({ logo: 'img_logo1' })])).refuses, []);
  const r = await fetch(U + '/nimporte-quoi?kaislo-page=boutique&b=boutique-logo');
  const html = await r.text();
  assert.equal(r.status, 200);
  assert.match(html, /"logo":"https:\/\/[^"]*boutique-image\?b=boutique-logo&i=img_logo1"/);
  assert.match(html, /<img src="https:\/\/[^"]*i=img_logo1" alt="Logo Boutique Logo"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/[^"]*i=img_logo1"/, 'sans photo d’article, le logo sert d’image de partage');
});

test('adresse d’image publique : fonctionne aussi pour les aperçus de liens (HEAD, taille annoncée, affichage direct)', async () => {
  const get = await fetch(U + '/public/boutique-image?b=boutique-logo&i=img_logo1', { headers: { 'User-Agent': 'WhatsApp/2.23.20.0 A' } });
  assert.equal(get.status, 200);
  assert.equal(get.headers.get('content-type'), 'image/png');
  assert.equal(get.headers.get('content-length'), String(Buffer.from(PNG_BASE64, 'base64').length));
  assert.match(get.headers.get('content-disposition'), /^inline/);
  // Les robots d'aperçu (WhatsApp, Facebook…) testent souvent avec HEAD : même réponse, sans le corps
  const head = await fetch(U + '/public/boutique-image?b=boutique-logo&i=img_logo1', { method: 'HEAD', headers: { 'User-Agent': 'WhatsApp/2.23.20.0 A' } });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-type'), 'image/png');
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  // Image inconnue : toujours 404, en GET comme en HEAD
  assert.equal((await fetch(U + '/public/boutique-image?b=boutique-logo&i=img_nexistepas', { method: 'HEAD' })).status, 404);
});
