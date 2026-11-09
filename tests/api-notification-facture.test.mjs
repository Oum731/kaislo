// Le gérant est prévenu quand une facture ou un avoir est émis : e-mail et notification sur ses appareils, selon ses réglages ; l'application reçoit « derniereFacture ».
// NotificationsMode=test : rien n'est envoyé ; les messages préparés sont notés dans la table notifications.
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
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-notif-facture-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, admin, avec, sans;
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/dG9rZW4tZmFjdHVyZQ:APA91bExemple';
const maintenant = () => new Date().toISOString();

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
async function notes(commerceId, type, nombre) {
  const requete = `SELECT canal, statut, detail FROM notifications WHERE commerce_id = '${commerceId}' AND type = '${type}' ORDER BY cree_le`;
  for (let i = 0; i < 40; i++) {
    const l = sql(requete);
    if (l.length >= nombre) return l;
    await attendre(100);
  }
  return sql(requete);
}
const inscrire = (nom, tel) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays: 'MA', ville: 'Casablanca', quartier: 'Maarif', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  avec = await inscrire('Épicerie Awa', '0612345801');
  sans = await inscrire('Boutique Sans Canal', '0612345811');
  assert.equal(avec.statut, 201, JSON.stringify(avec));
  // « avec » : e-mail du commerce renseigné et un appareil abonné aux notifications
  const r = await api('POST', '/donnees', { elements: [{ type: 'reglages', id: 'commerce', modifieLe: maintenant(), contenu: { nom: 'Épicerie Awa', pays: 'MA', email: 'awa@exemple.com', notifications: { email: true } } }] }, avec.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
  assert.equal((await api('POST', '/push/abonner', { endpoint: ENDPOINT, appareil: 'Téléphone d’Awa' }, avec.jeton)).ok, true);
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  admin = install.jeton;
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

const payer = (commerce, montant) => api('POST', '/admin/paiement', { commerceId: commerce.commerce.id, mois: 1, postes: 1, montant, moyen: 'Virement' }, admin);

test('un paiement validé : e-mail et notification au gérant, avec le numéro et le chemin pour télécharger', async () => {
  assert.equal((await payer(avec, 1200)).ok, true);
  const l = await notes(avec.commerce.id, 'facture', 2);
  const canaux = l.map((x) => x.canal).sort();
  assert.deepEqual(canaux, ['email', 'push']);
  const email = l.find((x) => x.canal === 'email');
  assert.match(email.detail, /awa@exemple\.com/);
  assert.match(email.detail, /Kaislo : votre facture FAC-\d{4}-0001/);
  assert.match(email.detail, /1 200,00 DH/);
  assert.match(email.detail, /Mes factures/);
  const push = l.find((x) => x.canal === 'push');
  assert.match(push.detail, /Votre facture est disponible — FAC-\d{4}-0001 · 1 200,00 DH/);
  assert.ok(l.every((x) => x.statut === 'envoye'));
});

test('sans e-mail ni appareil : rien n’est envoyé, le paiement et la facture passent quand même', async () => {
  assert.equal((await payer(sans, 600)).ok, true);
  await attendre(500);
  assert.equal(sql(`SELECT COUNT(*) AS n FROM notifications WHERE commerce_id = '${sans.commerce.id}' AND type = 'facture'`)[0].n, 0);
  assert.equal((await api('GET', '/factures', null, sans.jeton)).factures.length, 1);
});

test('un avoir prévient aussi le gérant', async () => {
  const f = (await api('GET', '/factures', null, avec.jeton)).factures[0];
  const a = await api('POST', '/admin/avoir', { factureId: f.id, montant: 200, motif: 'Geste commercial' }, admin);
  assert.equal(a.statut, 201, JSON.stringify(a));
  const l = await notes(avec.commerce.id, 'avoir', 2);
  assert.deepEqual(l.map((x) => x.canal).sort(), ['email', 'push']);
  assert.match(l.find((x) => x.canal === 'email').detail, /Kaislo : votre avoir AV-\d{4}-0001/);
  assert.match(l.find((x) => x.canal === 'push').detail, /Votre avoir est disponible/);
});

test('l’application reçoit la dernière facture ou le dernier avoir (gérant seulement)', async () => {
  const d = await api('GET', '/donnees', null, avec.jeton);
  assert.equal(d.derniereFacture.type, 'avoir');
  assert.match(d.derniereFacture.numero, /^AV-/);
  assert.equal(d.derniereFacture.totalTtc, -200);
  const e = await api('GET', '/donnees', null, sans.jeton);
  assert.equal(e.derniereFacture.type, 'facture');
  assert.equal(e.derniereFacture.totalTtc, 600);
  // Un commerce sans facture : null
  const neuf = await inscrire('Boutique Neuve', '0612345821');
  assert.equal((await api('GET', '/donnees', null, neuf.jeton)).derniereFacture, null);
});
