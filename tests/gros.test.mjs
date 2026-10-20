// Vente en gros : prix du carton, stock en unités, marge, lignes séparées détail/gros. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aPrixGros, venteEnGros, produitPourMode, nettoyerGros } from '../src/lib/donnees/gros.js';
import { creerLigne, cleLigne, coutVente } from '../src/lib/donnees/vente.js';
import { avecStocks } from '../src/lib/donnees/stock.js';

const coca = {
  id: 'p1', nom: 'Coca 33 cl', prix: 500, promo: null, prixAchat: 300, unite: 'pièce', groupes: [],
  suiviStock: true, stockBase: 100, stockDepuis: '2026-01-01T00:00:00.000Z',
  gros: { prix: 10800, unite: 'carton', contenance: 24, minimum: 5 },
};

test('un article avec prix de gros valide est vendable en gros, pas un article à options', () => {
  assert.equal(aPrixGros(coca), true);
  assert.equal(aPrixGros({ ...coca, gros: null }), false);
  assert.equal(aPrixGros({ ...coca, gros: { prix: 0, contenance: 24 } }), false);
  assert.equal(aPrixGros({ ...coca, groupes: [{ id: 'g' }] }), false);
  assert.equal(venteEnGros({ produits: [{ ...coca, gros: null }] }), false);
  assert.equal(venteEnGros({ produits: [coca] }), true);
});

test('mode détail : l\'article est inchangé ; mode gros : prix, unité et coût du carton', () => {
  assert.equal(produitPourMode(coca, false), coca);
  const g = produitPourMode(coca, true);
  assert.equal(g.prix, 10800);
  assert.equal(g.prixAchat, 7200); // 300 × 24
  assert.equal(g._gros.contenance, 24);
  assert.equal(g._gros.minimum, 5);
  // Stock affiché en cartons entiers : 100 pièces = 4 cartons de 24
  assert.equal(produitPourMode({ ...coca, stockActuel: 100 }, true).stockActuel, 4);
  // Un article sans prix de gros reste tel quel, même en mode gros
  const sans = { ...coca, gros: null };
  assert.equal(produitPourMode(sans, true), sans);
});

test('ligne au carton : nom, total, coût et séparation d\'une ligne au détail', () => {
  const detail = creerLigne(produitPourMode(coca, false), {}, 3, 'FCFA');
  const gros = creerLigne(produitPourMode(coca, true), {}, 2, 'FCFA');
  assert.equal(detail.nom, 'Coca 33 cl');
  assert.equal(gros.nom, 'Coca 33 cl (carton de 24)');
  assert.equal(gros.prixUnitaire, 10800);
  assert.equal(gros.total, 21600);
  assert.equal(gros.contenance, 24);
  assert.equal(gros.coutUnitaire, 7200);
  assert.notEqual(cleLigne(detail), cleLigne(gros)); // deux lignes distinctes, jamais additionnées
  assert.equal(coutVente({ lignes: [gros] }), 14400);
});

test('le stock baisse de la contenance par carton vendu', () => {
  const detail = creerLigne(produitPourMode(coca, false), {}, 3, 'FCFA');
  const gros = creerLigne(produitPourMode(coca, true), {}, 2, 'FCFA');
  const d = { produits: [coca], mouvements: [], ventes: [{ id: 'v1', date: '2026-06-01T10:00:00.000Z', lignes: [detail, gros] }] };
  // 100 − 3 pièces − 2 cartons × 24 = 49
  assert.equal(avecStocks(d).produits[0].stockActuel, 49);
  // Vente annulée : le stock revient
  const annulee = { ...d, ventes: [{ ...d.ventes[0], annulee: true }] };
  assert.equal(avecStocks(annulee).produits[0].stockActuel, 100);
});

test('contenance différente de 24 : le prix d\'achat, la ligne et le stock suivent', () => {
  // Sac de riz vendu au kilo en détail, au sac de 12,5 kg en gros
  const riz = { id: 'p9', nom: 'Riz', prix: 800, prixAchat: 600, unite: 'kg', groupes: [], suiviStock: true, stockBase: 100, stockDepuis: '2026-01-01T00:00:00.000Z', gros: { prix: 9000, unite: 'sac', contenance: 12.5, minimum: 1 } };
  const g = produitPourMode(riz, true);
  assert.equal(g.prixAchat, 7500); // 600 × 12,5
  const ligne = creerLigne(g, {}, 3, 'FCFA');
  assert.equal(ligne.nom, 'Riz (sac de 12,5)');
  assert.equal(ligne.contenance, 12.5);
  const d = { produits: [riz], mouvements: [], ventes: [{ id: 'v', date: '2026-06-01T00:00:00.000Z', lignes: [ligne] }] };
  assert.equal(avecStocks(d).produits[0].stockActuel, 62.5); // 100 − 3 × 12,5
  // Carton de 6 : 2 cartons = 12 pièces
  const eau = { ...coca, gros: { prix: 2400, unite: 'carton', contenance: 6, minimum: 1 } };
  const d2 = { produits: [eau], mouvements: [], ventes: [{ id: 'v', date: '2026-06-01T00:00:00.000Z', lignes: [creerLigne(produitPourMode(eau, true), {}, 2, 'FCFA')] }] };
  assert.equal(avecStocks(d2).produits[0].stockActuel, 88);
});

test('fiche article : le bloc gros est vérifié', () => {
  assert.deepEqual(nettoyerGros(null), { gros: null });
  assert.match(nettoyerGros({ prix: null, contenance: 24 }).erreur, /prix de gros/);
  assert.match(nettoyerGros({ prix: 1000, contenance: 0 }).erreur, /unités/);
  assert.deepEqual(nettoyerGros({ prix: '10800', unite: 'sac', contenance: '24', minimum: '' }).gros, { prix: 10800, unite: 'sac', contenance: 24, minimum: 1 });
  // Un carton n'a pas toujours 24 pièces : 6, 12, 50… ou un sac de 12,5 kg
  assert.equal(nettoyerGros({ prix: 5000, contenance: 6 }).gros.contenance, 6);
  assert.equal(nettoyerGros({ prix: 5000, contenance: 12.5, unite: 'sac' }).gros.contenance, 12.5);
});
