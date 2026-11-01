// Historique des dépenses : périodes, recherche, regroupement par jour. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historiqueDepenses, debutPeriodeDepenses } from '../src/lib/donnees/depenses.js';

const maintenant = new Date(2026, 9, 31, 15, 0, 0); // samedi 31 octobre 2026, 15 h (heure locale)
const iso = (a, m, j, h = 10) => new Date(a, m, j, h, 0, 0).toISOString();
const depenses = [
  { id: 'd1', date: iso(2026, 9, 31, 9), montant: 200, categorie: 'Transport', note: 'Livraison marchandises', utilisateurNom: 'Awa' },
  { id: 'd2', date: iso(2026, 9, 31, 13), montant: 50, categorie: 'Eau', note: '', utilisateurNom: 'Awa' },
  { id: 'd3', date: iso(2026, 9, 28), montant: 1200, categorie: 'Loyer', note: 'Loyer', utilisateurNom: 'Moussa' },
  { id: 'd4', date: iso(2026, 9, 2), montant: 300, categorie: 'Électricité', note: 'Facture', utilisateurNom: 'Awa' },
  { id: 'd5', date: iso(2026, 8, 30), montant: 700, categorie: 'Stock', note: 'Réassort', utilisateurNom: 'Moussa' },
];

test('périodes : aujourd’hui, 7 jours, ce mois, tout', () => {
  const ids = (periode) => historiqueDepenses(depenses, { periode, maintenant }).jours.flatMap((j) => j.depenses.map((x) => x.id));
  assert.deepEqual(ids('jour'), ['d2', 'd1']);
  assert.deepEqual(ids('semaine'), ['d2', 'd1', 'd3']);
  assert.deepEqual(ids('mois'), ['d2', 'd1', 'd3', 'd4']);
  assert.deepEqual(ids('tout'), ['d2', 'd1', 'd3', 'd4', 'd5']);
  assert.equal(debutPeriodeDepenses('tout', maintenant), null);
});

test('regroupées par jour, le plus récent d’abord, avec le total de chaque jour et le total général', () => {
  const h = historiqueDepenses(depenses, { periode: 'mois', maintenant });
  assert.equal(h.jours.length, 3);
  assert.deepEqual(h.jours.map((j) => j.total), [250, 1200, 300]);
  assert.equal(h.total, 1750);
  assert.equal(h.nombre, 4);
});

test('recherche par note, catégorie, personne ou montant', () => {
  const noms = (recherche) => historiqueDepenses(depenses, { periode: 'tout', recherche, maintenant }).jours.flatMap((j) => j.depenses.map((x) => x.id));
  assert.deepEqual(noms('loyer'), ['d3']);
  assert.deepEqual(noms('moussa'), ['d3', 'd5']);
  assert.deepEqual(noms('1200'), ['d3']);
  assert.deepEqual(noms('élec'), ['d4']);
  assert.deepEqual(noms('zzz'), []);
});

test('aucune dépense : liste vide, total 0', () => {
  const h = historiqueDepenses(undefined, { periode: 'tout', maintenant });
  assert.deepEqual(h, { jours: [], total: 0, nombre: 0 });
});
