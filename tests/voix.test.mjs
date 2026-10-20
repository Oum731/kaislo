// Voix du mode illustré : phrases lues (montants, panier). Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montantParle, phrasePanier } from '../src/lib/voix.js';

test('montants dits avec le nom de la monnaie', () => {
  assert.equal(montantParle(2500, 'FCFA'), '2500 francs CFA');
  assert.equal(montantParle(1, 'EUR'), '1 euro');
  assert.equal(montantParle(12.5, 'MAD'), '12 virgule 50 dirhams');
  assert.equal(montantParle(0, 'MAD'), '0 dirhams');
  assert.equal(montantParle(1000, 'GNF'), '1000 francs guinéens');
});

test('phrase du panier : nombre d\'articles, noms avec quantités, total', () => {
  const lignes = [{ produitNom: 'Attiéké', quantite: 2 }, { produitNom: 'Garba', quantite: 1 }];
  assert.equal(phrasePanier(lignes, 5000, 'FCFA'), '3 articles : 2 Attiéké, Garba. Total : 5000 francs CFA.');
  assert.equal(phrasePanier([{ nom: 'Pain', quantite: 1 }], 1, 'EUR'), '1 article : Pain. Total : 1 euro.');
});
