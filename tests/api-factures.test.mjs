// Tests des factures d'abonnement (Amorac → abonnés) : une par paiement, numéros sans trou, TVA selon le pays, droits, paiement groupé.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-factures-'));
const fichierBase = path.join(dossier, 'test.sqlite');
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, support, maroc, ivoire;
const annee = new Date().getUTCFullYear();

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}
const inscrire = (nom, tel, pays, ville) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays, ville, quartier: 'Centre', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});
const payer = (commerce, montant, extra = {}) => api('POST', '/admin/paiement', { commerceId: commerce.commerce.id, mois: 1, postes: 1, montant, moyen: 'Virement', ...extra }, admin);

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nDefi=non\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  maroc = await inscrire('Épicerie Awa', '0612345701', 'MA', 'Casablanca');
  ivoire = await inscrire('Boutique Bako', '0712345711', 'CI', 'Abidjan');
  assert.equal(maroc.ok && ivoire.ok, true, JSON.stringify([maroc, ivoire]));
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.equal(install.ok, true, JSON.stringify(install));
  admin = install.jeton;
  assert.equal((await api('POST', '/admin/equipe', { nom: 'Aide', email: 'aide@kaislo.test', role: 'support', motDePasse: 'MotDePasse2026' }, admin)).ok, true);
  support = (await api('POST', '/admin/connexion', { email: 'aide@kaislo.test', motDePasse: 'MotDePasse2026' })).jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('un paiement crée sa facture : numéro, TVA comprise au Maroc, mention d’exportation ailleurs', async () => {
  const a = await payer(maroc, 1200);
  assert.equal(a.ok, true, JSON.stringify(a));
  const b = await payer(ivoire, 15000);
  assert.equal(b.ok, true, JSON.stringify(b));
  const l = await api('GET', '/admin/factures', null, admin);
  assert.deepEqual(l.factures.map((f) => f.numero).sort(), [`FAC-${annee}-0001`, `FAC-${annee}-0002`]);
  const fm = l.factures.find((f) => f.commerceId === maroc.commerce.id);
  assert.deepEqual([fm.totalHt, fm.tva, fm.totalTtc, fm.tvaTaux, fm.devise], [1000, 200, 1200, 20, 'MAD']);
  assert.equal(fm.mentionTva, '');
  assert.equal(fm.client.nom, 'Épicerie Awa');
  assert.equal(fm.client.pays, 'Maroc');
  assert.equal(fm.emetteur.identifiants.ICE, '003786356000083');
  assert.match(fm.lignes[0].designation, /Abonnement Kaislo/);
  assert.ok(fm.periode.au > fm.periode.du);
  const fc = l.factures.find((f) => f.commerceId === ivoire.commerce.id);
  assert.deepEqual([fc.totalHt, fc.tva, fc.totalTtc, fc.tvaTaux, fc.devise], [15000, 0, 15000, 0, 'FCFA']);
  assert.match(fc.mentionTva, /exportation de services/);
  assert.equal(fc.client.pays, 'Côte d’Ivoire');
});

test('numéros sans trou et sans doublon, une facture par paiement', async () => {
  const c = await payer(maroc, 1200);
  assert.equal(c.ok, true);
  const noms = (await api('GET', '/admin/factures', null, admin)).factures.map((f) => f.numero).sort();
  assert.deepEqual(noms, [`FAC-${annee}-0001`, `FAC-${annee}-0002`, `FAC-${annee}-0003`]);
  // Le détail des paiements indique le numéro de facture
  const fiche = await api('GET', '/admin/commerces', null, admin);
  const m = fiche.commerces.find((x) => x.commerce.id === maroc.commerce.id);
  assert.ok(m.commerce.abonnement.paiements.every((p) => /^FAC-/.test(p.facture)));
});

test('un gérant ne voit que ses factures ; le support lit', async () => {
  const deMaroc = await api('GET', '/factures', null, maroc.jeton);
  assert.equal(deMaroc.factures.length, 2);
  assert.ok(deMaroc.factures.every((f) => f.commerceId === maroc.commerce.id));
  assert.equal((await api('GET', '/factures', null, ivoire.jeton)).factures.length, 1);
  assert.equal((await api('GET', '/factures')).statut, 401);
  assert.equal((await api('GET', '/admin/factures', null, maroc.jeton)).statut, 401);
  assert.equal((await api('GET', '/admin/factures', null, support)).ok, true);
  const filtre = await api('GET', `/admin/factures?commerceId=${ivoire.commerce.id}`, null, admin);
  assert.equal(filtre.factures.length, 1);
});

test('il n’existe aucun moyen de créer une facture à la main : seul l’enregistrement d’un paiement en crée', async () => {
  assert.equal((await api('POST', '/admin/facture', { paiementId: 'x' }, admin)).statut, 404);
  assert.equal((await api('POST', '/factures', { paiementId: 'x' }, maroc.jeton)).statut, 404);
});

test('l’émetteur de la facture est celui de src/config.js', () => {
  const config = fs.readFileSync('src/config.js', 'utf8');
  for (const v of ['690767', '003786356000083', '68391830', '34215251', '5 Rue Annoussour, RDC, 20250 Casablanca, Maroc']) assert.ok(config.includes(v), v);
  assert.match(config, /formeJuridique: 'SARL',/); // la forme, jamais le capital
  assert.doesNotMatch(config, /capital de/i);
});

