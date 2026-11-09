// Tests des achats et fournisseurs : dette, règlements, entrées de stock reliées à l'achat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerAchat, creerReglement, soldeFournisseur, fournisseursAvecSolde, totalDu, historiqueFournisseur } from '../src/lib/donnees/achats.js';
import { avecStocks } from '../src/lib/donnees/stock.js';

const base = () => ({
  commerce: { id: 'c1', devise: 'FCFA' },
  produits: [{ id: 'p1', nom: 'Riz', prixAchat: 500, suiviStock: true, stockBase: 10, stockDepuis: '2026-01-01T00:00:00.000Z' }, { id: 'p2', nom: 'Huile', prixAchat: 1500 }],
  fournisseurs: [{ id: 'f1', nom: 'Grossiste Awa' }, { id: 'f2', nom: 'Boulangerie Bako' }],
  achats: [], reglementsFournisseurs: [], mouvements: [], ventes: [],
});
const t = (h) => new Date(2026, 10, 9, h, 0, 0);

test('un achat : lignes, total, payé, mouvements d’entrée reliés', () => {
  const d = base();
  const r = creerAchat(d, { fournisseurId: 'f1', lignes: [{ produitId: 'p1', quantite: 20, prixAchat: 450 }, { produitId: 'p2', quantite: 4, prixAchat: 1600 }, { produitId: 'p2', quantite: 0, prixAchat: 1 }], paye: 5000, numeroFacture: ' F-12 ', utilisateurNom: 'Gérant', maintenant: t(9) });
  assert.equal(r.erreur, undefined);
  assert.equal(r.achat.lignes.length, 2);
  assert.equal(r.achat.total, 20 * 450 + 4 * 1600);
  assert.equal(r.achat.paye, 5000);
  assert.equal(r.achat.numeroFacture, 'F-12');
  assert.equal(r.mouvements.length, 2);
  assert.ok(r.mouvements.every((m) => m.type === 'entree' && m.achatId === r.achat.id && m.fournisseur === 'Grossiste Awa'));
  const d2 = { ...d, achats: [r.achat], mouvements: r.mouvements };
  assert.equal(avecStocks(d2).produits[0].stockActuel, 30);
  assert.equal(soldeFournisseur(d2, 'f1'), 15400 - 5000);
  assert.equal(soldeFournisseur(d2, 'f2'), 0);
});

test('erreurs : fournisseur inconnu, aucune ligne, prix manquant, payé supérieur au total', () => {
  const d = base();
  const ok = [{ produitId: 'p1', quantite: 2, prixAchat: 100 }];
  assert.equal(creerAchat(d, { fournisseurId: 'zz', lignes: ok }).erreur, 'fournisseur');
  assert.equal(creerAchat(d, { fournisseurId: 'f1', lignes: [] }).erreur, 'lignes');
  assert.equal(creerAchat(d, { fournisseurId: 'f1', lignes: [{ produitId: 'inconnu', quantite: 1, prixAchat: 1 }] }).erreur, 'lignes');
  assert.equal(creerAchat(d, { fournisseurId: 'f1', lignes: [{ produitId: 'p1', quantite: 2, prixAchat: null }] }).erreur, 'prix');
  assert.equal(creerAchat(d, { fournisseurId: 'f1', lignes: ok, paye: 201 }).erreur, 'paye');
  assert.equal(creerAchat(d, { fournisseurId: 'f1', lignes: ok, paye: -1 }).erreur, 'paye');
  assert.equal(creerAchat(d, { fournisseurId: 'f1', lignes: ok, paye: 200 }).achat.paye, 200);
});

test('règlements : la dette baisse, jamais en dessous de zéro, classement et total dû', () => {
  let d = base();
  d.achats = [creerAchat(d, { fournisseurId: 'f1', lignes: [{ produitId: 'p1', quantite: 10, prixAchat: 1000 }], paye: 2000, maintenant: t(8) }).achat, creerAchat(d, { fournisseurId: 'f2', lignes: [{ produitId: 'p1', quantite: 1, prixAchat: 3000 }], paye: 0, maintenant: t(9) }).achat];
  assert.equal(soldeFournisseur(d, 'f1'), 8000);
  assert.equal(creerReglement(d, { fournisseurId: 'f1', montant: 0 }).erreur, 'montant');
  assert.equal(creerReglement(d, { fournisseurId: 'f1', montant: 8001 }).erreur, 'trop');
  assert.equal(creerReglement(d, { fournisseurId: 'zz', montant: 1 }).erreur, 'fournisseur');
  const r = creerReglement(d, { fournisseurId: 'f1', montant: 3000, mode: 'Espèces', maintenant: t(12) }).reglement;
  d = { ...d, reglementsFournisseurs: [r] };
  assert.equal(soldeFournisseur(d, 'f1'), 5000);
  assert.equal(totalDu(d), 8000);
  const liste = fournisseursAvecSolde(d);
  assert.deepEqual(liste.map((f) => [f.id, f.solde, f.nbAchats]), [['f1', 5000, 1], ['f2', 3000, 1]]);
  assert.equal(creerReglement(d, { fournisseurId: 'f1', montant: 5000 }).reglement.montant, 5000);
  const h = historiqueFournisseur(d, 'f1');
  assert.deepEqual(h.map((x) => x.type), ['reglement', 'achat']);
});
