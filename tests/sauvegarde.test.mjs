// Tests de la sauvegarde et de la restauration : contrôle du fichier, restauration sans toucher aux PIN ni à l'abonnement,
// numéro de ticket qui ne recule pas, copies automatiques (une par jour, les 5 dernières, copie « avant restauration »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instantane, verifierSauvegarde, appliquerSauvegarde, garderCopie, listerCopies, lireCopie, copieDuJourFaite, COPIES_GARDEES } from '../src/lib/donnees/sauvegarde.js';

const base = () => ({
  version: 13, prochainNumero: 4,
  commerce: { id: 'c1', nom: 'Chez Awa', code: 'ABC', abonnement: { statut: 'actif' } },
  utilisateurs: [{ id: 'u1', nom: 'Awa', role: 'gerant', pin: '1234' }],
  produits: [{ id: 'p1', nom: 'Riz', prix: 500, stockActuel: 7 }], categories: [], postes: [], commandes: [], remboursements: [], sessionsCaisse: [], mouvements: [], journal: [],
  clients: [{ id: 'k1', nom: 'Bako' }], depenses: [],
  ventes: [{ id: 'v1', numero: 1, date: '2026-11-01T10:00:00.000Z', total: 500 }, { id: 'v2', numero: 2, date: '2026-11-02T10:00:00.000Z', total: 700 }, { id: 'v3', numero: 3, date: '2026-11-03T10:00:00.000Z', total: 900 }],
});

test('l’instantané n’emporte aucun code PIN', () => {
  const s = instantane(base());
  assert.equal(JSON.stringify(s).includes('1234'), false);
  assert.equal(s.ventes.length, 3);
});

test('contrôle du fichier : mauvais fichier, autre commerce, liste abîmée, bon fichier', () => {
  const d = base();
  assert.equal(verifierSauvegarde(null, d).code, 'format');
  assert.equal(verifierSauvegarde({ hello: 1 }, d).code, 'format');
  const autre = instantane({ ...base(), commerce: { id: 'c2', nom: 'Autre' } });
  const r = verifierSauvegarde(autre, d);
  assert.equal(r.code, 'autre');
  assert.equal(r.nom, 'Autre');
  assert.equal(verifierSauvegarde({ ...instantane(d), clients: 'x' }, d).code, 'abimee');
  const ok = verifierSauvegarde(instantane(d), d);
  assert.equal(ok.ok, true);
  assert.equal(ok.resume.ventes, 3);
  assert.equal(ok.resume.premiereVente, '2026-11-01T10:00:00.000Z');
});

test('restaurer : les listes reviennent, PIN, abonnement et code restent, le numéro de ticket ne recule pas', () => {
  const ancien = instantane({ ...base(), ventes: base().ventes.slice(0, 1), prochainNumero: 2 });
  const maintenant = { ...base(), prochainNumero: 9 };
  const r = appliquerSauvegarde(maintenant, ancien);
  assert.equal(r.ventes.length, 1);
  assert.equal(r.utilisateurs[0].pin, '1234');
  assert.equal(r.commerce.abonnement.statut, 'actif');
  assert.equal(r.prochainNumero, 9);
  assert.equal(r.produits[0].stockActuel, undefined);
  // une sauvegarde dont le compteur est en retard sur ses propres ventes
  const retard = appliquerSauvegarde({ ...base(), prochainNumero: 1 }, { ...instantane(base()), prochainNumero: 1 });
  assert.equal(retard.prochainNumero, 4);
});

test('copies automatiques : une par jour, 5 gardées, la copie avant restauration en plus', () => {
  const d = base();
  const jour = (n) => new Date(2026, 10, n, 9, 0, 0);
  assert.equal(copieDuJourFaite('c1', jour(1)), false);
  assert.equal(garderCopie(d, 'auto', jour(1)), true);
  assert.equal(garderCopie(d, 'auto', new Date(2026, 10, 1, 18, 0, 0)), false); // même jour
  assert.equal(copieDuJourFaite('c1', jour(1)), true);
  for (let n = 2; n <= 8; n++) garderCopie({ ...d, ventes: d.ventes.slice(0, 1) }, 'auto', jour(n));
  garderCopie(d, 'avant-restauration', jour(8));
  const l = listerCopies('c1');
  assert.equal(l.filter((c) => c.raison === 'auto').length, COPIES_GARDEES);
  assert.equal(l.filter((c) => c.raison === 'avant-restauration').length, 1);
  assert.ok(l.every((c) => c.jour >= '2026-11-04' || c.raison !== 'auto'));
  const recente = lireCopie('c1', l.find((c) => c.raison === 'avant-restauration').id);
  assert.equal(recente.ventes.length, 3);
  assert.equal(lireCopie('c1', 'inconnue'), null);
});
