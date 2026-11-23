// Suppression du compte : demandée par le gérant (code PIN redemandé), annulable pendant 30 jours, puis effacée par le planificateur ;
// les factures et paiements sont conservés.
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
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-suppression-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, awa, vendeur, admin;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const exec = (requete) => execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); $p->exec(${JSON.stringify(requete)});`]);
const el = (type, id, contenu) => ({ type, id, contenu, modifieLe: new Date().toISOString() });
const compte = (table) => sql(`SELECT COUNT(*) AS n FROM ${table} WHERE commerce_id = '${awa.commerce.id}'`)[0].n;

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nDefi=non\nNotificationsMode=test\nCleCron=${CLE}\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  awa = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Awa Suppression', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712348001' },
    gerant: { nom: 'Awa', telephone: '0712348002', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(awa.statut, 201, JSON.stringify(awa));
  const v = await api('POST', '/utilisateurs', { nom: 'Vendeur', telephone: '0712348003', pin: '4321', posteId: 'principal' }, awa.jeton);
  assert.equal(v.statut, 200, JSON.stringify(v));
  vendeur = await api('POST', '/connexion', { telephone: '0712348003', pays: 'CI', pin: '4321', appareil: 'Test' });
  const r = await api('POST', '/donnees', { elements: [el('clients', 'k1', { id: 'k1', nom: 'Koffi' }), el('produits', 'p1', { id: 'p1', nom: 'Riz', prix: 500, categorieId: 'c', actif: true, groupes: [] })] }, awa.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  admin = install.jeton;
  // Un paiement d'abonnement avec sa facture : à conserver
  assert.equal((await api('POST', '/admin/paiement', { commerceId: awa.commerce.id, mois: 1, postes: 1, montant: 5000, moyen: 'Wave' }, admin)).ok, true);
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('PIN incorrect ou vendeur : refusé ; le gérant demande, la date d’effacement est dans 30 jours et visible dans l’application', async () => {
  assert.equal((await api('POST', '/compte/supprimer', { pin: '0000' }, awa.jeton)).statut, 401);
  assert.equal((await api('POST', '/compte/supprimer', { pin: '4321' }, vendeur.jeton)).statut, 403);
  assert.equal((await api('POST', '/compte/supprimer', {})).statut, 401);
  const r = await api('POST', '/compte/supprimer', { pin: '1234' }, awa.jeton);
  assert.equal(r.statut, 200, JSON.stringify(r));
  const jours = (new Date(r.suppressionPrevueLe) - Date.now()) / 86400000;
  assert.ok(jours > 29.9 && jours <= 30.01, String(jours));
  // Demande répétée : même date
  assert.equal((await api('POST', '/compte/supprimer', { pin: '1234' }, awa.jeton)).suppressionPrevueLe, r.suppressionPrevueLe);
  const donnees = await api('GET', '/donnees', null, awa.jeton);
  assert.equal(donnees.commerce.suppressionPrevueLe, r.suppressionPrevueLe);
});

test('annulation : la demande disparaît ; le vendeur ne peut pas annuler', async () => {
  assert.equal((await api('POST', '/compte/supprimer/annuler', {}, vendeur.jeton)).statut, 403);
  const r = await api('POST', '/compte/supprimer/annuler', {}, awa.jeton);
  assert.equal(r.suppressionPrevueLe, null);
  assert.equal((await api('GET', '/donnees', null, awa.jeton)).commerce.suppressionPrevueLe, null);
});

test('avant la fin du délai, le planificateur n’efface rien ; après 30 jours il efface les données et garde les factures et paiements', async () => {
  assert.equal((await api('POST', '/compte/supprimer', { pin: '1234' }, awa.jeton)).statut, 200);
  const avant = await api('POST', `/cron/notifications?cle=${CLE}`);
  assert.equal(avant.supprimes, 0);
  assert.equal(compte('elements') > 0, true);
  const il = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 19) + 'Z';
  exec(`UPDATE commerces SET suppression_demandee_le = '${il}' WHERE id = '${awa.commerce.id}'`);
  const apres = await api('POST', `/cron/notifications?cle=${CLE}`);
  assert.equal(apres.supprimes, 1, JSON.stringify(apres));
  for (const t of ['elements', 'utilisateurs', 'jetons', 'journal', 'sauvegardes']) assert.equal(compte(t), 0, t);
  // Comptabilité conservée, commerce anonymisé
  assert.equal(compte('paiements'), 1);
  assert.equal(compte('factures'), 1);
  const c = sql(`SELECT nom, telephone, supprime_le FROM commerces WHERE id = '${awa.commerce.id}'`)[0];
  assert.equal(c.nom, 'Commerce supprimé');
  assert.equal(c.telephone, '');
  assert.ok(c.supprime_le);
  // Plus de connexion possible
  assert.notEqual((await api('POST', '/connexion', { telephone: '0712348002', pays: 'CI', pin: '1234', appareil: 'Test' })).statut, 200);
  assert.equal((await api('GET', '/donnees', null, awa.jeton)).statut, 401);
  // Deuxième passage : rien de plus
  assert.equal((await api('POST', `/cron/notifications?cle=${CLE}`)).supprimes, 0);
});