test('paiement groupé : une facture par commerce, numéros qui se suivent ; un paiement refusé ne laisse aucune facture', async () => {
  await new Promise((r) => setTimeout(r, 1100)); // les dates ont une précision d'une seconde
  const second = await api('POST', '/ajouter-commerce', { commerce: { nom: 'Annexe Awa', type: 'epicerie', ville: 'Rabat', quartier: 'Agdal' }, conditionsAcceptees: true, pin: '1234' }, maroc.jeton);
  assert.equal(second.statut, 201, JSON.stringify(second));
  const avant = (await api('GET', '/admin/factures', null, admin)).factures.length;
  const groupe = await api('POST', '/admin/paiement-groupe', { lignes: [{ commerceId: maroc.commerce.id, montant: 1200, mois: 1 }, { commerceId: second.commerce.id, montant: 600, mois: 1 }], moyen: 'Espèces' }, admin);
  assert.equal(groupe.ok, true, JSON.stringify(groupe));
  const apres = (await api('GET', '/admin/factures', null, admin)).factures;
  assert.equal(apres.length, avant + 2);
  const nouvelles = apres.filter((f) => [maroc.commerce.id, second.commerce.id].includes(f.commerceId) && f.reglement.moyen === 'Espèces');
  assert.equal(nouvelles.length, 2);
  const suites = nouvelles.map((f) => Number(f.numero.slice(-4))).sort((a, b) => a - b);
  assert.equal(suites[1], suites[0] + 1);
  // Un paiement invalide (montant nul) échoue sans créer de facture ni consommer de numéro
  assert.equal((await payer(maroc, 0)).ok, false);
  assert.equal((await api('GET', '/admin/factures', null, admin)).factures.length, avant + 2);
});

test('facture d’avoir : numéro propre AV-…, montants négatifs, TVA de la facture, jamais plus que la facture', async () => {
  const toutes = (await api('GET', '/admin/factures', null, admin)).factures;
  const fm = toutes.find((f) => f.commerceId === maroc.commerce.id && f.totalTtc === 1200);
  const fc = toutes.find((f) => f.commerceId === ivoire.commerce.id);
  // Droits et contrôles
  assert.equal((await api('POST', '/admin/avoir', { factureId: fm.id, montant: 100, motif: 'Geste commercial' }, support)).statut, 403);
  assert.equal((await api('POST', '/admin/avoir', { factureId: 'inconnue', montant: 100, motif: 'Erreur' }, admin)).statut, 404);
  assert.equal((await api('POST', '/admin/avoir', { factureId: fm.id, montant: 100, motif: '' }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/avoir', { factureId: fm.id, montant: 0, motif: 'Erreur de saisie' }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/avoir', { factureId: fm.id, montant: 1201, motif: 'Erreur de saisie' }, admin)).statut, 400);
  // Avoir partiel (Maroc : 600 TTC = 500 HT + 100 TVA, en négatif)
  const a1 = await api('POST', '/admin/avoir', { factureId: fm.id, montant: 600, motif: 'Remboursement partiel' }, admin);
  assert.equal(a1.statut, 201, JSON.stringify(a1));
  assert.equal(a1.avoir.numero, `AV-${annee}-0001`);
  assert.deepEqual([a1.avoir.totalHt, a1.avoir.tva, a1.avoir.totalTtc, a1.avoir.tvaTaux], [-500, -100, -600, 20]);
  assert.equal(a1.avoir.reference.factureNumero, fm.numero);
  assert.equal(a1.avoir.client.nom, 'Épicerie Awa');
  assert.match(a1.avoir.lignes[0].designation, new RegExp('Avoir sur la facture ' + fm.numero));
  // Sans montant : on crédite le reste ; ensuite plus rien à créditer
  const a2 = await api('POST', '/admin/avoir', { factureId: fm.id, motif: 'Annulation du reste' }, admin);
  assert.equal(a2.statut, 201, JSON.stringify(a2));
  assert.equal(a2.avoir.numero, `AV-${annee}-0002`);
  assert.equal(a2.avoir.totalTtc, -600);
  const trop = await api('POST', '/admin/avoir', { factureId: fm.id, montant: 1, motif: 'Encore' }, admin);
  assert.equal(trop.statut, 400);
  assert.match(trop.erreur || trop.message || '', /entièrement créditée/);
  // Hors Maroc : pas de TVA, mention reprise de la facture
  const a3 = await api('POST', '/admin/avoir', { factureId: fc.id, montant: 5000, motif: 'Geste commercial' }, admin);
  assert.deepEqual([a3.avoir.totalHt, a3.avoir.tva, a3.avoir.totalTtc], [-5000, 0, -5000]);
  assert.equal(a3.avoir.numero, `AV-${annee}-0003`);
  assert.match(a3.avoir.mentionTva, /exportation de services/);
  // Les factures ne changent pas ; le gérant voit ses avoirs ; la fiche indique les avoirs de chaque paiement
  const apres = (await api('GET', '/admin/factures', null, admin));
  assert.equal(apres.avoirs.length, 3);
  assert.equal(apres.factures.find((f) => f.id === fm.id).totalTtc, 1200);
  const duGerant = await api('GET', '/factures', null, maroc.jeton);
  assert.deepEqual(duGerant.avoirs.map((a) => a.numero).sort(), [`AV-${annee}-0001`, `AV-${annee}-0002`]);
  assert.equal((await api('GET', '/factures', null, ivoire.jeton)).avoirs.length, 1);
  const fiche = await api('GET', '/admin/commerces', null, admin);
  const paiement = fiche.commerces.find((x) => x.commerce.id === maroc.commerce.id).commerce.abonnement.paiements.find((p) => p.facture === fm.numero);
  assert.deepEqual(paiement.avoirs.map((a) => a.numero), [`AV-${annee}-0001`, `AV-${annee}-0002`]);
});
