// Lot L1 : commande dans Kaislo (retrait ou livraison, frais, minimum, suivi par le client). Tout est coupé sans « LivraisonActive=oui ».
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-l1-'));
const serveurs = [];
const maintenant = () => new Date().toISOString();

async function demarrer(extra) {
  const port = await portLibre();
  const env = path.join(dossier, `env-${port}`);
  fs.writeFileSync(env, `DbDriver=sqlite\nDbFichier=${path.join(dossier, `t-${port}.sqlite`)}\nCleAdmin=cle-de-test-0123456789\nDefi=non\nNotificationsMode=test\n${extra}`);
  serveurs.push(spawn('php', ['-S', `127.0.0.1:${port}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: env }, stdio: 'ignore' }));
  const U = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(U + '/sante')).ok) break; } catch { /* démarrage */ } await new Promise((r) => setTimeout(r, 100)); }
  const api = async (methode, chemin, corps, jeton) => {
    const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
    return { statut: r.status, ...(await r.json()) };
  };
  const g = await api('POST', '/inscription', { commerce: { nom: 'Épicerie L1', type: 'epicerie', pays: 'MA', ville: 'Casablanca', quartier: 'Maarif', telephone: '0612340001' }, gerant: { nom: 'Hassan', telephone: '0612340002', pin: '1234' }, conditionsAcceptees: true });
  assert.equal(g.statut, 201, JSON.stringify(g));
  await api('POST', '/donnees', { elements: [{ type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Lait', prix: 10, actif: true, enLigne: true, groupes: [] } }] }, g.jeton);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l1', whatsapp: '0612340001', conditionsAcceptees: true }, g.jeton)).ok, true);
  return { api, jeton: g.jeton };
}
after(() => { serveurs.forEach((s) => s.kill()); fs.rmSync(dossier, { recursive: true, force: true }); });
const client = { nom: 'Sara', telephone: '0612345678', adresse: '12 rue Ibn Sina' };
const commande = (api, plus = {}) => api('POST', '/public/commande', { b: 'epicerie-l1', client, lignes: [{ produitId: 'p1', quantite: 3 }], ...plus });

test('livraison coupée : la commande reste celle d’avant (pas de frais, pas de suivi)', async () => {
  const { api, jeton } = await demarrer('');
  // Les réglages de livraison ne sont pas enregistrés tant que le chantier est coupé
  await api('POST', '/boutique', { actif: true, slug: 'epicerie-l1', whatsapp: '0612340001', fraisLivraison: 10 }, jeton);
  const r = await commande(api, { mode: 'retrait' });
  assert.equal(r.statut, 201);
  assert.equal(r.commande.total, 30);
  assert.equal(r.commande.suivi, undefined);
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + 'a'.repeat(20))).statut, 404);
  assert.equal((await api('GET', '/public/boutique?b=epicerie-l1')).boutique.commande, undefined);
});

test('livraison ouverte : frais, minimum, retrait sans adresse et suivi par le client', async () => {
  const { api, jeton } = await demarrer('LivraisonActive=oui\n');
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l1', whatsapp: '0612340001', fraisLivraison: 10, minimumCommande: 20 }, jeton)).ok, true);
  const pub = (await api('GET', '/public/boutique?b=epicerie-l1')).boutique.commande;
  assert.deepEqual(pub, { livre: true, retrait: true, frais: 10, minimum: 20 });
  // Livraison : frais ajoutés
  const l = await commande(api);
  assert.equal(l.statut, 201, JSON.stringify(l));
  assert.equal(l.commande.total, 40);
  assert.equal(l.commande.frais, 10);
  assert.equal(l.commande.mode, 'livraison');
  assert.match(l.commande.suivi, /^[a-f0-9]{20}$/);
  // Retrait : sans frais et sans adresse
  const r = await commande(api, { mode: 'retrait', client: { nom: 'Sara', telephone: '0612345678' } });
  assert.equal(r.statut, 201, JSON.stringify(r));
  assert.equal(r.commande.total, 30);
  assert.equal(r.commande.mode, 'retrait');
  // Minimum de commande
  assert.equal((await commande(api, { lignes: [{ produitId: 'p1', quantite: 1 }] })).statut, 400);
  // Livraison sans adresse : refusée ; retrait désactivé : refusé
  assert.equal((await commande(api, { client: { nom: 'Sara', telephone: '0612345678' } })).statut, 400);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l1', whatsapp: '0612340001', retrait: false }, jeton)).ok, true);
  assert.equal((await commande(api, { mode: 'retrait' })).statut, 400);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l1', whatsapp: '0612340001', retrait: false, livre: false }, jeton)).statut, 400);
  // Suivi : le client voit le statut que le commerçant change
  const s1 = await api('GET', '/public/commande-suivi?cle=' + l.commande.suivi);
  assert.equal(s1.commande.statut, 'nouvelle');
  assert.equal(s1.commande.numero, l.commande.numero);
  assert.equal(s1.commande.total, 40);
  assert.deepEqual(s1.commande.lignes, [{ nom: 'Lait', quantite: 3 }]);
  const liste = await api('GET', '/commandes-en-ligne', null, jeton);
  const cl = liste.commandes.find((x) => x.numero === l.commande.numero);
  assert.equal(cl.mode, 'livraison');
  assert.equal(cl.frais, 10);
  assert.equal((await api('POST', '/commandes-en-ligne', { id: cl.id, statut: 'confirmee' }, jeton)).ok, true);
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + l.commande.suivi)).commande.statut, 'confirmee');
  // Une clé inconnue ne révèle rien
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + 'b'.repeat(20))).statut, 404);
  assert.equal((await api('GET', '/public/commande-suivi?cle=abc')).statut, 404);
});
