// Tests du retour d'article : montants (remise comprise), restes, effets sur les totaux, la caisse, le stock, le crédit et le nombre de tickets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerRetour, lignesRetournables, resteARendre, retourPossible, montantLigneRendue, retoursDe, estRetour } from '../src/lib/donnees/retours.js';
import { calculerStats } from '../src/lib/donnees/statistiques.js';
import { calculerCloture } from '../src/lib/donnees/cloture.js';
import { avecStocks } from '../src/lib/donnees/stock.js';
import { filtrerVentes } from '../src/lib/donnees/historique-ventes.js';
import { soldeClient } from '../src/lib/donnees/credit.js';
import { journalActivite } from '../src/lib/donnees/journal.js';

const maintenant = new Date(2026, 10, 9, 15, 0, 0);
const iso = (h) => new Date(2026, 10, 9, h, 0, 0).toISOString();
const ligne = (id, nom, q, pu, cout) => ({ produitId: id, produitNom: nom, nom, quantite: q, prixUnitaire: pu, total: q * pu, coutUnitaire: cout, details: [] });
// 2 sacs de riz à 1000 + 1 huile à 2000 = 4000, remise de 400 -> 3600 payés
const vente = { id: 'v1', numero: 7, date: iso(10), vendeurId: 'u1', vendeurNom: 'Awa', paiement: 'Espèces', clientId: null, lignes: [ligne('p1', 'Riz', 2, 1000, 600), ligne('p2', 'Huile', 1, 2000, 1500)], sousTotal: 4000, remise: 400, total: 3600 };
const donnees = (ventes = [vente], extra = {}) => ({
  commerce: { id: 'c1', devise: 'FCFA', modesPaiement: ['Espèces', 'Wave'] }, prochainNumero: 8, ventes, depenses: [], clients: [], mouvements: [],
  produits: [{ id: 'p1', nom: 'Riz', suiviStock: true, stockBase: 10, stockDepuis: '2026-01-01T00:00:00.000Z' }, { id: 'p2', nom: 'Huile', suiviStock: true, stockBase: 5, stockDepuis: '2026-01-01T00:00:00.000Z' }], ...extra,
});
const options = { mode: 'Espèces', motif: 'Article abîmé', vendeur: { id: 'u1', nom: 'Awa' }, gerantNom: 'Gérant', maintenant: new Date(2026, 10, 9, 14, 0, 0) };

test('le montant rendu est le prix payé : la remise se répartit sur les articles', () => {
  const d = donnees();
  assert.equal(montantLigneRendue(vente, vente.lignes[0], 1, 'FCFA'), 900); // 1000 × 3600/4000
  assert.equal(montantLigneRendue(vente, vente.lignes[1], 1, 'FCFA'), 1800);
  const r = creerRetour(d, vente, { 0: 1, 1: 1 }, options).retour;
  assert.equal(r.total, -2700);
  assert.equal(r.numero, 'R1');
  assert.equal(r.retourDe, 'v1');
  assert.equal(r.retourDeNumero, 7);
  assert.equal(r.lignes[0].quantite, -1);
  assert.equal(r.lignes[0].total, -900);
  assert.equal(r.lignes[0].coutUnitaire, 600);
  assert.equal(r.sousTotal, r.total);
  assert.equal(estRetour(r), true);
});

