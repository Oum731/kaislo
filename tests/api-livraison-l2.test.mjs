// Lot L2 : livraison par le commerçant. Livreur = simple fiche, course suivie par un lien propre à la commande, code de remise donné par le client.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-l2-'));
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
  const g = await api('POST', '/inscription', { commerce: { nom: 'Épicerie L2', type: 'epicerie', pays: 'MA', ville: 'Casablanca', quartier: 'Maarif', telephone: '0612340001' }, gerant: { nom: 'Hassan', telephone: '0612340002', pin: '1234' }, conditionsAcceptees: true });
  assert.equal(g.statut, 201, JSON.stringify(g));
  await api('POST', '/donnees', { elements: [{ type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Lait', prix: 10, actif: true, enLigne: true, groupes: [] } }] }, g.jeton);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l2', whatsapp: '0612340001', conditionsAcceptees: true, fraisLivraison: 10 }, g.jeton)).ok, true);
  return { api, jeton: g.jeton };
}
after(() => { serveurs.forEach((s) => s.kill()); fs.rmSync(dossier, { recursive: true, force: true }); });
const commander = (api, plus = {}) => api('POST', '/public/commande', { b: 'epicerie-l2', client: { nom: 'Sara', telephone: '0661482735', adresse: '12 rue Ibn Sina' }, lignes: [{ produitId: 'p1', quantite: 3 }], ...plus });
const idDe = async (api, jeton, numero) => (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.numero === numero).id;

test('livraison coupée : livreurs, attribution et courses introuvables', async () => {
  const { api, jeton } = await demarrer('');
  assert.equal((await api('GET', '/livreurs', null, jeton)).statut, 404);
  assert.equal((await api('POST', '/livreurs', { nom: 'Karim', telephone: '0672581493' }, jeton)).statut, 404);
  assert.equal((await api('POST', '/commandes-en-ligne/assigner', { id: 'x', livreurId: 'y' }, jeton)).statut, 404);
  assert.equal((await api('GET', '/public/course?cle=' + 'a'.repeat(20))).statut, 404);
  const r = await commander(api);
  assert.equal((await api('POST', '/commandes-en-ligne', { id: await idDe(api, jeton, r.commande.numero), statut: 'en_route' }, jeton)).statut, 400, 'le statut « en route » n’existe pas sans le chantier');
});

