// Discussion en direct client ↔ commerçant. Lancer : npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 6210 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-chat-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, gerant;
const V1 = 'a1'.repeat(16);
const V2 = 'b2'.repeat(16);

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\nEmailEquipe=equipe@kaislo.test\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Awa Chat', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712345751' },
    gerant: { nom: 'Awa', telephone: '0712345752', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const b = await api('POST', '/boutique', { actif: true, slug: 'chez-awa-chat', whatsapp: '0712345752', conditionsAcceptees: true }, gerant.jeton);
  assert.equal(b.ok, true, JSON.stringify(b));
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('le visiteur écrit, le commerçant répond, les messages se lisent des deux côtés', async () => {
  assert.equal((await api('GET', `/public/chat?b=chez-awa-chat&v=${V1}`)).messages.length, 0);
  const envoi = await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V1, nom: 'Koffi', texte: 'Bonjour, avez-vous du riz ?' });
  assert.equal(envoi.statut, 201, JSON.stringify(envoi));
  assert.equal(envoi.messages.length, 1);
  assert.equal(envoi.messages[0].auteur, 'client');

  const liste = await api('GET', '/chats', null, gerant.jeton);
  assert.equal(liste.chats.length, 1);
  assert.equal(liste.chats[0].nom, 'Koffi');
  assert.equal(liste.chats[0].nonLus, 1);
  assert.equal(liste.nonLus, 1);
  // Le compteur est aussi dans la synchronisation
  assert.equal((await api('GET', '/donnees?depuis=', null, gerant.jeton)).chatsNonLus, 1);

  const chat = liste.chats[0].id;
  const lu = await api('GET', `/chats/messages?chat=${chat}`, null, gerant.jeton);
  assert.equal(lu.messages.length, 1);
  assert.equal((await api('GET', '/chats', null, gerant.jeton)).nonLus, 0);

  const rep = await api('POST', '/chats/messages', { chat, texte: 'Oui, 2 500 FCFA le sac !' }, gerant.jeton);
  assert.equal(rep.statut, 201);
  assert.equal(rep.messages.at(-1).auteur, 'commerce');

  // Le visiteur voit la réponse ; reprise « depuis » = seulement le nouveau
  const cote = await api('GET', `/public/chat?b=chez-awa-chat&v=${V1}`);
  assert.equal(cote.messages.length, 2);
  const depuis = cote.messages[1].le;
  const suite = await api('GET', `/public/chat?b=chez-awa-chat&v=${V1}&depuis=${encodeURIComponent(depuis)}`);
  assert.ok(suite.messages.length >= 1 && suite.messages.every((m) => m.le >= depuis));
});

test('chaque visiteur a sa conversation, privée', async () => {
  await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V2, texte: 'Livrez-vous à Yopougon ?' });
  const un = await api('GET', `/public/chat?b=chez-awa-chat&v=${V1}`);
  const deux = await api('GET', `/public/chat?b=chez-awa-chat&v=${V2}`);
  assert.equal(deux.messages.length, 1);
  assert.ok(!un.messages.some((m) => m.texte.includes('Yopougon')));
  assert.equal((await api('GET', '/chats', null, gerant.jeton)).chats.length, 2);
  // Un identifiant invalide ou une autre boutique : rien
  assert.equal((await api('GET', '/public/chat?b=chez-awa-chat&v=zzz')).statut, 400);
  assert.equal((await api('GET', `/public/chat?b=inconnue&v=${V1}`)).statut, 404);
  // Le commerçant ne peut ouvrir que ses discussions
  assert.equal((await api('GET', '/chats/messages?chat=chinconnu', null, gerant.jeton)).statut, 404);
  assert.equal((await api('GET', '/chats')).statut, 401);
});

test('messages vides, trop longs, robots et blocage', async () => {
  assert.equal((await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V1, texte: '   ' })).statut, 400);
  assert.equal((await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V1, texte: 'x'.repeat(1001) })).statut, 400);
  const robot = await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V1, texte: 'spam', site: 'http://x' });
  assert.equal(robot.ok, true);
  assert.equal(sql("SELECT COUNT(*) AS n FROM chats_messages WHERE texte = 'spam'")[0].n, 0);

  const chat = (await api('GET', '/chats', null, gerant.jeton)).chats.find((c) => c.nom === 'Koffi').id;
  assert.equal((await api('POST', '/chats/bloquer', { chat, bloque: true }, gerant.jeton)).bloque, true);
  assert.equal((await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V1, texte: 'Encore moi' })).statut, 403);
  await api('POST', '/chats/bloquer', { chat, bloque: false }, gerant.jeton);
  assert.equal((await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V1, texte: 'Merci' })).statut, 201);
});

test('limite de messages et désactivation par le commerçant', async () => {
  let refus = 0;
  for (let i = 0; i < 25; i++) if ((await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V2, texte: 'message ' + i })).statut === 429) refus++;
  assert.ok(refus >= 1, 'au moins un message refusé après 20 en 10 minutes');

  const lue = await api('GET', '/boutique', null, gerant.jeton);
  assert.equal(lue.boutique.chat, true);
  await api('POST', '/boutique', { actif: true, slug: 'chez-awa-chat', whatsapp: '0712345752', chat: false }, gerant.jeton);
  assert.equal((await api('GET', '/public/boutique?b=chez-awa-chat')).boutique.chat, false);
  assert.equal((await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V1, texte: 'Allô ?' })).statut, 404);
});

test('le gérant est prévenu par notification push (au plus une toutes les 5 minutes)', async () => {
  await api('POST', '/boutique', { actif: true, slug: 'chez-awa-chat', whatsapp: '0712345752', chat: true }, gerant.jeton);
  const abo = await api('POST', '/push/abonner', { endpoint: 'https://fcm.googleapis.com/fcm/send/dG9rZW4tY2hhdA:APA91bExemple', appareil: 'Test' }, gerant.jeton);
  assert.equal(abo.ok, true);
  const V3 = 'c3'.repeat(16);
  await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V3, nom: 'Mariam', texte: 'Bonsoir' });
  await api('POST', '/public/chat', { b: 'chez-awa-chat', v: V3, texte: 'Vous êtes ouverts ?' });
  await attendre(300);
  const pushs = sql("SELECT titre, texte FROM push_messages WHERE tag = 'chat'");
  assert.equal(pushs.length, 1);
  assert.ok(pushs[0].titre.includes('Mariam'));
});
