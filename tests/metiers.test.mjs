// Les métiers réglementés (pharmacie) ne sont plus proposés, mais les commerces déjà inscrits sous ce type continuent de fonctionner.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES_COMMERCE, typeCommerce } from '../src/lib/donnees/modeles.js';
import { FORMULES, formuleDuType } from '../src/lib/donnees/tarifs.js';

test('la pharmacie n\'est plus proposée à l\'inscription', () => {
  assert.ok(!TYPES_COMMERCE.some((t) => t.id === 'pharmacie'));
  assert.ok(TYPES_COMMERCE.some((t) => t.id === 'epicerie'));
});

test('un ancien commerce « pharmacie » garde son type, ses catégories et sa formule de prix', () => {
  assert.equal(typeCommerce('pharmacie').id, 'pharmacie');
  assert.equal(formuleDuType('pharmacie', FORMULES).id, 'pro');
  assert.equal(formuleDuType('grossiste', FORMULES).id, 'pro');
  assert.equal(typeCommerce('inconnu').id, 'autre');
});
