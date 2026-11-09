// Historique des ventes : périodes, filtres (vendeur, paiement, article, statut), recherche, regroupement par jour. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrerVentes, bornesHistorique, valeursDeFiltre } from '../src/lib/donnees/historique-ventes.js';

const maintenant = new Date(2026, 10, 18, 15, 0, 0); // mercredi 18 novembre 2026, 15 h
const iso = (m, j, h = 10) => new Date(2026, m, j, h, 0, 0).toISOString();
const vente = (id, numero, date, total, extra = {}) => ({ id, numero, date, total, remise: 0, paiement: 'Espèces', vendeurId: 'u1', vendeurNom: 'Awa', lignes: [{ nom: 'Attiéké', quantite: 1, total }], ...extra });
const ventes = [
  vente('a', 1, iso(10, 18, 9), 1000),
  vente('b', 2, iso(10, 18, 12), 2500, { paiement: 'Wave', vendeurId: 'u2', vendeurNom: 'Koffi', clientNom: 'Mme Traoré' }),
  vente('c', 3, iso(10, 17, 11), 700, { lignes: [{ nom: 'Huile 1 L', quantite: 1, total: 700 }] }),
  vente('d', 4, iso(10, 14, 16), 4000, { paiement: 'Crédit', clientNom: 'Moussa', remise: 200 }),
  vente('e', 5, iso(10, 2, 10), 900),
  vente('f', 6, iso(9, 28, 10), 1200, { annulee: { date: iso(9, 28, 11), par: 'Awa', motif: 'erreur' } }),
  vente('g', 7, iso(9, 20, 10), 3000),
];
const ids = (r) => r.liste.map((v) => v.id).join('');

test('périodes : aujourd’hui, hier, 7 jours, ce mois, mois dernier, tout', () => {
  assert.equal(ids(filtrerVentes(ventes, { periode: 'jour' }, maintenant)), 'ba');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'hier' }, maintenant)), 'c');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'semaine' }, maintenant)), 'bacd');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'mois' }, maintenant)), 'bacde');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'moisPrecedent' }, maintenant)), 'fg');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout' }, maintenant)), 'bacdefg');
});

test('période libre : du … au … inclus, une seule date, dates fausses = sans limite', () => {
  assert.equal(ids(filtrerVentes(ventes, { periode: 'dates', du: '2026-11-14', au: '2026-11-17' }, maintenant)), 'cd');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'dates', du: '2026-11-18', au: '2026-11-18' }, maintenant)), 'ba'); // le 18 est inclus en entier
  assert.equal(ids(filtrerVentes(ventes, { periode: 'dates', du: '2026-11-17', au: '' }, maintenant)), 'bac');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'dates', du: '', au: '2026-11-02' }, maintenant)), 'efg');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'dates', du: 'n’importe quoi', au: '2026-13-45' }, maintenant)), 'bacdefg');
  assert.deepEqual(bornesHistorique('tout'), { debut: null, fin: null });
});

test('filtres : vendeur, mode de paiement, statut', () => {
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', vendeurId: 'u2' }, maintenant)), 'b');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', paiement: 'Crédit' }, maintenant)), 'd');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', statut: 'annulees' }, maintenant)), 'f');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', statut: 'valides' }, maintenant)), 'bacdeg');
  // Un vendeur ne voit que ses propres ventes, quoi qu'il demande
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', seulementVendeurId: 'u2', vendeurId: 'u1' }, maintenant)), '');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', seulementVendeurId: 'u2' }, maintenant)), 'b');
});

test('recherche : numéro, client, vendeur, article (sans accents ni majuscules)', () => {
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', recherche: '4' }, maintenant)), 'd');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', recherche: 'traore' }, maintenant)), 'b');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', recherche: 'KOFFI' }, maintenant)), 'b');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', recherche: 'attieke' }, maintenant)), 'badefg');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', recherche: 'huile' }, maintenant)), 'c');
  assert.equal(ids(filtrerVentes(ventes, { periode: 'tout', recherche: 'introuvable' }, maintenant)), '');
});

test('résumé : total des ventes retenues sans les annulées, panier moyen, modes de paiement, remises, annulées à part', () => {
  const r = filtrerVentes(ventes, { periode: 'tout' }, maintenant).resume;
  assert.equal(r.nb, 6);
  assert.equal(r.total, 1000 + 2500 + 700 + 4000 + 900 + 3000);
  assert.equal(Math.round(r.panierMoyen), Math.round(r.total / 6));
  assert.equal(r.remises, 200);
  assert.equal(r.nbAnnulees, 1);
  assert.equal(r.totalAnnule, 1200);
  assert.deepEqual(r.parPaiement.map((p) => [p.mode, p.total, p.nb]), [['Espèces', 5600, 4], ['Crédit', 4000, 1], ['Wave', 2500, 1]]); // du plus gros au plus petit
});

test('regroupement par jour : le plus récent d’abord, total de chaque jour sans les annulées', () => {
  const j = filtrerVentes(ventes, { periode: 'tout' }, maintenant).jours;
  assert.deepEqual(j.map((x) => x.cle), ['2026-11-18', '2026-11-17', '2026-11-14', '2026-11-02', '2026-10-28', '2026-10-20']);
  assert.deepEqual(j.map((x) => x.total), [3500, 700, 4000, 900, 0, 3000]); // le 28 octobre : seulement une vente annulée
  assert.deepEqual(j.map((x) => x.nb), [2, 1, 1, 1, 0, 1]);
});

test('listes de filtres : modes de paiement et vendeurs présents', () => {
  const v = valeursDeFiltre(ventes);
  assert.deepEqual(v.paiements, ['Crédit', 'Espèces', 'Wave']);
  assert.deepEqual(v.vendeurs, [{ id: 'u1', nom: 'Awa' }, { id: 'u2', nom: 'Koffi' }]);
  assert.deepEqual(valeursDeFiltre(undefined), { paiements: [], vendeurs: [] });
});

test('aucune vente : tout est vide, sans erreur', () => {
  const r = filtrerVentes(undefined, { periode: 'mois' }, maintenant);
  assert.deepEqual(r.liste, []);
  assert.equal(r.resume.nb, 0);
  assert.equal(r.resume.panierMoyen, 0);
});
