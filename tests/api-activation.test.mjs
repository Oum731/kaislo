// Activation provisoire : le gérant active son abonnement, a quelques jours pour payer, puis certaines actions sont suspendues (la caisse reste utilisable)
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
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-activation-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, admin, awa, bako;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); $p->exec(${JSON.stringify(requete)});`]);
const lire = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const el = (type, id, contenu) => ({ type, id, contenu, modifieLe: new Date().toISOString() });
const inscrire = (nom, tel, tg) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Centre', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tg, pin: '1234' }, conditionsAcceptees: true,
});
// Fait passer le délai : l'abonnement provisoire est terminé depuis une heure
const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 19) + 'Z';
const terminer = (commerce) => sql(`UPDATE commerces SET periode_fin = '${hier}', essai_fin = '${hier}' WHERE id = '${commerce.commerce.id}'`);
const finirEssai = (commerce) => sql(`UPDATE commerces SET essai_fin = '2020-01-01 00:00:00' WHERE id = '${commerce.commerce.id}'`);

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  awa = await inscrire('Chez Awa Activation', '0712347001', '0712347002');
  bako = await inscrire('Épicerie Bako Activation', '0712347011', '0712347012');
  assert.equal(awa.statut, 201, JSON.stringify(awa));
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  admin = install.jeton;
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('le gérant active : abonnement actif tout de suite pour 5 jours, marqué provisoire (pas pendant l’essai)', async () => {
  assert.equal((await api('POST', '/abonnement/activer', {}, awa.jeton)).statut, 409);
  finirEssai(awa);
  const r = await api('POST', '/abonnement/activer', {}, awa.jeton);
  assert.equal(r.statut, 200, JSON.stringify(r));
  assert.equal(r.jours, 5);
  assert.equal(r.commerce.abonnement.statut, 'actif');
  assert.equal(r.commerce.abonnement.provisoire, true);
  const jours = (new Date(r.commerce.abonnement.periodeFin) - Date.now()) / 86400000;
  assert.ok(jours > 4.9 && jours <= 5.01, String(jours));
  // Deuxième clic : déjà actif
  const encore = await api('POST', '/abonnement/activer', {}, awa.jeton);
  assert.equal(encore.statut, 409, JSON.stringify(encore));
});

test('un vendeur ne peut pas activer', async () => {
  assert.equal((await api('POST', '/abonnement/activer', {})).statut, 401);
  const v = await api('POST', '/utilisateurs', { nom: 'Vendeur', telephone: '0712347003', pin: '4321', posteId: 'principal' }, awa.jeton);
  assert.equal(v.statut, 200, JSON.stringify(v));
  const co = await api('POST', '/connexion', { telephone: '0712347003', pays: 'CI', pin: '4321', appareil: 'Test' });
  assert.equal((await api('POST', '/abonnement/activer', {}, co.jeton)).statut, 403);
});

test('délai passé sans paiement : plus de nouveau vendeur, plus de validation des commandes, boutique fermée ; la synchronisation de la caisse reste ouverte', async () => {
  // Boutique et commande reçue avant la fin du délai
  await api('POST', '/donnees', { elements: [el('categories', 'c1', { id: 'c1', nom: 'Boissons' }), el('produits', 'p2', { id: 'p2', nom: 'Eau', prix: 600, promo: null, categorieId: 'c1', enLigne: true, groupes: [] })] }, awa.jeton);
  const b = await api('POST', '/boutique', { actif: true, conditionsAcceptees: true, slug: 'chez-awa-act', whatsapp: '0712347004', description: 'Eau', livraison: 'Partout' }, awa.jeton);
  assert.equal(b.ok, true, JSON.stringify(b));
  assert.equal((await api('GET', '/public/boutique?b=chez-awa-act')).statut, 200);
  const cmd = await api('POST', '/public/commande', { b: 'chez-awa-act', client: { nom: 'Koffi', telephone: '0701020304', adresse: 'Cocody' }, lignes: [{ produitId: 'p2', quantite: 1 }] });
  assert.equal(cmd.statut, 201, JSON.stringify(cmd));
  const id = (await api('GET', '/commandes-en-ligne', null, awa.jeton)).commandes[0].id;
  // Dans le délai : on valide
  const conf = await api('POST', '/commandes-en-ligne', { id, statut: 'confirmee' }, awa.jeton);
  assert.equal(conf.ok, true, JSON.stringify(conf));

  terminer(awa);
  const refus = await api('POST', '/commandes-en-ligne', { id, statut: 'prete' }, awa.jeton);
  assert.equal(refus.statut, 403, JSON.stringify(refus));
  assert.match(refus.erreur || refus.message || '', /valider vos commandes/);
  assert.equal((await api('POST', '/commandes-en-ligne', { id, lignes: [{ index: 0, quantite: 2 }], client: { nom: 'Koffi', telephone: '0701020304', adresse: 'Cocody' } }, awa.jeton)).statut, 403);
  // Refuser reste possible
  assert.equal((await api('POST', '/commandes-en-ligne', { id, statut: 'annulee' }, awa.jeton)).ok, true);
  // Boutique fermée tout de suite
  assert.equal((await api('GET', '/public/boutique?b=chez-awa-act')).statut, 404);
  // Nouveau vendeur refusé, modification d'un vendeur existant permise
  const nv = await api('POST', '/utilisateurs', { nom: 'Autre', telephone: '0712347005', pin: '5678', posteId: 'principal' }, awa.jeton);
  assert.equal(nv.statut, 403, JSON.stringify(nv));
  // La caisse (synchronisation) reste ouverte pendant le délai de grâce
  const sync = await api('POST', '/donnees', { elements: [el('categories', 'c2', { id: 'c2', nom: 'Autres' })] }, awa.jeton);
  assert.equal(sync.ok, true, JSON.stringify(sync));
});

test('seconde activation refusée tant qu’aucun paiement n’a eu lieu ; un paiement la débloque et remet la période à zéro', async () => {
  const r = await api('POST', '/abonnement/activer', {}, awa.jeton);
  assert.equal(r.statut, 409, JSON.stringify(r));
  assert.match(r.erreur || r.message || '', /déjà utilisé/);
  const p = await api('POST', '/admin/paiement', { commerceId: awa.commerce.id, mois: 1, postes: 1, montant: 5000, moyen: 'Virement' }, admin);
  assert.equal(p.ok, true, JSON.stringify(p));
  const fiche = (await api('GET', '/admin/commerces', null, admin)).commerces.find((c) => c.commerce.id === awa.commerce.id);
  assert.equal(fiche.commerce.abonnement.statut, 'actif');
  assert.ok(!fiche.commerce.abonnement.provisoire);
  // La période payée démarre maintenant (le provisoire déjà écoulé n'est pas déduit)
  const jours = (new Date(fiche.commerce.abonnement.periodeFin) - Date.now()) / 86400000;
  assert.ok(jours > 29 && jours < 31.1, String(jours));
  // Nouveau vendeur de nouveau possible
  assert.equal((await api('POST', '/utilisateurs', { nom: 'Autre', telephone: '0712347005', pin: '5678', posteId: 'principal' }, awa.jeton)).statut, 200);
  // Déjà payé et actif : rien à activer
  assert.equal((await api('POST', '/abonnement/activer', {}, awa.jeton)).statut, 409);
});

test('commerce suspendu : activation refusée ; délai réglable par l’équipe (3 jours)', async () => {
  const r = await api('GET', '/tarifs');
  const regles = { ...r.regles, joursActivationProvisoire: 3 };
  assert.equal((await api('POST', '/admin/tarifs', { formules: r.formules, regles }, admin)).ok, true);
  finirEssai(bako);
  const ok = await api('POST', '/abonnement/activer', {}, bako.jeton);
  assert.equal(ok.statut, 200, JSON.stringify(ok));
  assert.equal(ok.jours, 3);
  sql(`UPDATE commerces SET statut = 'suspendu' WHERE id = '${bako.commerce.id}'`);
  assert.equal((await api('POST', '/abonnement/activer', {}, bako.jeton)).statut, 403);
  assert.equal(lire(`SELECT periode_provisoire AS p FROM commerces WHERE id = '${bako.commerce.id}'`)[0].p, 1);
});