test('erreurs : rien à rendre, trop, motif manquant, crédit sans client, deuxième retour', () => {
  const d = donnees();
  assert.equal(creerRetour(d, vente, {}, options).erreur, 'rien');
  assert.equal(creerRetour(d, vente, { 0: 3 }, options).erreur, 'trop');
  assert.equal(creerRetour(d, vente, { 0: 1 }, { ...options, motif: '  ' }).erreur, 'motif');
  assert.equal(creerRetour(d, vente, { 0: 1 }, { ...options, mode: 'Crédit' }).erreur, 'mode');
  const r1 = creerRetour(d, vente, { 0: 2 }, options).retour;
  const d2 = donnees([vente, r1]);
  assert.equal(resteARendre(d2, vente), 1800);
  assert.deepEqual(lignesRetournables(d2, vente).map((l) => l.reste), [0, 1]);
  assert.equal(creerRetour(d2, vente, { 0: 1 }, options).erreur, 'trop');
  const r2 = creerRetour(d2, vente, { 1: 1 }, options).retour;
  assert.equal(r2.numero, 'R2');
  const d3 = donnees([vente, r1, r2]);
  assert.equal(resteARendre(d3, vente), 0);
  assert.equal(retourPossible(d3, vente), false);
  assert.equal(retoursDe(d3, vente).length, 2);
  assert.equal(retourPossible(d3, r1), false); // un retour ne reçoit pas de retour
});

test('chiffre d’affaires, tickets et panier moyen : le retour baisse le total sans compter comme ticket', () => {
  const r = creerRetour(donnees(), vente, { 0: 1 }, options).retour; // 900 rendus
  const st = calculerStats([vente, r], 'jour', maintenant, []);
  assert.equal(st.total, 2700);
  assert.equal(st.nb, 1);
  assert.equal(st.panierMoyen, 2700);
  const riz = st.produits.find((p) => p.nom === 'Riz');
  assert.equal(riz.quantite, 1);
});

test('caisse : les espèces rendues baissent l’argent attendu ; les tickets ne comptent pas le retour', () => {
  const r = creerRetour(donnees(), vente, { 0: 1 }, options).retour;
  const d = donnees([vente, r]);
  const c = calculerCloture(d, new Date(2026, 10, 9, 8, 0, 0), new Date(2026, 10, 9, 23, 0, 0), 5000);
  assert.equal(c.nbVentes, 1);
  assert.equal(c.totalVentes, 2700);
  assert.equal(c.attendu, 5000 + 2700);
  assert.equal(c.parPaiement.find((p) => p.mode === 'Espèces').nb, 1);
});

test('stock : l’article rendu revient, sauf s’il est abîmé', () => {
  const stock = (d, id) => avecStocks(d).produits.find((p) => p.id === id).stockActuel;
  assert.equal(stock(donnees(), 'p1'), 8);
  const bon = creerRetour(donnees(), vente, { 0: 1 }, options).retour;
  assert.equal(stock(donnees([vente, bon]), 'p1'), 9);
  const abime = creerRetour(donnees(), vente, { 0: 1 }, { ...options, remettreEnStock: false }).retour;
  assert.equal(abime.lignes[0].horsStock, true);
  assert.equal(stock(donnees([vente, abime]), 'p1'), 8);
});

test('crédit : rendre « sur la dette » baisse le solde du client', () => {
  const credit = { ...vente, id: 'v2', paiement: 'Crédit', clientId: 'k1', clientNom: 'Bako' };
  const d = donnees([credit], { clients: [{ id: 'k1', nom: 'Bako' }] });
  assert.equal(soldeClient(d, 'k1'), 3600);
  const r = creerRetour(d, credit, { 0: 1 }, { ...options, mode: 'Crédit' }).retour;
  assert.equal(r.clientId, 'k1');
  assert.equal(soldeClient(donnees([credit, r], { clients: d.clients }), 'k1'), 2700);
});

test('historique et journal : le retour est listé, pas compté en ticket, et signalé à surveiller', () => {
  const r = creerRetour(donnees(), vente, { 0: 1 }, options).retour;
  const h = filtrerVentes([vente, r], { periode: 'jour' }, maintenant);
  assert.equal(h.liste.length, 2);
  assert.equal(h.resume.nb, 1);
  assert.equal(h.resume.total, 2700);
  assert.equal(h.jours[0].nb, 1);
  const j = journalActivite({ ventes: [vente, r] }, { periode: 'jour', type: 'retour' }, maintenant);
  assert.equal(j.lignes.length, 1);
  assert.equal(j.lignes[0].total, 900);
  assert.equal(j.lignes[0].par, 'Gérant');
});
