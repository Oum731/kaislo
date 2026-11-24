// Lot L3 : position du livreur pendant la course, vue par le client sur une carte ; effacée dès la fin. Option « carte » de LivraisonOptions.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-l3-'));
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
  const g = await api('POST', '/inscription', { commerce: { nom: 'Épicerie L3', type: 'epicerie', pays: 'MA', ville: 'Casablanca', quartier: 'Maarif', telephone: '0612340001' }, gerant: { nom: 'Hassan', telephone: '0612340002', pin: '1234' }, conditionsAcceptees: true });
  assert.equal(g.statut, 201, JSON.stringify(g));
  await api('POST', '/donnees', { elements: [{ type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Lait', prix: 10, actif: true, enLigne: true, groupes: [] } }] }, g.jeton);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l3', whatsapp: '0612340001', conditionsAcceptees: true, fraisLivraison: 10 }, g.jeton)).ok, true);
  return { api, jeton: g.jeton };
}
after(() => { serveurs.forEach((s) => s.kill()); fs.rmSync(dossier, { recursive: true, force: true }); });
const commander = (api) => api('POST', '/public/commande', { b: 'epicerie-l3', client: { nom: 'Sara', telephone: '0661482735', adresse: '12 rue Ibn Sina' }, lignes: [{ produitId: 'p1', quantite: 3 }] });

async function course(api, jeton) {
  const cmd = (await commander(api)).commande;
  const id = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.numero === cmd.numero).id;
  await api('POST', '/commandes-en-ligne', { id, statut: 'confirmee' }, jeton);
  const l = (await api('POST', '/livreurs', { nom: 'Karim', telephone: '0672581493' }, jeton)).livreur;
  const cle = (await api('POST', '/commandes-en-ligne/assigner', { id, livreurId: l.id }, jeton)).commande.lienCourse.split('=')[1];
  return { cmd, id, cle };
}

test('sans l’option « carte », la position n’est ni reçue ni montrée', async () => {
  const { api, jeton } = await demarrer('LivraisonActive=oui\n');
  const { cmd, cle } = await course(api, jeton);
  await api('POST', '/public/course/statut', { cle, action: 'recupere' });
  assert.equal((await api('POST', '/public/course/position', { cle, lat: 33.57, lng: -7.59 })).statut, 404);
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + cmd.suivi)).commande.position, null);
  assert.equal((await api('GET', '/public/course?cle=' + cle)).course.carte, false);
});

test('la position suit la course : visible seulement en route, jamais gardée après la livraison', async () => {
  const { api, jeton } = await demarrer('LivraisonActive=oui\nLivraisonOptions=carte\n');
  const { cmd, id, cle } = await course(api, jeton);
  assert.equal((await api('GET', '/public/course?cle=' + cle)).course.carte, true);
  // Avant la récupération : rien n'est enregistré
  assert.equal((await api('POST', '/public/course/position', { cle, lat: 33.57, lng: -7.59 })).partage, false);
  await api('POST', '/public/course/statut', { cle, action: 'recupere' });
  // Positions refusées si absurdes
  for (const mauvaise of [{ lat: 'x', lng: 1 }, { lat: 120, lng: 0 }, { lat: 0, lng: 0 }]) assert.equal((await api('POST', '/public/course/position', { cle, ...mauvaise })).statut, 400);
  assert.equal((await api('POST', '/public/course/position', { cle: 'f'.repeat(20), lat: 33.57, lng: -7.59 })).statut, 404);
  const r = await api('POST', '/public/course/position', { cle, lat: 33.57312, lng: -7.58981, precision: 12 });
  assert.equal(r.partage, true);
  // Le client voit la position (arrondie) et son ancienneté ; le commerçant aussi
  const suivi = (await api('GET', '/public/commande-suivi?cle=' + cmd.suivi)).commande;
  assert.equal(suivi.position.lat, 33.57312);
  assert.equal(suivi.position.lng, -7.58981);
  assert.ok(suivi.position.ageSec < 30);
  const liste = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.id === id);
  assert.equal(liste.position.lat, 33.57312);
  // La course terminée efface la position
  const code = suivi.code;
  assert.equal((await api('POST', '/public/course/statut', { cle, action: 'livre', code })).ok, true);
  assert.equal((await api('GET', '/public/commande-suivi?cle=' + cmd.suivi)).commande.position, null);
  assert.equal((await api('POST', '/public/course/position', { cle, lat: 33.58, lng: -7.6 })).partage, false);
  const apres = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.id === id);
  assert.equal(apres.position, null);
});
