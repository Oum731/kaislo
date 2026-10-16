// Notifications push : abonnement des appareils, signal signé (VAPID), lecture du texte par l'appareil. Lancer : npm test
// NotificationsMode=test : aucun signal n'est envoyé aux services des navigateurs ; l'en-tête qui serait envoyé est noté dans la table notifications.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5990 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-push-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, gerant;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/dG9rZW4tZGUtdGVzdA:APA91bExemple';
const maintenant = () => new Date().toISOString();

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\nCleCron=cle-cron-de-test-0123456789\nEmailEquipe=equipe@kaislo.test\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Awa Push', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712345651' },
    gerant: { nom: 'Awa', telephone: '0712345652', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const r = await api('POST', '/donnees', { elements: [
    { type: 'reglages', id: 'commerce', modifieLe: maintenant(), contenu: { nom: 'Chez Awa Push', pays: 'CI', notifications: { email: false } } },
    { type: 'categories', id: 'c1', modifieLe: maintenant(), contenu: { id: 'c1', nom: 'Épicerie' } },
    { type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Riz', prix: 2500, categorieId: 'c1', actif: true, enLigne: true, groupes: [] } },
  ] }, gerant.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('abonnement : réservé au gérant, adresse limitée aux services des navigateurs', async () => {
  assert.equal((await api('POST', '/push/abonner', { endpoint: ENDPOINT })).statut, 401);
  for (const mauvais of ['', 'http://fcm.googleapis.com/x', 'https://exemple.com/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com.evil.com/x', 'https://user@fcm.googleapis.com/x', 'https://evil.com/?https://fcm.googleapis.com/']) {
    assert.equal((await api('POST', '/push/abonner', { endpoint: mauvais }, gerant.jeton)).statut, 400, mauvais);
  }
  for (const bon of [ENDPOINT, 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://web.push.apple.com/QGxyz', 'https://wns2-par02p.notify.windows.com/w/?token=abc']) {
    assert.equal((await api('POST', '/push/abonner', { endpoint: bon, appareil: 'Test' }, gerant.jeton)).ok, true, bon);
  }
  assert.equal(sql('SELECT COUNT(*) AS n FROM abonnements_push')[0].n, 4);
  // Même appareil deux fois : une seule ligne
  await api('POST', '/push/abonner', { endpoint: ENDPOINT }, gerant.jeton);
  assert.equal(sql('SELECT COUNT(*) AS n FROM abonnements_push')[0].n, 4);
  await api('POST', '/push/desabonner', { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/abc' }, gerant.jeton);
  await api('POST', '/push/desabonner', { endpoint: 'https://web.push.apple.com/QGxyz' }, gerant.jeton);
  await api('POST', '/push/desabonner', { endpoint: 'https://wns2-par02p.notify.windows.com/w/?token=abc' }, gerant.jeton);
  assert.equal(sql('SELECT COUNT(*) AS n FROM abonnements_push')[0].n, 1);
});

test('état : clé publique VAPID (65 octets, point non compressé) stable, appareils comptés', async () => {
  const e = await api('GET', '/notifications', null, gerant.jeton);
  assert.equal(e.push.appareils, 1);
  const cle = Buffer.from(e.push.clePublique, 'base64url');
  assert.equal(cle.length, 65);
  assert.equal(cle[0], 4);
  assert.equal((await api('GET', '/notifications', null, gerant.jeton)).push.clePublique, e.push.clePublique, 'la même clé à chaque appel');
});

test('l’essai envoie un signal signé : la signature ES256 se vérifie avec la clé publique', async () => {
  const r = await api('POST', '/notifications/tester', null, gerant.jeton);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.resultats, [{ canal: 'push', statut: 'envoye' }], 'e-mail coupé, seul l’appareil reçoit');
  const note = sql("SELECT detail FROM notifications WHERE canal = 'push'")[0].detail;
  const m = note.match(/Authorization: vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)/);
  assert.ok(m, note);
  const [, entete, charge, signature, cle] = m;
  assert.deepEqual(JSON.parse(Buffer.from(entete, 'base64url')), { typ: 'JWT', alg: 'ES256' });
  const contenu = JSON.parse(Buffer.from(charge, 'base64url'));
  assert.equal(contenu.aud, 'https://fcm.googleapis.com');
  assert.equal(contenu.sub, 'mailto:equipe@kaislo.test');
  assert.ok(contenu.exp > Date.now() / 1000 && contenu.exp <= Date.now() / 1000 + 13 * 3600);
  const point = Buffer.from(cle, 'base64url');
  const publique = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: point.subarray(1, 33).toString('base64url'), y: point.subarray(33).toString('base64url') }, format: 'jwk' });
  const brute = Buffer.from(signature, 'base64url');
  assert.equal(brute.length, 64);
  assert.equal(crypto.verify('sha256', Buffer.from(entete + '.' + charge), { key: publique, dsaEncoding: 'ieee-p1363' }, brute), true, 'signature valide');
  assert.match(note, /Résumé du soir · Chez Awa Push/);
});

test('l’appareil lit le texte à l’arrivée du signal, une seule fois ; appareil inconnu refusé', async () => {
  const premier = await api('POST', '/push/message', { endpoint: ENDPOINT });
  assert.equal(premier.ok, true);
  assert.equal(premier.messages.length, 1);
  assert.match(premier.messages[0].titre, /Résumé du soir/);
  assert.equal(premier.messages[0].url, '/app/');
  // Déjà lu : le signal suivant affiche une notification générale, sans texte du commerce
  const second = await api('POST', '/push/message', { endpoint: ENDPOINT });
  assert.deepEqual(second.messages.map((x) => x.titre), ['Kaislo']);
  assert.equal((await api('POST', '/push/message', { endpoint: 'https://fcm.googleapis.com/fcm/send/inconnu' })).statut, 404);
  assert.equal((await api('POST', '/push/message', { endpoint: 'https://exemple.com/x' })).statut, 404);
});

test('nouvelle commande : notification push immédiate avec le client et le total', async () => {
  const b = await api('POST', '/boutique', { actif: true, conditionsAcceptees: true, slug: 'chez-awa-push', whatsapp: '0712345653', description: '', livraison: '' }, gerant.jeton);
  assert.equal(b.ok, true, JSON.stringify(b));
  const r = await api('POST', '/public/commande', { b: 'chez-awa-push', client: { nom: 'Koffi', telephone: '0701020304', adresse: 'Cocody Angré' }, lignes: [{ produitId: 'p1', quantite: 2 }] });
  assert.equal(r.statut, 201, JSON.stringify(r));
  await attendre(400);
  const m = await api('POST', '/push/message', { endpoint: ENDPOINT });
  assert.equal(m.messages[0].titre, 'Nouvelle commande n° 1');
  assert.match(m.messages[0].texte, /Koffi · 5 000 FCFA/);
});
