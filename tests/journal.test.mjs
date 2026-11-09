// Tests du journal d'activité : fil unique (ventes annulées, remises, dépenses, stock, caisse + lignes notées), filtres, gestes à surveiller.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journalActivite, aSurveiller, ligneJournal, ajouterAuJournal, JOURNAL_MAX } from '../src/lib/donnees/journal.js';

const now = new Date(2026, 10, 9, 15, 0, 0);
const il = (jours, h = 10) => new Date(2026, 10, 9 - jours, h, 0, 0).toISOString();
const d = {
  ventes: [
    { id: 'v1', numero: 1, date: il(0), total: 5000, vendeurNom: 'Awa' },
    { id: 'v2', numero: 2, date: il(0, 11), total: 3000, remise: 500, vendeurNom: 'Awa' },
    { id: 'v3', numero: 3, date: il(0, 12), total: 2000, vendeurNom: 'Bako', annulee: { date: il(0, 13), par: 'Gérant', motif: 'Erreur de prix' } },
    { id: 'v4', numero: 4, date: il(20), total: 1000, remise: 100, vendeurNom: 'Bako' },
  ],
  depenses: [{ id: 'd1', date: il(0, 9), montant: 1500, note: 'Transport', utilisateurNom: 'Awa' }],
  mouvements: [
    { id: 'm1', date: il(1), type: 'entree', produitNom: 'Riz', quantite: 10, utilisateurNom: 'Gérant' },
    { id: 'm2', date: il(1, 11), type: 'ajustement', produitNom: 'Sucre', quantite: -3, utilisateurNom: 'Awa' },
    { id: 'm3', date: il(1, 12), type: 'vente', produitNom: 'Riz', quantite: -1 },
  ],
  sessionsCaisse: [{ id: 's1', ouverteLe: il(0, 8), ouvertePar: 'Awa', fondDeCaisse: 10000, fermeLe: il(0, 14), fermePar: 'Awa', cloture: { ecart: -200 } }],
  journal: [{ id: 'j1', date: il(0, 14), par: 'Gérant', type: 'prix', produit: 'Riz', avant: 500, apres: 600 }],
};

test('le fil réunit tout, le plus récent d’abord, sans les mouvements de vente', () => {
  const { lignes } = journalActivite(d, { periode: 'semaine' }, now);
  assert.deepEqual(new Set(lignes.map((l) => l.type)), new Set(['annulation', 'remise', 'depense', 'stock', 'caisse', 'prix']));
  assert.equal(lignes.some((l) => l.id === 'mm3'), false);
  const dates = lignes.map((l) => l.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test('période : une vente de il y a 20 jours n’est pas dans la semaine, mais dans le mois et dans tout', () => {
  const nbRemises = (periode) => journalActivite(d, { periode }, now).lignes.filter((l) => l.type === 'remise').length;
  assert.equal(nbRemises('jour'), 1);
  assert.equal(nbRemises('semaine'), 1);
  assert.equal(nbRemises('mois'), 2);
  assert.equal(nbRemises('tout'), 2);
});

test('filtre par personne et par type, avec les comptes', () => {
  const r = journalActivite(d, { periode: 'semaine', par: 'Awa' }, now);
  assert.ok(r.lignes.every((l) => l.par === 'Awa'));
  assert.deepEqual(r.personnes, ['Awa', 'Gérant']);
  assert.equal(r.comptes.depense, 1);
  const seul = journalActivite(d, { periode: 'semaine', type: 'annulation' }, now);
  assert.equal(seul.lignes.length, 1);
  assert.equal(seul.lignes[0].motif, 'Erreur de prix');
  assert.equal(seul.lignes[0].par, 'Gérant');
});

test('gestes à surveiller', () => {
  const { lignes } = journalActivite(d, { periode: 'semaine' }, now);
  const surveilles = new Set(lignes.filter(aSurveiller).map((l) => l.type));
  assert.deepEqual(surveilles, new Set(['annulation', 'remise', 'caisse', 'stock', 'prix']));
  assert.equal(aSurveiller({ type: 'depense' }), false);
  assert.equal(aSurveiller({ type: 'stock', sens: 'entree', quantite: 5 }), false);
  assert.equal(aSurveiller({ type: 'caisse', etape: 'fermeture', ecart: 0 }), false);
  assert.equal(aSurveiller({ type: 'caisse', etape: 'ouverture', ecart: 0 }), false);
});

test('commerce sans journal ni historique : liste vide', () => {
  assert.deepEqual(journalActivite({}, {}, now).lignes, []);
});

test('lignes notées : identifiant unique, ajout sans modifier l’ancienne liste, liste bornée', () => {
  const a = ligneJournal('Awa', 'prix', { produit: 'X' });
  const b = ligneJournal('Awa', 'prix', { produit: 'Y' });
  assert.notEqual(a.id, b.id);
  const avant = [a];
  const apres = ajouterAuJournal(avant, b);
  assert.equal(avant.length, 1);
  assert.equal(apres.length, 2);
  const pleine = Array.from({ length: JOURNAL_MAX }, (_, i) => ({ id: 'x' + i }));
  const bornee = ajouterAuJournal(pleine, b);
  assert.equal(bornee.length, JOURNAL_MAX);
  assert.equal(bornee.at(-1), b);
  assert.equal(bornee[0].id, 'x1');
});
