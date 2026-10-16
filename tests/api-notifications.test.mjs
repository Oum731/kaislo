// Notifications : résumé du soir (e-mail et/ou WhatsApp selon le compte), nouvelles commandes, planificateur. Lancer : npm test
// NotificationsMode=test : rien n'est envoyé pour de vrai, chaque message est noté dans la table notifications.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5590 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-notif-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
const CLE_CRON = 'cle-cron-de-test-0123456789';
let serveur, gerant;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}
const maintenant = () => new Date().toISOString();
const el = (type, id, contenu) => ({ type, id, contenu, modifieLe: maintenant() });
const sql = (requete) => JSON.parse(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo json_encode($p->query(${JSON.stringify(requete)})->fetchAll(PDO::FETCH_ASSOC));`]).toString());
const notes = () => sql('SELECT type, canal, statut, detail FROM notifications ORDER BY cree_le, rowid');
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const reglages = (notifications) => el('reglages', 'commerce', { nom: 'Chez Awa Notif', email: 'awa@example.com', pays: 'CI', notifications });
const vente = (id, total, extra = {}) => el('ventes', id, {
  id, date: maintenant(), total, sousTotal: total, remise: 0, paiement: 'Espèces', vendeurId: 'u', vendeurNom: 'Awa',
  lignes: [{ produitId: 'p1', nom: 'Riz', quantite: 1, prixUnitaire: total, total, coutUnitaire: total / 2 }], ...extra,
});

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nNotificationsMode=test\nCleCron=${CLE_CRON}\nWhatsAppToken=jeton-de-test\nWhatsAppNumeroId=123456\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  gerant = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Awa Notif', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712345611' },
    gerant: { nom: 'Awa', telephone: '0712345612', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(gerant.statut, 201, JSON.stringify(gerant));
  const r = await api('POST', '/donnees', { elements: [
    reglages({ heure: 0 }),
    el('categories', 'c1', { id: 'c1', nom: 'Épicerie' }),
    // Stock suivi : 10 au départ, 8 vendus plus loin → 2 restants (seuil 5) : alerte
    el('produits', 'p1', { id: 'p1', nom: 'Riz', prix: 2500, categorieId: 'c1', actif: true, suiviStock: true, stockBase: 10, stockDepuis: '2026-10-01T00:00:00.000Z', seuilAlerte: 5, groupes: [], enLigne: true }),
    el('produits', 'p2', { id: 'p2', nom: 'Huile', prix: 1000, categorieId: 'c1', actif: true, suiviStock: true, stockBase: 100, stockDepuis: '2026-10-01T00:00:00.000Z', groupes: [] }),
    el('clients', 'k1', { id: 'k1', nom: 'Koffi', telephone: '0700000001' }),
    vente('v1', 5000), vente('v2', 2500, { paiement: 'Wave' }),
    vente('v3', 4000, { paiement: 'Crédit', clientId: 'k1' }),
    vente('v4', 9999, { annulee: true }), // annulée : ne compte pas
    el('remboursements', 'r1', { id: 'r1', clientId: 'k1', montant: 1000, date: maintenant() }),
    el('depenses', 'd1', { id: 'd1', montant: 1500, date: maintenant(), note: 'Transport', categorie: 'Transport' }),
    el('mouvements', 'm1', { id: 'm1', produitId: 'p1', quantite: 0, date: maintenant(), type: 'entree' }),
  ] }, gerant.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
  // 3 ventes valides de 1 riz chacune = 3 sorties : 10 − 3 = 7 ; on en ajoute pour passer sous le seuil
  const plus = [];
  for (let i = 0; i < 5; i++) plus.push(vente('w' + i, 2500, { lignes: [{ produitId: 'p1', nom: 'Riz', quantite: 1, prixUnitaire: 2500, total: 2500 }] }));
  const r2 = await api('POST', '/donnees', { elements: plus }, gerant.jeton);
  assert.deepEqual(r2.refuses, [], JSON.stringify(r2));
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('état : e-mail du compte masqué, WhatsApp proposé, réglages par défaut sûrs, réservé au gérant', async () => {
  assert.equal((await api('GET', '/notifications')).statut, 401);
  const e = await api('GET', '/notifications', null, gerant.jeton);
  assert.equal(e.ok, true, JSON.stringify(e));
  assert.deepEqual(e.email, { disponible: true, adresse: 'aw***@example.com' });
  assert.equal(e.whatsapp.plateforme, true);
  assert.equal(e.whatsapp.disponible, true);
  assert.match(e.whatsapp.numero, /^\+225 /, 'numéro du commerce, mis en forme');
  assert.equal(e.reglages.whatsapp, false, 'WhatsApp jamais sans l’accord du gérant');
  assert.equal(e.reglages.email, true);
  assert.equal(e.reglages.resume, true);
  assert.equal(e.reglages.commandes, true);
});

test('l’essai envoie le résumé du jour par e-mail, avec les bons chiffres', async () => {
  const r = await api('POST', '/notifications/tester', null, gerant.jeton);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.resultats, [{ canal: 'email', statut: 'envoye' }]);
  const [n] = notes();
  assert.equal(n.type, 'essai');
  assert.match(n.detail, /à awa@example\.com/);
  assert.match(n.detail, /\[Essai\] Kaislo : votre résumé du soir, Chez Awa Notif/);
  // 5000 + 2500 + 4000 (crédit) + 5 × 2500 = 24 000 sur 8 tickets ; l'annulée de 9 999 ne compte pas
  assert.match(n.detail, /Ventes : 24 000 FCFA \(8 tickets\)/);
  assert.match(n.detail, /Panier moyen : 3 000 FCFA/);
  assert.match(n.detail, /Marge : 5 750 FCFA/, 'marge seulement sur les ventes dont le coût est connu');
  assert.match(n.detail, /Espèces : 17 500 FCFA \(6\)/);
  assert.match(n.detail, /Wave : 2 500 FCFA \(1\)/);
  assert.match(n.detail, /Crédit : 4 000 FCFA \(1\)/);
  assert.match(n.detail, /Dépenses : 1 500 FCFA/);
  assert.match(n.detail, /Crédits à récupérer : 3 000 FCFA/, '4 000 à crédit − 1 000 remboursés');
  assert.match(n.detail, /Stock bas :\n {2}· Riz : 2\b/, '10 au départ − 8 vendus = 2');
  assert.match(n.detail, /Riz \(8\)/, 'article le plus vendu');
  assert.doesNotMatch(n.detail, /9 999/);
});

test('WhatsApp seulement si le gérant l’a activé : message « modèle » avec le numéro du compte', async () => {
  const avant = notes().length;
  await api('POST', '/donnees', { elements: [reglages({ heure: 0, whatsapp: true })] }, gerant.jeton);
  const r = await api('POST', '/notifications/tester', null, gerant.jeton);
  assert.deepEqual(r.resultats.map((x) => [x.canal, x.statut]), [['email', 'envoye'], ['whatsapp', 'envoye']]);
  const wa = notes().slice(avant).find((n) => n.canal === 'whatsapp');
  const charge = JSON.parse(wa.detail.replace(/^essai : /, ''));
  assert.equal(charge.messaging_product, 'whatsapp');
  assert.equal(charge.to, '2250712345611');
  assert.equal(charge.type, 'template');
  assert.equal(charge.template.name, 'kaislo_resume_soir');
  assert.equal(charge.template.language.code, 'fr');
  const vars = charge.template.components[0].parameters.map((p) => p.text);
  assert.equal(vars.length, 6);
  assert.equal(vars[0], 'Chez Awa Notif');
  assert.equal(vars[2], '24 000 FCFA (8 tickets)');
  assert.ok(vars.every((v) => !/[\n\t]/.test(v)), 'Meta refuse les retours à la ligne dans les variables');
});

test('e-mail désactivé : seulement WhatsApp ; aucun canal choisi : refusé avec une explication', async () => {
  await api('POST', '/donnees', { elements: [reglages({ heure: 0, email: false, whatsapp: true })] }, gerant.jeton);
  const seul = await api('POST', '/notifications/tester', null, gerant.jeton);
  assert.deepEqual(seul.resultats.map((x) => x.canal), ['whatsapp']);
  await api('POST', '/donnees', { elements: [reglages({ heure: 0, email: false, whatsapp: false })] }, gerant.jeton);
  const aucun = await api('POST', '/notifications/tester', null, gerant.jeton);
  assert.equal(aucun.statut, 400);
  assert.match(aucun.erreur, /Aucun canal choisi/);
});

test('planificateur : clé obligatoire, un seul résumé par jour, respect du choix « sans résumé »', async () => {
  assert.equal((await api('POST', '/cron/notifications')).statut, 403);
  assert.equal((await api('POST', `/cron/notifications?cle=mauvaise-cle-0123456789`)).statut, 403);
  await api('POST', '/donnees', { elements: [reglages({ heure: 0 })] }, gerant.jeton);
  const avant = notes().filter((n) => n.type === 'resume').length;
  const r1 = await api('POST', `/cron/notifications?cle=${CLE_CRON}`);
  assert.equal(r1.ok, true, JSON.stringify(r1));
  assert.equal(r1.envoyes, 1);
  const resumes = notes().filter((n) => n.type === 'resume');
  assert.equal(resumes.length, avant + 1);
  assert.equal(resumes.at(-1).canal, 'email');
  assert.doesNotMatch(resumes.at(-1).detail, /\[Essai\]/);
  // Deuxième passage le même jour : rien de plus
  const r2 = await api('POST', `/cron/notifications?cle=${CLE_CRON}`);
  assert.equal(r2.envoyes, 0);
  assert.equal(notes().filter((n) => n.type === 'resume').length, avant + 1);
  assert.equal(sql('SELECT resume_envoye_le FROM commerces')[0].resume_envoye_le.length, 10);
});

test('planificateur : pas avant l’heure choisie, pas si le résumé est coupé', async () => {
  sql("SELECT 1"); // la base est ouverte en lecture seule ici : on modifie via l'API
  const nb = () => notes().filter((n) => n.type === 'resume').length;
  execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); $p->exec("UPDATE commerces SET resume_envoye_le = NULL");`]);
  await api('POST', '/donnees', { elements: [reglages({ resume: false, heure: 0 })] }, gerant.jeton);
  const avant = nb();
  assert.equal((await api('POST', `/cron/notifications?cle=${CLE_CRON}`)).envoyes, 0);
  await api('POST', '/donnees', { elements: [reglages({ resume: true, heure: 23 })] }, gerant.jeton);
  const maintenantHeure = Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Abidjan', hour: '2-digit', hour12: false }));
  if (maintenantHeure < 23) assert.equal((await api('POST', `/cron/notifications?cle=${CLE_CRON}`)).envoyes, 0, 'avant 23 h à Abidjan');
  assert.equal(nb(), avant);
});

