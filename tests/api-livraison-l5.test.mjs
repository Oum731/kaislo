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
  const g = await api('POST', '/inscription', { commerce: { nom: 'Épicerie L5', type: 'epicerie', pays: 'MA', ville: 'Casablanca', quartier: 'Maarif', telephone: '0612340001' }, gerant: { nom: 'Hassan', telephone: '0612340002', pin: '1234' }, conditionsAcceptees: true });
  assert.equal(g.statut, 201, JSON.stringify(g));
  await api('POST', '/donnees', { elements: [{ type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Lait', prix: 100, actif: true, enLigne: true, groupes: [] } }] }, g.jeton);
  assert.equal((await api('POST', '/boutique', { actif: true, slug: 'epicerie-l4', whatsapp: '0612340001', conditionsAcceptees: true, fraisLivraison: 10 }, g.jeton)).ok, true);
  const adm = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  return { api, jeton: g.jeton, admin: adm.jeton };
}

after(() => { serveurs.forEach((s) => s.kill()); fs.rmSync(dossier, { recursive: true, force: true }); });
const ACTIF = 'LivraisonActive=oui\nLivraisonOptions=independants\nCommissionLivreur=20\n';
const inscrire = (api, plus = {}) => api('POST', '/public/livreur/inscription', { nom: 'Youssef Amrani', telephone: '0661482735', pays: 'MA', ville: 'Casablanca', vehicule: 'moto', conditionsAcceptees: true, ...plus });

async function commandeConfirmee(api, jeton) {
  const r = await api('POST', '/public/commande', { b: 'epicerie-l4', client: { nom: 'Sara', telephone: '0661482735', adresse: '12 rue Ibn Sina' }, lignes: [{ produitId: 'p1', quantite: 2 }] });
  assert.equal(r.statut, 201, JSON.stringify(r));
  const liste = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes;
  const c = liste.find((x) => x.numero === r.commande.numero);
  assert.equal((await api('POST', '/commandes-en-ligne', { id: c.id, statut: 'confirmee' }, jeton)).ok, true);
  return { id: c.id, suivi: r.commande.suivi };
}

test('option coupée : aucune route des livreurs indépendants', async () => {
  const { api, jeton } = await demarrer('LivraisonActive=oui\n');
  assert.equal((await inscrire(api)).statut, 404);
  assert.equal((await api('GET', '/public/livreur?k=' + 'a'.repeat(20))).statut, 404);
  assert.equal((await api('POST', '/commandes-en-ligne/offrir', { id: 'x', prix: 20 }, jeton)).statut, 404);
});

test('inscription contrôlée : numéro réel, conditions, doublon', async () => {
  const { api } = await demarrer(ACTIF);
  assert.equal((await inscrire(api, { conditionsAcceptees: false })).statut, 400);
  assert.equal((await inscrire(api, { telephone: '0600000000' })).statut, 400);
  assert.equal((await inscrire(api, { vehicule: 'fusee' })).statut, 400);
  assert.equal((await inscrire(api)).statut, 201);
  assert.equal((await inscrire(api, { nom: 'Autre' })).statut, 409);
});

test('de l’inscription à la commission : validation, offre, acceptation unique, livraison', async () => {
  const { api, jeton, admin } = await demarrer(ACTIF);
  assert.equal((await inscrire(api)).statut, 201);
  assert.equal((await inscrire(api, { nom: 'Karim Idrissi', telephone: '0661482799' })).statut, 201);
  // L'équipe voit les deux demandes et en valide deux
  const liste = await api('GET', '/admin/livreurs', null, admin);
  assert.equal(liste.enAttente, 2);
  assert.equal((await api('GET', '/admin/livreurs')).statut, 401);
  const [a, b] = liste.livreurs;
  const va = (await api('POST', '/admin/livreurs', { id: a.id, action: 'valider' }, admin)).livreur;
  const vb = (await api('POST', '/admin/livreurs', { id: b.id, action: 'valider' }, admin)).livreur;
  const cleA = va.lien.split('k=')[1], cleB = vb.lien.split('k=')[1];
  assert.match(cleA, /^[a-f0-9]{20}$/);
  assert.equal((await api('GET', '/public/livreur?k=' + 'f'.repeat(20))).statut, 404);
  // Indisponible : aucune offre
  const { id, suivi } = await commandeConfirmee(api, jeton);
  assert.equal((await api('POST', '/commandes-en-ligne/offrir', { id, prix: 0 }, jeton)).statut, 400);
  const offre = await api('POST', '/commandes-en-ligne/offrir', { id, prix: 25 }, jeton);
  assert.equal(offre.ok, true, JSON.stringify(offre));
  assert.deepEqual((await api('GET', '/public/livreur?k=' + cleA)).offres, []);
  // Disponible dans la même ville : l'offre apparaît, avec la commission annoncée
  assert.equal((await api('POST', '/public/livreur/etat', { k: cleA, disponible: true })).disponible, true);
  assert.equal((await api('POST', '/public/livreur/etat', { k: cleB, disponible: true })).disponible, true);
  const vue = await api('GET', '/public/livreur?k=' + cleA);
  assert.equal(vue.offres.length, 1);
  assert.equal(vue.offres[0].prix, 25);
  assert.equal(vue.offres[0].commission, 5);
  // Le premier qui accepte gagne, le second est refusé
  const [x, y] = await Promise.all([
    api('POST', '/public/livreur/accepter', { k: cleA, offre: id }),
    api('POST', '/public/livreur/accepter', { k: cleB, offre: id }),
  ]);
  assert.equal([x, y].filter((r) => r.ok).length, 1, JSON.stringify([x, y]));
  assert.equal([x, y].filter((r) => r.statut === 409).length, 1);
  const gagnant = x.ok ? x : y;
  const cleCourse = gagnant.lienCourse.split('?c=')[1];
  // La commande a un livreur ; plus d'offre ; la course se déroule comme au lot L2
  const cmd = (await api('GET', '/commandes-en-ligne', null, jeton)).commandes.find((c) => c.id === id);
  assert.equal(cmd.livreur.nom.length > 0, true);
  const c = await api('GET', '/public/course?cle=' + cleCourse);
  assert.equal(c.statut, 200);
  assert.equal((await api('POST', '/public/course/statut', { cle: cleCourse, action: 'recupere' })).etat, 'en_route');
  const code = (await api('GET', '/public/commande-suivi?cle=' + suivi)).commande.code;
  assert.match(code, /^\d{4}$/);
  assert.equal((await api('POST', '/public/course/statut', { cle: cleCourse, action: 'livre', code })).etat, 'livree');
  // Commission fixée à la livraison, due à Kaislo tant qu'elle n'est pas réglée
  const apres = await api('GET', '/admin/livreurs', null, admin);
  const livreur = apres.livreurs.find((l) => l.gains.courses === 1);
  assert.equal(livreur.gains.brut, 25);
  assert.equal(livreur.gains.net, 20);
  assert.equal(livreur.gains.commissionDue, 5);
  const regle = await api('POST', '/admin/livreurs', { id: livreur.id, action: 'regler' }, admin);
  assert.equal(regle.livreur.gains.commissionDue, 0);
  // Suspendu : son lien ne marche plus
  const cleLivreur = livreur.lien.split('k=')[1];
  await api('POST', '/admin/livreurs', { id: livreur.id, action: 'suspendre' }, admin);
  assert.equal((await api('GET', '/public/livreur?k=' + cleLivreur)).statut, 404);
});

test('une offre annulée ou expirée n’est plus proposée ; une offre n’est pas visible hors de la ville', async () => {
  const { api, jeton, admin } = await demarrer(ACTIF);
  await inscrire(api);
  await inscrire(api, { nom: 'Omar Benali', telephone: '0661482788', ville: 'Rabat' });
  const [a, b] = (await api('GET', '/admin/livreurs', null, admin)).livreurs;
  const cles = [];
  for (const l of [a, b]) { const v = (await api('POST', '/admin/livreurs', { id: l.id, action: 'valider' }, admin)).livreur; cles.push([v.ville, v.lien.split('k=')[1]]); }
  for (const [, k] of cles) await api('POST', '/public/livreur/etat', { k, disponible: true });
  const { id } = await commandeConfirmee(api, jeton);
  await api('POST', '/commandes-en-ligne/offrir', { id, prix: 30 }, jeton);
  const parVille = Object.fromEntries(await Promise.all(cles.map(async ([v, k]) => [v, (await api('GET', '/public/livreur?k=' + k)).offres.length])));
  assert.deepEqual(parVille, { Casablanca: 1, Rabat: 0 });
  await api('POST', '/commandes-en-ligne/offrir', { id, annuler: true }, jeton);
  const [ville, k] = cles.find(([v]) => v === 'Casablanca');
  assert.equal((await api('GET', '/public/livreur?k=' + k)).offres.length, 0, ville);
  assert.equal((await api('POST', '/public/livreur/accepter', { k, offre: id })).statut, 409);
});
