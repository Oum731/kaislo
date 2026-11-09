// Alertes de l'équipe Amorac : notification sur ses appareils à chaque nouveau commerce, message d'un commerce et question d'un visiteur.
// NotificationsMode=test : aucun signal n'est envoyé aux navigateurs ; le signal préparé est noté dans la table notifications.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-alertes-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, admin, gerant;
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/dG9rZW4tZXF1aXBl:APA91bExemple';

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
// Les alertes partent après la réponse : on attend qu'elles soient notées
async function alertes(type, nombre) {
  for (let i = 0; i < 40; i++) {
    const l = sql(`SELECT detail, statut, canal FROM notifications WHERE commerce_id = 'amorac' AND type = '${type}'`);
    if (l.length >= nombre) return l;
    await attendre(100);
  }
  return sql(`SELECT detail, statut, canal FROM notifications WHERE commerce_id = 'amorac' AND type = '${type}'`);
}
const inscrire = (nom, tel) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\nEmailEquipe=equipe@kaislo.test\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.equal(install.ok, true, JSON.stringify(install));
  admin = install.jeton;
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('abonnement des appareils de l’équipe : réservé à l’équipe, adresse limitée aux services des navigateurs', async () => {
  assert.equal((await api('GET', '/admin/push')).statut, 401);
  const etat = await api('GET', '/admin/push', null, admin);
  assert.equal(etat.appareils, 0);
  assert.equal(Buffer.from(etat.clePublique, 'base64url').length, 65);
  assert.equal((await api('POST', '/admin/push/abonner', { endpoint: ENDPOINT }, null)).statut, 401);
  assert.equal((await api('POST', '/admin/push/abonner', { endpoint: 'https://exemple.com/x' }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/push/abonner', { endpoint: ENDPOINT, appareil: 'Téléphone de Souro' }, admin)).ok, true);
  assert.equal((await api('POST', '/admin/push/abonner', { endpoint: ENDPOINT }, admin)).ok, true); // même appareil : une seule ligne
  assert.equal((await api('GET', '/admin/push', null, admin)).appareils, 1);
});

test('un nouveau commerce : l’équipe est prévenue sur ses appareils', async () => {
  gerant = await inscrire('Chez Awa Alertes', '0712345661');
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const l = await alertes('inscription', 1);
  assert.equal(l.length, 1);
  assert.equal(l[0].canal, 'push');
  assert.equal(l[0].statut, 'envoye');
  assert.match(l[0].detail, /Nouveau commerce : Chez Awa Alertes/);
});

test('un message d’un commerce et une question d’un visiteur', async () => {
  assert.equal((await api('POST', '/messages', { texte: 'Bonjour, comment changer mon numéro ?' }, gerant.jeton)).statut, 201);
  const m = await alertes('message', 1);
  assert.match(m[0].detail, /Message de Chez Awa Alertes — Bonjour, comment changer mon numéro/);
  assert.equal((await api('POST', '/contact', { nom: 'Visiteur', contact: 'visiteur@exemple.com', texte: 'Quels sont vos tarifs ?', page: '/tarifs/' })).statut, 201);
  const v = await alertes('visiteur', 1);
  assert.match(v[0].detail, /Question d’un visiteur : Visiteur — Quels sont vos tarifs/);
});

test('après désabonnement, plus aucune alerte sur cet appareil', async () => {
  assert.equal((await api('POST', '/admin/push/desabonner', { endpoint: ENDPOINT }, admin)).ok, true);
  assert.equal((await api('GET', '/admin/push', null, admin)).appareils, 0);
  assert.equal((await inscrire('Chez Bako Alertes', '0712345671')).statut, 201);
  await attendre(600);
  assert.equal(sql("SELECT COUNT(*) AS n FROM notifications WHERE commerce_id = 'amorac' AND type = 'inscription'")[0].n, 1);
});
