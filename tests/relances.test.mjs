// Relances de l'essai : bonne étape au bon moment, textes complets. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etapeRelance, texteRelance, prenomDe, ETAPES } from '../src/lib/donnees/relances.js';

const JOUR = 86400000;
const maintenant = new Date('2026-10-10T10:00:00Z').getTime();
const il = (j) => new Date(maintenant - j * JOUR).toISOString();
const essai = (jours, joursRestants, extra = {}) => ({ commerce: { creeLe: il(jours) }, etat: { statut: 'essai', joursRestants }, nbProduits: 10, derniereActivite: il(0), ...extra });

test('étape proposée selon l\'âge de l\'essai et l\'activité', () => {
  assert.equal(etapeRelance(essai(0, 30, { nbProduits: 0, derniereActivite: null }), maintenant), 'bienvenue');
  assert.equal(etapeRelance(essai(3, 27, { nbProduits: 1 }), maintenant), 'pas-demarre');
  assert.equal(etapeRelance(essai(6, 24, { derniereActivite: il(6) }), maintenant), 'inactif');
  assert.equal(etapeRelance(essai(6, 24), maintenant), 'conseil');
  assert.equal(etapeRelance(essai(15, 15), maintenant), 'mi-parcours');
  assert.equal(etapeRelance(essai(12, 18), maintenant), null, 'rien à dire entre deux étapes');
  assert.equal(etapeRelance(essai(26, 4), maintenant), 'fin-proche');
  assert.equal(etapeRelance(essai(30, 0), maintenant), 'fin-proche');
});

test('abonnements expirés : relance pendant 45 jours, jamais pour les actifs ni les suspendus', () => {
  assert.equal(etapeRelance({ commerce: { creeLe: il(60) }, etat: { statut: 'expire', joursRestants: -10 } }, maintenant), 'expire');
  assert.equal(etapeRelance({ commerce: { creeLe: il(200) }, etat: { statut: 'expire', joursRestants: -60 } }, maintenant), null);
  assert.equal(etapeRelance({ commerce: { creeLe: il(100) }, etat: { statut: 'actif', joursRestants: 20 } }, maintenant), null);
  assert.equal(etapeRelance({ commerce: { creeLe: il(10) }, etat: { statut: 'suspendu' } }, maintenant), null);
});

test('chaque étape a un texte complet, avec le prénom, le commerce et le prix', () => {
  const v = { prenom: prenomDe('Awa Koné'), commerce: 'Chez Awa', equipe: 'Souro', joursRestants: 3, prix: '10 000 FCFA' };
  assert.equal(v.prenom, 'Awa');
  for (const code of Object.keys(ETAPES)) {
    const t = texteRelance(code, v);
    assert.ok(t.length > 60, code);
    assert.match(t, /Bonjour Awa,/, code);
    assert.doesNotMatch(t, /undefined|\{|\}/, code);
  }
  assert.match(texteRelance('fin-proche', v), /dans 3 jours.*10 000 FCFA par mois/);
  assert.match(texteRelance('fin-proche', { ...v, joursRestants: 1 }), /demain/);
  assert.match(texteRelance('fin-proche', { ...v, joursRestants: 0 }), /aujourd’hui/);
  assert.match(texteRelance('expire', v), /données sont conservées/);
});
