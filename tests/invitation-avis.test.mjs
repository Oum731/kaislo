import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noterJourUsage, doitInviter, JOURS_AVANT_INVITATION } from '../src/lib/donnees/invitation-avis.js';

const J = (jour) => Date.parse(jour + 'T10:00:00Z');

test('un jour d’usage compte une seule fois, même si on ouvre l’application dix fois', () => {
  let jours = [];
  jours = noterJourUsage(jours, J('2026-10-28'));
  assert.deepEqual(jours, ['2026-10-28']);
  assert.equal(noterJourUsage(jours, J('2026-10-28')), jours, 'même jour : la liste ne change pas');
  jours = noterJourUsage(jours, J('2026-10-30'));
  jours = noterJourUsage(jours, J('2026-10-29'));
  assert.deepEqual(jours, ['2026-10-28', '2026-10-29', '2026-10-30'], 'triés');
  let longue = [];
  for (let i = 1; i <= 15; i++) longue = noterJourUsage(longue, J('2026-11-' + String(i).padStart(2, '0')));
  assert.equal(longue.length, 10, 'on garde les 10 derniers jours');
});

test('l’avis est proposé à partir du 3e jour d’usage, jamais avant', () => {
  assert.equal(JOURS_AVANT_INVITATION, 3);
  const maintenant = J('2026-10-30');
  assert.equal(doitInviter({ jours: [] }, maintenant), false);
  assert.equal(doitInviter({ jours: ['2026-10-29', '2026-10-30'] }, maintenant), false);
  assert.equal(doitInviter({ jours: ['2026-10-28', '2026-10-29', '2026-10-30'] }, maintenant), true);
});

test('plus tard : 7 jours puis 30 jours puis jamais ; jamais si avis envoyé ou « ne plus demander »', () => {
  const jours = ['2026-10-01', '2026-10-02', '2026-10-03'];
  const t = J('2026-10-30');
  const J7 = 7 * 86400000, J30 = 30 * 86400000;
  assert.equal(doitInviter({ jours, invitation: { refus: 1, dernier: t - J7 + 1000 } }, t), false);
  assert.equal(doitInviter({ jours, invitation: { refus: 1, dernier: t - J7 } }, t), true);
  assert.equal(doitInviter({ jours, invitation: { refus: 2, dernier: t - J30 + 1000 } }, t), false);
  assert.equal(doitInviter({ jours, invitation: { refus: 2, dernier: t - J30 } }, t), true);
  assert.equal(doitInviter({ jours, invitation: { refus: 3, dernier: 0 } }, t), false);
  assert.equal(doitInviter({ jours, invitation: { jamais: true } }, t), false);
  assert.equal(doitInviter({ jours, invitation: { fait: true } }, t), false);
  assert.equal(doitInviter({ jours, avisDonne: true }, t), false, 'le serveur a déjà un avis de ce commerce');
});
