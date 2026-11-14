// Rappels d'abonnement : un message par palier avant la fin de l'essai, du délai pour payer et de l'échéance
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
const CLE = 'cle-cron-de-test-0123';
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-rappels-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, gerant;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const exec = (requete) => execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); $p->exec(${JSON.stringify(requete)});`]);
const dans = (jours) => new Date(Date.now() + jours * 86400000 + 3600000).toISOString().slice(0, 19) + 'Z';
const cron = () => api('POST', `/cron/notifications?cle=${CLE}`);
const rappels = () => sql("SELECT canal, detail FROM notifications WHERE type = 'rappel' ORDER BY rowid").filter((n) => n.canal === 'email');
const regler = (setSql) => exec(`UPDATE commerces SET ${setSql} WHERE id = '${gerant.commerce.id}'`);
const el = (type, id, contenu) => ({ type, id, contenu, modifieLe: new Date().toISOString() });

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nDefi=non\nNotificationsMode=test\nCleCron=${CLE}\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Awa Rappels', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712349001' },
    gerant: { nom: 'Awa', telephone: '0712349002', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const r = await api('POST', '/donnees', { elements: [el('reglages', 'commerce', { nom: 'Chez Awa Rappels', email: 'awa@exemple.com', pays: 'CI', notifications: { resume: false } })] }, gerant.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('essai : rien à 20 jours, un rappel à 7 jours, pas de doublon, puis à 3 jours et à 1 jour', async () => {
  regler(`statut = 'essai', essai_fin = '${dans(20)}', rappel_abo = NULL`);
  assert.equal((await cron()).rappels, 0);
  regler(`essai_fin = '${dans(6.5)}'`);
  const a = await cron();
  assert.equal(a.rappels, 1, JSON.stringify(a));
  assert.equal(rappels().length, 1);
  assert.match(rappels()[0].detail, /Votre essai Kaislo se termine dans 7 jours|Votre essai Kaislo se termine dans 6 jours/);
  assert.match(rappels()[0].detail, /Activer l’abonnement/);
  assert.equal((await cron()).rappels, 0); // même palier : pas de doublon
  regler(`essai_fin = '${dans(2.5)}'`);
  assert.equal((await cron()).rappels, 1);
  regler(`essai_fin = '${dans(0.5)}'`);
  assert.equal((await cron()).rappels, 1);
  assert.equal(rappels().length, 3);
});

test('essai terminé : un seul message « terminé » ; rien après 14 jours', async () => {
  regler(`essai_fin = '${dans(-0.5)}'`);
  assert.equal((await cron()).rappels, 1);
  assert.match(rappels().at(-1).detail, /Votre essai Kaislo est terminé/);
  assert.equal((await cron()).rappels, 0);
  regler(`essai_fin = '${dans(-20)}', rappel_abo = NULL`);
  assert.equal((await cron()).rappels, 0);
});

test('activation provisoire : rappels à 2 jours et à 1 jour ; abonnement payé : à 5 jours ; rien si le paiement est signalé ou si le commerce est suspendu', async () => {
  regler(`statut = 'actif', periode_provisoire = 1, periode_fin = '${dans(1.5)}', rappel_abo = NULL`);
  assert.equal((await cron()).rappels, 1);
  assert.match(rappels().at(-1).detail, /Payez avant le .* pour tout garder/);
  regler(`paiement_declare_le = '${dans(0)}', periode_fin = '${dans(0.5)}'`);
  assert.equal((await cron()).rappels, 0); // le gérant a déjà dit avoir payé
  regler(`paiement_declare_le = NULL, periode_provisoire = 0, periode_fin = '${dans(4.5)}', rappel_abo = NULL`);
  assert.equal((await cron()).rappels, 1);
  assert.match(rappels().at(-1).detail, /arrive à échéance/);
  regler(`periode_fin = '${dans(0.5)}', rappel_abo = NULL, statut = 'suspendu'`);
  assert.equal((await cron()).rappels, 0);
});
