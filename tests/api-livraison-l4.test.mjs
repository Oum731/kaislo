// Lot L4 : paiement en ligne chez un prestataire (ici le prestataire « essai » : simulation signée). Kaislo ne touche pas l'argent.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const SECRET = 'secret-de-test-0123456789';
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-l4-'));
const serveurs = [];
const maintenant = () => new Date().toISOString();
const signer = (ref, statut) => createHmac('sha256', SECRET).update(`${ref}|${statut}`).digest('hex');

async function demarrer(extra) {
  const port = await portLibre();
  const env = path.join(dossier, `env-${port}`);
  fs.writeFileSync(env, `DbDriver=sqlite\nDbFichier=${path.join(dossier, `t-${port}.sqlite`)}\nCleAdmin=cle-de-test-0123456789\nDefi=non\nNotificationsMode=test\n${extra}`);
  serveurs.push(spawn('php', ['-S', `127.0.0.1:${port}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: env }, stdio: 'ignore' }));
  const U = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(U + '/sante')).ok) break; } catch { /* démarrage */ } await new Promise((r) => setTimeout(r, 100)); }
  const api = async (methode, chemin, corps, jeton) => {
    const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
    const type = r.headers.get('content-type') || '';
    return type.includes('json') ? { statut: r.status, ...(await r.json()) } : { statut: r.status, html: await r.text() };
  };
  const g = await api('POST', '/inscription', { commerce: { nom: 'Épicerie L4', type: 'epicerie', pays: 'MA', ville: 'Casablanca', quartier: 'Maarif', telephone: '0612340001' }, gerant: { nom: 'Hassan', telephone: '0612340002', pin: '1234' }, conditionsAcceptees: true });
  assert.equal(g.statut, 201, JSON.stringify(g));
  await api('POST', '/donnees', { elements: [{ type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Lait', prix: 100, actif: true, enLigne: true, groupes: [] } }] }, g.jeton);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l4', whatsapp: '0612340001', conditionsAcceptees: true, fraisLivraison: 10 }, g.jeton)).ok, true);
  return { api, jeton: g.jeton };
}
after(() => { serveurs.forEach((s) => s.kill()); fs.rmSync(dossier, { recursive: true, force: true }); });
const ACTIF = `LivraisonActive=oui\nLivraisonOptions=paiement\nPaiementEnLigne=essai\nPaiementSecret=${SECRET}\nPaiementCommission=5\n`;
const commander = (api, plus = {}) => api('POST', '/public/commande', { b: 'epicerie-l4', client: { nom: 'Sara', telephone: '0661482735', adresse: '12 rue Ibn Sina' }, lignes: [{ produitId: 'p1', quantite: 2 }], ...plus });
const idDe = async (api, jeton, numero) => (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.numero === numero).id;

test('paiement en ligne désactivé : pas d’option, pas de route', async () => {
  const { api, jeton } = await demarrer('LivraisonActive=oui\n');
  assert.equal((await api('GET', '/livraison/etat')).paiementEnLigne, false);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l4', whatsapp: '0612340001', paiementEnLigne: true, reversement: '0661482735' }, jeton)).ok, true);
  assert.equal((await api('GET', '/public/boutique?b=epicerie-l4')).boutique.commande.paiementEnLigne, false);
  assert.equal((await commander(api, { paiement: 'en_ligne' })).statut, 400);
  assert.equal((await api('POST', '/paiement/notification', { ref: 'x', statut: 'paye', signature: 'y' })).statut, 404);
  assert.equal((await api('GET', '/paiements-en-ligne', null, jeton)).statut, 404);
  // « PaiementEnLigne » sans secret : toujours coupé
  const sansSecret = await demarrer('LivraisonActive=oui\nLivraisonOptions=paiement\nPaiementEnLigne=essai\n');
  assert.equal((await sansSecret.api('GET', '/livraison/etat')).paiementEnLigne, false);
});

test('du paiement au reversement : commande à payer, confirmation signée, remboursement', async () => {
  const { api, jeton } = await demarrer(ACTIF);
  assert.deepEqual((await api('GET', '/livraison/etat')).options, ['paiement']);
  // La boutique doit dire où elle reçoit l'argent
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l4', whatsapp: '0612340001', paiementEnLigne: true }, jeton)).statut, 400);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l4', whatsapp: '0612340001', paiementEnLigne: true, reversement: 'Orange Money 0661482735' }, jeton)).ok, true);
  assert.equal((await api('GET', '/public/boutique?b=epicerie-l4')).boutique.commande.paiementEnLigne, true);
  assert.equal((await api('GET', '/boutique', null, jeton)).boutique.commande.reversement, 'Orange Money 0661482735');
  // Commande payée en ligne : en attente de paiement, le commerçant ne peut pas l'accepter
  const c = await commander(api, { paiement: 'en_ligne' });
  assert.equal(c.statut, 201, JSON.stringify(c));
  assert.equal(c.commande.total, 210);
  assert.match(c.commande.paiementUrl, /\/api\/public\/paiement-essai\?ref=ess_[a-f0-9]{16}/);
  const ref = /ref=(ess_[a-f0-9]{16})/.exec(c.commande.paiementUrl)[1];
  const id = await idDe(api, jeton, c.commande.numero);
  const avant = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.id === id);
  assert.deepEqual(avant.paiement, { mode: 'en_ligne', statut: 'a_payer' });
  assert.equal((await api('POST', '/commandes-en-ligne', { id, statut: 'confirmee' }, jeton)).statut, 400);
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + c.commande.suivi)).commande.paiement.statut, 'a_payer');
  // Page de simulation
  const page = await api('GET', '/public/paiement-essai?ref=' + ref);
  assert.equal(page.statut, 200);
  assert.match(page.html, /Paiement de test/);
  // Notifications : fausse signature refusée, mauvais statut refusé, bonne signature acceptée (et répétable sans effet)
  assert.equal((await api('POST', '/paiement/notification', { ref, statut: 'paye', signature: 'faux' })).statut, 403);
  assert.equal((await api('POST', '/paiement/notification', { ref, statut: 'rembourse', signature: signer(ref, 'rembourse') })).statut, 403);
  assert.equal((await api('POST', '/paiement/notification', { ref: 'ess_0000000000000000', statut: 'paye', signature: signer('ess_0000000000000000', 'paye') })).statut, 404);
  assert.equal((await api('POST', '/paiement/notification', { ref, statut: 'paye', signature: signer(ref, 'paye') })).ok, true);
  assert.equal((await api('POST', '/paiement/notification', { ref, statut: 'echoue', signature: signer(ref, 'echoue') })).ok, true);
  const apres = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.id === id);
  assert.deepEqual(apres.paiement, { mode: 'en_ligne', statut: 'paye' }, 'un paiement confirmé le reste');
  // Le commerçant peut maintenant accepter ; il ne peut plus modifier la commande
  assert.equal((await api('POST', '/commandes-en-ligne', { id, statut: 'confirmee' }, jeton)).ok, true);
  assert.equal((await api('POST', '/commandes-en-ligne', { id, client: { nom: 'Sara', telephone: '0661482735', adresse: 'x' }, lignes: [{ index: 0, quantite: 1 }] }, jeton)).statut, 400);
  // Paiements et commission (5 %)
  const liste = await api('GET', '/paiements-en-ligne', null, jeton);
  assert.equal(liste.paiements.length, 1);
  assert.equal(liste.paiements[0].commission, 10.5);
  assert.equal(liste.paiements[0].net, 199.5);
  assert.equal(liste.aReverser, 199.5);
  // Annulation puis remboursement
  assert.equal((await api('POST', '/commandes-en-ligne/rembourser', { id }, jeton)).statut, 400, 'annuler d’abord');
  assert.equal((await api('POST', '/commandes-en-ligne', { id, statut: 'annulee' }, jeton)).ok, true);
  assert.equal((await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.id === id).paiement.statut, 'a_rembourser');
  const r = await api('POST', '/commandes-en-ligne/rembourser', { id }, jeton);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.commande.paiement.statut, 'rembourse');
  assert.equal((await api('GET', '/paiements-en-ligne', null, jeton)).aReverser, 0);
});

test('paiement échoué : le client reprend le paiement avec un nouveau lien', async () => {
  const { api, jeton } = await demarrer(ACTIF);
  await api('POST', '/boutique', { actif: true, slug: 'epicerie-l4', whatsapp: '0612340001', paiementEnLigne: true, reversement: 'Orange Money 0661482735' }, jeton);
  const c = await commander(api, { paiement: 'en_ligne' });
  const ref1 = /ref=(ess_[a-f0-9]{16})/.exec(c.commande.paiementUrl)[1];
  await api('POST', '/paiement/notification', { ref: ref1, statut: 'echoue', signature: signer(ref1, 'echoue') });
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + c.commande.suivi)).commande.paiement.statut, 'echoue');
  assert.equal((await api('POST', '/public/commande-suivi/payer', { cle: 'a'.repeat(20) })).statut, 404);
  const p = await api('POST', '/public/commande-suivi/payer', { cle: c.commande.suivi });
  assert.equal(p.ok, true);
  const ref2 = /ref=(ess_[a-f0-9]{16})/.exec(p.url)[1];
  assert.notEqual(ref1, ref2);
  assert.equal((await api('POST', '/paiement/notification', { ref: ref2, statut: 'paye', signature: signer(ref2, 'paye') })).ok, true);
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + c.commande.suivi)).commande.paiement.statut, 'paye');
  assert.equal((await api('POST', '/public/commande-suivi/payer', { cle: c.commande.suivi })).statut, 400, 'déjà payée');
  // Une commande à payer en livraison reste inchangée
  const l = await commander(api);
  assert.equal(l.commande.paiementUrl, undefined);
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + l.commande.suivi)).commande.paiement.mode, 'livraison');
});
