// Tests du stock calculé à partir des mouvements : plusieurs appareils qui vendent sans internet ne s'écrasent plus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecStocks, stockDe, departStock, memeProduit, produitPourServeur, DEPUIS_ANCIENS } from '../src/lib/donnees/stock.js';
import { noterChangements, chargerFile } from '../src/lib/donnees/synchro.js';

const t0 = '2026-10-10T08:00:00.000Z';
const t = (h) => `2026-10-10T${String(h).padStart(2, '0')}:00:00.000Z`;
const produit = (extra = {}) => ({ id: 'p1', nom: 'Huile', suiviStock: true, ...departStock(10, t0), ...extra });
const vente = (id, h, quantite, extra = {}) => ({ id, date: t(h), lignes: [{ produitId: 'p1', quantite, total: 1000 * quantite }], ...extra });
const donnees = (produits, ventes = [], mouvements = []) => ({ commerce: { id: 'c1', serveur: true }, produits, ventes, mouvements });

test('stock = départ + entrées − ventes, les ventes annulées ne comptent pas', () => {
  const d = avecStocks(donnees([produit()], [vente('v1', 9, 3), vente('v2', 10, 2, { annulee: { par: 'Gérant' } })], [
    { id: 'm1', date: t(11), produitId: 'p1', type: 'entree', quantite: 5 },
    { id: 'm2', date: t(12), produitId: 'p1', type: 'ajustement', quantite: -1 },
  ]));
  assert.equal(stockDe(d.produits[0]), 10 - 3 + 5 - 1);
});

test('ce qui est daté avant le départ du stock est ignoré', () => {
  const d = avecStocks(donnees([produit()], [{ ...vente('v0', 9, 4), date: '2026-10-09T08:00:00.000Z' }]));
  assert.equal(stockDe(d.produits[0]), 10);
});

test('deux appareils vendent sans internet : une fois synchronisés, le stock est juste (3 + 2 vendus sur 10 = 5)', () => {
  // Avant : chaque appareil écrivait « stock = 7 » ou « stock = 8 » et le dernier gagnait → 7 ou 8 (faux)
  const appareilA = avecStocks(donnees([produit()], [vente('vA', 9, 3)]));
  const appareilB = avecStocks(donnees([produit()], [vente('vB', 10, 2)]));
  assert.equal(stockDe(appareilA.produits[0]), 7);
  assert.equal(stockDe(appareilB.produits[0]), 8);
  // Synchronisation : chaque appareil reçoit les ventes de l'autre (les ventes ne se modifient jamais : aucun conflit)
  const fusionA = avecStocks({ ...appareilA, ventes: [...appareilA.ventes, ...appareilB.ventes] });
  const fusionB = avecStocks({ ...appareilB, ventes: [...appareilB.ventes, ...appareilA.ventes] });
  assert.equal(stockDe(fusionA.produits[0]), 5);
  assert.equal(stockDe(fusionB.produits[0]), 5); // même résultat quel que soit l'ordre
});

test('produit d’avant le changement : l’ancien champ « stock » sert de départ, compté depuis la date de bascule', () => {
  const ancien = { id: 'p1', nom: 'Riz', suiviStock: true, stock: 20 };
  const d = avecStocks(donnees([ancien], [{ ...vente('v1', 9, 4), date: '2026-10-04T10:00:00.000Z' }, { ...vente('v2', 9, 3), date: '2026-10-06T10:00:00.000Z' }]));
  assert.ok('2026-10-06T10:00:00.000Z' >= DEPUIS_ANCIENS);
  assert.equal(stockDe(d.produits[0]), 17); // la vente du 4 est déjà dans l'ancien nombre, celle du 6 est comptée
});

test('un produit dont le stock ne change pas garde le même objet ; un produit sans suivi n’a pas de stock calculé', () => {
  const d1 = avecStocks(donnees([produit(), { id: 'p2', nom: 'Sel', suiviStock: false }], [vente('v1', 9, 1)]));
  const d2 = avecStocks({ ...d1, ventes: [...d1.ventes] }); // même contenu, nouvelle liste
  assert.equal(d2.produits[0], d1.produits[0]);
  assert.equal(d1.produits[1].stockActuel, undefined);
});

test('le stock calculé ne compte pas comme une modification du produit et ne part pas au serveur', () => {
  const avant = avecStocks(donnees([produit()]));
  const apres = avecStocks({ ...avant, ventes: [vente('v1', 9, 2)] });
  assert.notEqual(apres.produits[0], avant.produits[0]); // le stock a changé…
  assert.equal(memeProduit(avant.produits[0], apres.produits[0]), true); // …mais ce n'est pas une modification de la fiche
  assert.equal('stockActuel' in produitPourServeur(apres.produits[0]), false);
  assert.equal(memeProduit(apres.produits[0], { ...apres.produits[0], prix: 999 }), false);

  noterChangements(avant, apres);
  const file = chargerFile('c1');
  assert.ok(file['ventes:v1'], 'la vente doit partir au serveur');
  assert.equal(file['produits:p1'], undefined, 'la fiche produit ne doit pas être renvoyée à chaque vente');
});
