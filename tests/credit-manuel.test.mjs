// Crédit noté à la main (sans vente) : il augmente le solde du client, apparaît dans l'historique et le journal, et l'annulation le retire du solde
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soldeClient, historiqueClient, clientsAvecSolde, totalCreditEnCours } from '../src/lib/donnees/credit.js';
import { journalActivite, aSurveiller } from '../src/lib/donnees/journal.js';
import { CREDIT } from '../src/lib/donnees/modeles.js';

const base = () => ({
  clients: [{ id: 'k1', nom: 'Koffi' }, { id: 'k2', nom: 'Awa' }],
  ventes: [{ id: 'v1', numero: 1, date: '2026-11-01T10:00:00.000Z', total: 3000, paiement: CREDIT, clientId: 'k1', lignes: [], vendeurNom: 'Awa' }],
  remboursements: [{ id: 'r1', date: '2026-11-03T10:00:00.000Z', clientId: 'k1', montant: 1000, mode: 'Espèces' }],
  dettes: [],
});

test('un crédit noté sans vente s’ajoute au solde ; les remboursements le réduisent ; un autre client n’est pas touché', () => {
  const d = base();
  assert.equal(soldeClient(d, 'k1'), 2000);
  assert.equal(soldeClient(d, 'k2'), 0);
  d.dettes.push({ id: 'dt1', date: '2026-11-05T10:00:00.000Z', clientId: 'k2', montant: 15000, note: 'Ancien crédit du cahier', utilisateurNom: 'Awa' });
  d.dettes.push({ id: 'dt2', date: '2026-11-06T10:00:00.000Z', clientId: 'k1', montant: 500, note: '', utilisateurNom: 'Vendeur' });
  assert.equal(soldeClient(d, 'k2'), 15000);
  assert.equal(soldeClient(d, 'k1'), 2500);
  assert.equal(totalCreditEnCours(d), 17500);
  assert.deepEqual(clientsAvecSolde(d).map((c) => [c.nom, c.solde]), [['Awa', 15000], ['Koffi', 2500]]);
});

test('historique : le crédit noté apparaît avec son auteur et sa note, du plus récent au plus ancien', () => {
  const d = base();
  d.dettes.push({ id: 'dt1', date: '2026-11-05T10:00:00.000Z', clientId: 'k1', montant: 700, note: 'Riz', utilisateurNom: 'Vendeur' });
  const h = historiqueClient(d, 'k1');
  assert.deepEqual(h.map((x) => x.type), ['dette', 'remboursement', 'achat']);
  assert.equal(h[0].dette.utilisateurNom, 'Vendeur');
  assert.equal(h[0].montant, 700);
});

test('un crédit annulé reste dans l’historique mais ne compte plus dans le solde ; le journal montre le crédit et son annulation', () => {
  const d = base();
  d.dettes.push({ id: 'dt1', date: '2026-11-05T10:00:00.000Z', clientId: 'k1', montant: 700, note: 'Riz', utilisateurNom: 'Vendeur', annulee: { date: '2026-11-06T10:00:00.000Z', par: 'Gérant' } });
  assert.equal(soldeClient(d, 'k1'), 2000);
  assert.equal(historiqueClient(d, 'k1').filter((x) => x.type === 'dette').length, 1);
  const j = journalActivite(d, { periode: 'tout' }, new Date('2026-11-10T00:00:00Z'));
  const credit = j.lignes.find((l) => l.type === 'credit');
  const annule = j.lignes.find((l) => l.type === 'credit-annule');
  assert.equal(credit.client, 'Koffi');
  assert.equal(credit.par, 'Vendeur');
  assert.equal(annule.par, 'Gérant');
  assert.equal(aSurveiller(annule), true); // une annulation se surveille
  assert.equal(aSurveiller(credit), false);
});
