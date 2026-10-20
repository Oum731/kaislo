// Virement bancaire comme moyen de paiement à la caisse : compté à part, jamais comme des espèces. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerCloture } from '../src/lib/donnees/cloture.js';

test('un virement apparaît dans son propre mode, hors espèces', () => {
  const debut = new Date('2026-06-01T08:00:00.000Z');
  const fin = new Date('2026-06-01T20:00:00.000Z');
  const d = {
    commerce: { devise: 'FCFA', modesPaiement: ['Espèces', 'Virement'], fondDeCaisse: 1000 },
    ventes: [
      { id: 'v1', date: '2026-06-01T10:00:00.000Z', paiement: 'Espèces', total: 3000, lignes: [{ quantite: 1, total: 3000, nom: 'A' }] },
      { id: 'v2', date: '2026-06-01T11:00:00.000Z', paiement: 'Virement', refPaiement: 'Awa Traoré', total: 12000, lignes: [{ quantite: 1, total: 12000, nom: 'B' }] },
    ],
    depenses: [], remboursements: [], sessionsCaisse: [],
  };
  const c = calculerCloture(d, debut, fin, 1000);
  const virement = c.parPaiement.find((p) => p.mode === 'Virement');
  assert.equal(virement.total, 12000);
  assert.equal(virement.nb, 1);
  assert.equal(c.parPaiement.find((p) => p.mode === 'Espèces').total, 3000);
});
