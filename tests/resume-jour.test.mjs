// Résumé du jour (accueil du gérant) : comparaisons, article le plus vendu, heure de pointe, à racheter, repli sur hier. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumeDuJour, resumeTexteWhatsApp } from '../src/lib/donnees/resume-jour.js';

const maintenant = new Date(2026, 10, 18, 15, 0, 0); // mercredi 18 novembre 2026, 15 h
const quand = (m, j, h, min = 0) => new Date(2026, m, j, h, min, 0).toISOString();
const vente = (id, date, total, lignes, extra = {}) => ({ id, numero: Number(id.replace(/\D/g, '')) || 1, date, total, remise: 0, paiement: 'Espèces', vendeurId: 'u1', vendeurNom: 'Awa', lignes, ...extra });
const ligne = (produitId, nom, quantite, total) => ({ produitId, produitNom: nom, nom, quantite, total });
const prix = (n) => Math.round(n) + ' FCFA';

const base = () => ({
  commerce: { nom: 'Chez Awa', devise: 'FCFA' },
  produits: [
    { id: 'p1', nom: 'Attiéké', actif: true, suiviStock: true, stockActuel: 2, seuilAlerte: 5 },
    { id: 'p2', nom: 'Huile', actif: true, suiviStock: true, stockActuel: 0, seuilAlerte: 5 },
    { id: 'p3', nom: 'Riz', actif: true, suiviStock: true, stockActuel: 40, seuilAlerte: 5 },
    { id: 'p4', nom: 'Sucre', actif: true, suiviStock: false, stockActuel: 0 },
  ],
  depenses: [{ id: 'd1', date: quand(10, 18, 9), montant: 500, categorie: 'Transport' }],
  ventes: [
    // aujourd'hui (jusqu'à 15 h) : 12 000 en 6 tickets, dont 3 entre 12 h et 13 h
    vente('v1', quand(10, 18, 8), 1000, [ligne('p1', 'Attiéké', 2, 1000)]),
    vente('v2', quand(10, 18, 12, 5), 2000, [ligne('p1', 'Attiéké', 4, 2000)]),
    vente('v3', quand(10, 18, 12, 20), 3000, [ligne('p3', 'Riz', 3, 3000)]),
    vente('v4', quand(10, 18, 12, 40), 2500, [ligne('p1', 'Attiéké', 5, 2500)]),
    vente('v5', quand(10, 18, 14), 1500, [ligne('p2', 'Huile', 1, 1500)]),
    vente('v6', quand(10, 18, 14, 30), 2000, [ligne('p3', 'Riz', 2, 2000)]),
    vente('v7', quand(10, 18, 13, 30), 999, [ligne('p1', 'Attiéké', 1, 999)], { annulee: { date: quand(10, 18, 13, 40), par: 'Awa', motif: '' } }),
    // hier : 8 000 avant 15 h + 5 000 après (hors comparaison « au même moment »)
    vente('v8', quand(10, 17, 10), 8000, [ligne('p3', 'Riz', 8, 8000)]),
    vente('v9', quand(10, 17, 18), 5000, [ligne('p3', 'Riz', 5, 5000)]),
    // mercredi dernier : 6 000 avant 15 h
    vente('v10', quand(10, 11, 11), 6000, [ligne('p3', 'Riz', 6, 6000)]),
  ],
});

test('le résumé du jour : chiffre, tickets, panier moyen, comparaisons au même moment, plus vendu, heure de pointe, annulées, dépenses', () => {
  const r = resumeDuJour(base(), maintenant);
  assert.equal(r.estHier, false);
  assert.equal(r.total, 12000);
  assert.equal(r.nb, 6);
  assert.equal(r.panierMoyen, 2000);
  assert.equal(r.vsHier, 50); // 12 000 contre 8 000 à la même heure hier (les 5 000 de 18 h ne comptent pas)
  assert.equal(r.vsSemaine, 100); // 12 000 contre 6 000 mercredi dernier
  assert.deepEqual(r.meilleurArticle, { nom: 'Attiéké', quantite: 11, total: 5500 }); // 2 + 4 + 5 (la vente annulée ne compte pas)
  assert.deepEqual(r.heurePointe, { heure: 12, nb: 3 });
  assert.equal(r.depenses, 500);
  assert.deepEqual(r.annulees, { nb: 1, total: 999 });
});

test('à racheter : articles à stock suivi sous le seuil, le plus bas d’abord ; un article sans suivi de stock n’y est jamais', () => {
  const r = resumeDuJour(base(), maintenant);
  assert.deepEqual(r.aRacheter, [{ nom: 'Huile', reste: 0 }, { nom: 'Attiéké', reste: 2 }]);
  assert.equal(r.nbARacheter, 2);
});

test('marge : absente tant que les prix d’achat sont inconnus, calculée sinon', () => {
  assert.equal(resumeDuJour(base(), maintenant).marge, null);
  const d = base();
  d.ventes = d.ventes.map((v) => ({ ...v, lignes: v.lignes.map((l) => ({ ...l, coutUnitaire: l.total / l.quantite / 2 })) }));
  const r = resumeDuJour(d, maintenant);
  assert.equal(r.marge, 6000); // la moitié du chiffre d'affaires de 12 000
  assert.equal(r.tauxMarge, 50);
});

test('aucune vente aujourd’hui : le résumé porte sur hier, toute la journée', () => {
  const d = base();
  d.ventes = d.ventes.filter((v) => new Date(v.date).getDate() !== 18);
  const r = resumeDuJour(d, maintenant);
  assert.equal(r.estHier, true);
  assert.equal(r.jour.getDate(), 17);
  assert.equal(r.total, 13000);
  assert.equal(r.nb, 2);
});

test('aucune vente du tout : pas de résumé', () => {
  assert.equal(resumeDuJour({ ventes: [], produits: [], depenses: [] }, maintenant), null);
  assert.equal(resumeDuJour({ ventes: [vente('v1', quand(10, 18, 9), 1000, [ligne('p1', 'A', 1, 1000)], { annulee: {} })] }, maintenant), null);
});

test('peu de ventes : pas d’heure de pointe inventée', () => {
  const d = base();
  d.ventes = [vente('v1', quand(10, 18, 9), 1000, [ligne('p1', 'Attiéké', 1, 1000)]), vente('v2', quand(10, 18, 11), 1000, [ligne('p1', 'Attiéké', 1, 1000)])];
  assert.equal(resumeDuJour(d, maintenant).heurePointe, null);
});

test('le texte WhatsApp reprend le résumé : chiffres, comparaisons, plus vendu, à racheter, signature', () => {
  const r = resumeDuJour(base(), maintenant);
  const t = resumeTexteWhatsApp(r, { commerce: { nom: 'Chez Awa' }, prix, dateLongue: 'Mercredi 18 novembre' });
  assert.match(t, /Chez Awa/);
  assert.match(t, /12000 FCFA/);
  assert.match(t, /6 tickets/);
  assert.match(t, /\+50 %/);
  assert.match(t, /\+100 %/);
  assert.match(t, /Attiéké \(11\)/);
  assert.match(t, /12 h/);
  assert.match(t, /Huile \(0\), Attiéké \(2\)/);
  assert.match(t, /Fait avec Kaislo/);
  assert.doesNotMatch(t, /Marge/);
});
