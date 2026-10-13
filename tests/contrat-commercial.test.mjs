// Contrat du commercial : le PDF se fabrique avec les règles figées à l'envoi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articlesContrat, creerPdfContrat } from '../src/lib/export/contrat-commercial.js';

const commercial = { nom: 'Awa Koné', telephone: '+225 07 12 34 56 78', email: '', pays: 'CI', ville: 'Abidjan', quartier: 'Yopougon', code: 'AWA42' };
const contrat = {
  numero: 'KC-2026-0001', envoyeLe: '2026-10-14T09:00:00.000Z', accepteLe: null,
  conditions: { taux: 25, dureeMois: 12, moisValidation: 6, bonusHebdo: { clients: 5, montant: { FCFA: 10000, MAD: 0 } }, primes: [{ clients: 10, montant: { FCFA: 50000 } }, { clients: 25, montant: { FCFA: 0 } }] },
};

test('les articles reprennent les règles figées du programme', () => {
  const texte = articlesContrat({ commercial, contrat, societe: { nom: 'Amorac' } }).flatMap((a) => [a.titre, ...a.paragraphes]).join('\n');
  assert.match(texte, /25 % de chaque paiement/);
  assert.match(texte, /12 premiers mois payés/);
  assert.match(texte, /au moins 5 clients/);
  assert.match(texte, /10[\s  ]?000/);
  assert.match(texte, /à 10 clients validés/);
  assert.doesNotMatch(texte, /à 25 clients validés/); // montant non défini : pas de promesse
  assert.match(texte, /AWA42/);
  assert.match(texte, /droit en vigueur en Côte d’Ivoire/);
});

test('pas de bonus dans une devise sans montant défini', () => {
  const ma = { ...commercial, pays: 'MA' };
  const texte = articlesContrat({ commercial: ma, contrat, societe: {} }).flatMap((a) => a.paragraphes).join('\n');
  assert.match(texte, /Aucun bonus hebdomadaire/);
});

test('le PDF se fabrique, avec plusieurs pages et la mention d\'acceptation', async () => {
  const doc = await creerPdfContrat({ commercial, contrat: { ...contrat, accepteLe: '2026-10-15T10:00:00.000Z' }, societe: { nom: 'Amorac' } });
  assert.ok(doc.getNumberOfPages() >= 2);
  const octets = doc.output('arraybuffer');
  assert.ok(octets.byteLength > 5000);
  assert.equal(new TextDecoder().decode(new Uint8Array(octets).slice(0, 5)), '%PDF-');
});
