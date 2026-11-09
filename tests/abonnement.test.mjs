// Abonnement : limites quand le délai pour payer est passé
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abonnementLimite } from '../src/lib/donnees/abonnement.js';
test('abonnementLimite : seulement un commerce en ligne dont le délai est passé', () => {
  const fin = (jours) => new Date(Date.now() + jours * 86400000).toISOString();
  const commerce = (abonnement, serveur = true) => ({ commerce: { serveur, abonnement } });
  assert.equal(abonnementLimite(commerce({ statut: 'actif', periodeFin: fin(-1), provisoire: true })), true);
  assert.equal(abonnementLimite(commerce({ statut: 'actif', periodeFin: fin(3), provisoire: true })), false);
  assert.equal(abonnementLimite(commerce({ statut: 'essai', essaiFin: fin(-2) })), true);
  assert.equal(abonnementLimite(commerce({ statut: 'suspendu' })), false);
  assert.equal(abonnementLimite(commerce({ statut: 'actif', periodeFin: fin(-1) }, false)), false);
  assert.equal(abonnementLimite(null), false);
});
