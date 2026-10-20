// Contacts du téléphone : lecture de la réponse du sélecteur (nom, numéros nettoyés). Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactDepuisSelection, contactsDisponibles } from '../src/lib/contacts.js';

test('un contact : nom et numéros nettoyés, sans doublon', () => {
  const c = contactDepuisSelection([{ name: ['Awa Traoré'], tel: ['07 12-34.56 78', '0712345678', '+225 07 12 34 56 78'] }]);
  assert.equal(c.nom, 'Awa Traoré');
  assert.deepEqual(c.numeros, ['0712345678', '+2250712345678']);
});

test('rien choisi, ou contact sans numéro valable', () => {
  assert.equal(contactDepuisSelection([]), null);
  assert.equal(contactDepuisSelection(undefined), null);
  assert.deepEqual(contactDepuisSelection([{ name: ['Koffi'], tel: [] }]), { nom: 'Koffi', numeros: [] });
  assert.deepEqual(contactDepuisSelection([{ name: [], tel: ['12'] }]).numeros, []); // trop court pour un numéro
  assert.equal(contactDepuisSelection([{ tel: ['0712345678'] }]).nom, '');
});

test('pas de sélecteur de contacts hors Chrome Android (ordinateur, iPhone, serveur)', () => {
  assert.equal(contactsDisponibles(), false);
});