test('de la commande à la remise : attribution, récupération, code du client', async () => {
  const { api, jeton } = await demarrer('LivraisonActive=oui\n');
  // Livreurs : nom en majuscules corrigé, numéro vrai exigé
  assert.equal((await api('POST', '/livreurs', { nom: 'Karim', telephone: '0600000000' }, jeton)).statut, 400);
  const k = await api('POST', '/livreurs', { nom: 'KARIM benali', telephone: '0672581493' }, jeton);
  assert.equal(k.ok, true, JSON.stringify(k));
  assert.equal(k.livreur.nom, 'Karim Benali');
  const y = (await api('POST', '/livreurs', { nom: 'Younes', telephone: '0698147253' }, jeton)).livreur;
  assert.equal((await api('GET', '/livreurs', null, jeton)).livreurs.length, 2);
  // Commande en livraison
  const cmd = (await commander(api)).commande;
  const id = await idDe(api, jeton, cmd.numero);
  // Pas de livreur avant l'acceptation
  assert.equal((await api('POST', '/commandes-en-ligne/assigner', { id, livreurId: k.livreur.id }, jeton)).statut, 400);
  await api('POST', '/commandes-en-ligne', { id, statut: 'confirmee' }, jeton);
  const a1 = await api('POST', '/commandes-en-ligne/assigner', { id, livreurId: k.livreur.id }, jeton);
  assert.equal(a1.ok, true, JSON.stringify(a1));
  assert.equal(a1.commande.livreur.nom, 'Karim Benali');
  assert.match(a1.commande.lienCourse, /\/livraison\/\?c=[a-f0-9]{20}$/);
  const cle1 = a1.commande.lienCourse.split('=')[1];
  // Le livreur voit seulement cette course
  const c1 = await api('GET', '/public/course?cle=' + cle1);
  assert.equal(c1.course.client.adresse, '12 rue Ibn Sina');
  assert.equal(c1.course.total, 40);
  assert.equal(c1.course.boutique, 'Épicerie L2');
  assert.equal(JSON.stringify(c1).includes('code'), false, 'le code de remise n’est jamais montré au livreur');
  // Il ne peut pas livrer avant d'avoir récupéré
  assert.equal((await api('POST', '/public/course/statut', { cle: cle1, action: 'livre', code: '1234' })).statut, 400);
  // Changement de livreur : l'ancien lien ne marche plus
  const a2 = await api('POST', '/commandes-en-ligne/assigner', { id, livreurId: y.id }, jeton);
  const cle2 = a2.commande.lienCourse.split('=')[1];
  assert.notEqual(cle1, cle2);
  assert.equal((await api('GET', '/public/course?cle=' + cle1)).statut, 404);
  // Récupération : la commande est en route, le client voit son code
  assert.equal((await api('POST', '/public/course/statut', { cle: cle2, action: 'recupere' })).statut, 200);
  const suivi = await api('GET', '/public/commande-suivi?cle=' + cmd.suivi);
  assert.equal(suivi.commande.statut, 'en_route');
  assert.equal(suivi.commande.livreur, 'Younes');
  assert.match(suivi.commande.code, /^\d{4}$/);
  assert.equal((await api('POST', '/public/course/statut', { cle: cle2, action: 'recupere' })).statut, 400, 'déjà en route');
  // Mauvais code refusé, bon code termine la course
  const mauvais = suivi.commande.code === '1234' ? '4321' : '1234';
  const m = await api('POST', '/public/course/statut', { cle: cle2, action: 'livre', code: mauvais });
  assert.equal(m.statut, 400);
  assert.match(m.erreur, /pas le bon/);
  assert.equal((await api('POST', '/public/course/statut', { cle: cle2, action: 'livre', code: suivi.commande.code })).ok, true);
  const fin = await api('GET', '/public/commande-suivi?cle=' + cmd.suivi);
  assert.equal(fin.commande.statut, 'livree');
  assert.equal(fin.commande.code, null, 'le code disparaît une fois la commande livrée');
  const liste = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((x) => x.id === id);
  assert.equal(liste.statut, 'livree');
});

test('retrait : pas de livreur ; le code est limité à quelques essais', async () => {
  const { api, jeton } = await demarrer('LivraisonActive=oui\n');
  const l = (await api('POST', '/livreurs', { nom: 'Karim', telephone: '0672581493' }, jeton)).livreur;
  const r = (await commander(api, { mode: 'retrait', client: { nom: 'Sara', telephone: '0661482735' } })).commande;
  const idR = await idDe(api, jeton, r.numero);
  await api('POST', '/commandes-en-ligne', { id: idR, statut: 'confirmee' }, jeton);
  assert.equal((await api('POST', '/commandes-en-ligne/assigner', { id: idR, livreurId: l.id }, jeton)).statut, 400);
  // Un livreur désactivé n'est plus proposé
  const cmd = (await commander(api)).commande;
  const id = await idDe(api, jeton, cmd.numero);
  await api('POST', '/commandes-en-ligne', { id, statut: 'prete' }, jeton);
  await api('POST', '/livreurs', { id: l.id, nom: 'Karim', telephone: '0672581493', actif: false }, jeton);
  assert.equal((await api('POST', '/commandes-en-ligne/assigner', { id, livreurId: l.id }, jeton)).statut, 404);
  await api('POST', '/livreurs', { id: l.id, nom: 'Karim', telephone: '0672581493', actif: true }, jeton);
  const cle = (await api('POST', '/commandes-en-ligne/assigner', { id, livreurId: l.id }, jeton)).commande.lienCourse.split('=')[1];
  await api('POST', '/public/course/statut', { cle, action: 'recupere' });
  let derniere = 0;
  for (let i = 0; i < 6; i++) derniere = (await api('POST', '/public/course/statut', { cle, action: 'livre', code: String(1000 + i) })).statut;
  assert.equal(derniere, 429, 'après quelques essais, le code est bloqué');
});
