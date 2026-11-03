// Ticket d'un client à distance : le nom n'apparaît que s'il a été saisi (facultatif). Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construireTicket } from '../src/lib/impression/ticket.js';

const commerce = { nom: 'Chez Awa', devise: 'FCFA', pays: 'CI' };
const vente = (extra = {}) => ({
  numero: 12, date: '2026-11-03T10:00:00.000Z', paiement: 'Espèces', recu: 0, sousTotal: 1500, remise: 0, total: 1500,
  lignes: [{ nom: 'Attiéké', quantite: 3, prixUnitaire: 500, total: 1500, details: [] }], aDistance: true, ...extra,
});
const texte = (v) => construireTicket(v, commerce, 58).map((l) => l.texte).join('\n');

test('client à distance avec un nom : « Client : … » sur le ticket', () => {
  const t = texte(vente({ clientNom: 'Koffi' }));
  assert.match(t, /Commande à distance/);
  assert.match(t, /Client : Koffi/);
});

test('client à distance sans nom : pas de ligne « Client », la vente passe quand même', () => {
  const t = texte(vente({ clientNom: null }));
  assert.match(t, /Commande à distance/);
  assert.doesNotMatch(t, /Client :/);
});

test('vente à crédit à distance : le nom n’est imprimé qu’une fois', () => {
  const t = texte(vente({ paiement: 'Crédit', clientNom: 'Koffi', soldeClientApres: 1500 }));
  assert.equal((t.match(/Client : Koffi/g) || []).length, 1);
});

test('client sur place avec un nom (hors crédit) : rien de plus sur le ticket', () => {
  const t = texte(vente({ aDistance: undefined, clientNom: 'Koffi' }));
  assert.doesNotMatch(t, /Client :/);
});