test('nouvelle commande en ligne : le commerçant est prévenu, sauf s’il l’a refusé', async () => {
  await api('POST', '/donnees', { elements: [reglages({ heure: 0, whatsapp: true, commandes: true })] }, gerant.jeton);
  const b = await api('POST', '/boutique', { actif: true, conditionsAcceptees: true, slug: 'chez-awa-notif', whatsapp: '0712345613', description: '', livraison: '' }, gerant.jeton);
  assert.equal(b.ok, true, JSON.stringify(b));
  const commande = { b: 'chez-awa-notif', client: { nom: 'Koffi', telephone: '0701020304', adresse: 'Cocody Angré' }, note: 'Sans piment', lignes: [{ produitId: 'p1', quantite: 2 }] };
  const avant = notes().length;
  const r = await api('POST', '/public/commande', commande);
  assert.equal(r.statut, 201, JSON.stringify(r));
  await attendre(400);
  const nouvelles = notes().slice(avant).filter((n) => n.type === 'commande');
  assert.deepEqual(nouvelles.map((n) => n.canal).sort(), ['email', 'whatsapp']);
  const mail = nouvelles.find((n) => n.canal === 'email');
  assert.match(mail.detail, /nouvelle commande en ligne n° 1 — 5 000 FCFA/);
  assert.match(mail.detail, /2 × Riz/);
  assert.match(mail.detail, /Cocody Angré/);
  assert.match(mail.detail, /Sans piment/);
  const wa = JSON.parse(nouvelles.find((n) => n.canal === 'whatsapp').detail.replace(/^essai : /, ''));
  assert.equal(wa.template.name, 'kaislo_nouvelle_commande');
  // Refusé par le gérant : plus de notification
  await api('POST', '/donnees', { elements: [reglages({ heure: 0, commandes: false })] }, gerant.jeton);
  const avant2 = notes().length;
  assert.equal((await api('POST', '/public/commande', commande)).statut, 201);
  await attendre(400);
  assert.equal(notes().length, avant2);
});
