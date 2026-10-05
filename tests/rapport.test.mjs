// Tests du rapport d'activité (Excel / PDF) : les chiffres doivent être justes et égaux à ceux du tableau de bord et de la fermeture de la journée.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construireRapport, bornesPeriode, PERIODES_RAPPORT } from '../src/lib/donnees/rapport.js';
import { calculerStats } from '../src/lib/donnees/statistiques.js';
import { calculerCloture } from '../src/lib/donnees/cloture.js';
import { creerDonneesDemo } from '../src/lib/donnees/demo.js';

import { iso, ligne, vente, donnees } from './donnees-rapport.mjs';

const valeur = (r, cle) => r.resume.find((x) => x.cle === cle)?.valeur;
const tableau = (r, id) => r.tableaux.find((t) => t.id === id);

test('rapport du jour : les chiffres sont justes (ventes annulées et autres jours exclus)', () => {
  const r = construireRapport(donnees(), 'jour', new Date(2026, 9, 5, 15, 0));
  assert.equal(valeur(r, 'ca'), 5000 + 11000 + 2500 + 3000); // v1 + v2 (après remise) + v3 + v7 ; pas v4, v5, v6
  assert.equal(valeur(r, 'tickets'), 4);
  assert.equal(valeur(r, 'panier'), 5375);
  assert.equal(valeur(r, 'remises'), 1000);
  assert.equal(valeur(r, 'depenses'), 1800);
  assert.equal(valeur(r, 'solde'), 21500 - 1800);
  assert.equal(valeur(r, 'credit'), 3000);
  assert.equal(valeur(r, 'rembourse'), 1000);
  assert.equal(valeur(r, 'annulees'), 1);
  assert.equal(valeur(r, 'montantAnnule'), 2500);
  assert.equal(valeur(r, 'articles'), 2 + 1 + 1 + 3);
  // Total reçu : espèces 7 500 + remboursement 1 000, Wave 11 000 ; le crédit n'est pas de l'argent reçu
  assert.equal(valeur(r, 'recu'), 7500 + 1000 + 11000);
  // Marge : seulement les ventes dont le prix d'achat est connu
  assert.equal(valeur(r, 'marge'), 1000 + 1000 + 500);
  assert.equal(valeur(r, 'tauxMarge'), Math.round((2500 / 21500) * 100));
});

test('rapport : tableaux cohérents entre eux (paiements, heures, vendeurs, articles, ventes)', () => {
  const r = construireRapport(donnees(), 'jour', new Date(2026, 9, 5, 15, 0));
  const paiements = tableau(r, 'paiements');
  assert.deepEqual(paiements.lignes.map((l) => [l.mode, l.nb, l.total, l.rembourse, l.recu]), [
    ['Espèces', 2, 7500, 1000, 8500], ['Wave', 1, 11000, 0, 11000], ['Carte', 0, 0, 0, 0], ['Crédit', 1, 3000, 0, 0],
  ]);
  assert.equal(paiements.lignes.reduce((s, l) => s + l.total, 0), valeur(r, 'ca'));
  const heures = tableau(r, 'evolution');
  assert.equal(heures.lignes.length, 24);
  assert.equal(heures.lignes[8].ventes, 5000);
  assert.equal(heures.lignes[23].ventes, 2500); // 23 h 59 min 59 s compte bien dans la journée
  assert.equal(heures.lignes.reduce((s, l) => s + l.ventes, 0), valeur(r, 'ca'));
  assert.equal(heures.lignes.reduce((s, l) => s + l.tickets, 0), 4);
  assert.equal(heures.lignes[8].depenses, 1800);
  assert.equal(tableau(r, 'vendeurs').lignes[0].total, valeur(r, 'ca'));
  // Ventes : les 5 tickets du jour (dont l'annulée, marquée), le total ne compte que les valides
  const ventes = tableau(r, 'ventes');
  assert.equal(ventes.lignes.length, 5);
  assert.deepEqual(ventes.lignes.map((l) => l.statut), ['Valide', 'Valide', 'Annulée', 'Valide', 'Valide']);
  assert.equal(ventes.lignes.find((l) => l.annulee).motif, 'Erreur de saisie');
  assert.equal(ventes.total.total, valeur(r, 'ca'));
  // Articles : les montants sont ceux des lignes (avant la remise de 1 000 sur le ticket du riz)
  const articles = tableau(r, 'articles');
  assert.equal(articles.total.total, 5000 + 12000 + 2500 + 3000);
  assert.ok(articles.note, 'une note explique la remise');
  assert.ok(Math.abs(articles.lignes.reduce((s, l) => s + l.part, 0) - 100) < 0.3); // parts arrondies au dixième
  // Crédit : remboursement reçu + ce que le client doit encore (3 000 − 1 000)
  assert.equal(tableau(r, 'remboursements').total.montant, 1000);
  assert.equal(tableau(r, 'creditsDus').lignes[0].solde, 2000);
  // Stock : valeurs
  const stock = tableau(r, 'stock');
  assert.deepEqual(stock.lignes.map((l) => [l.nom, l.quantite, l.etat]), [['Huile', 12, 'OK'], ['Riz', 0, 'Rupture']]);
  assert.equal(stock.total.valeurAchat, 12 * 2000);
});

test('rapport = tableau de bord = fermeture de la journée (mêmes chiffres)', () => {
  const d = donnees();
  const fin = new Date(2026, 9, 5, 23, 59, 59, 999);
  const r = construireRapport(d, 'jour', fin);
  const stats = calculerStats(d.ventes, 'jour', fin, d.depenses);
  assert.equal(valeur(r, 'ca'), stats.total);
  assert.equal(valeur(r, 'tickets'), stats.nb);
  assert.equal(valeur(r, 'remises'), stats.remises);
  assert.equal(valeur(r, 'credit'), stats.aCredit);
  assert.equal(valeur(r, 'depenses'), stats.totalDepenses);
  assert.equal(valeur(r, 'solde'), stats.solde);
  assert.equal(valeur(r, 'marge'), stats.marge);
  const { debut } = bornesPeriode('jour', fin);
  const cl = calculerCloture(d, debut, fin, 0);
  assert.equal(valeur(r, 'ca'), cl.totalVentes);
  assert.equal(valeur(r, 'recu'), cl.totalRecu);
  assert.equal(valeur(r, 'annulees'), cl.nbAnnulees);
});

test('périodes : semaine (lundi → dimanche), mois, année, et passage à minuit', () => {
  const dimanche = new Date(2026, 9, 11, 22, 0); // le 11 octobre 2026 est un dimanche
  const sem = bornesPeriode('semaine', dimanche);
  assert.equal(sem.debut.getDay(), 1);
  assert.deepEqual([sem.debut.getDate(), sem.fin.getDate()], [5, 12]);
  const mois = bornesPeriode('mois', new Date(2026, 1, 15)); // février 2026 : 28 jours
  assert.deepEqual([mois.debut.getDate(), mois.fin.getMonth(), mois.fin.getDate()], [1, 2, 1]);
  assert.equal(construireRapport(donnees(), 'mois', new Date(2026, 1, 15)).tableaux[0].lignes.length, 28);
  const annee = bornesPeriode('annee', new Date(2026, 5, 1));
  assert.deepEqual([annee.debut.getMonth(), annee.fin.getFullYear()], [0, 2027]);
  // Une vente du lundi 5 octobre à 00:00:00 est dans la semaine du 5 ; celle du dimanche 4 à 23:59:59 est dans la semaine précédente
  const d = donnees();
  d.ventes.push(vente('v8', iso(2026, 9, 12, 0, 0, 0), 'Espèces', [ligne('p1', 'Huile', 1, 2500)])); // lundi suivant
  const r = construireRapport(d, 'semaine', new Date(2026, 9, 7));
  assert.equal(valeur(r, 'ca'), 5000 + 11000 + 2500 + 3000 + 2500 /* v4 : lundi 6 à minuit */);
  assert.equal(tableau(r, 'evolution').lignes.length, 7);
});

test('rapport sur les données de démonstration : toutes les périodes, totaux identiques dans chaque tableau', () => {
  for (const [id, pays] of [['resto-ivoire', 'CI'], ['chez-sentinelle', 'MA'], ['resto-ivoire', 'FR']]) {
    const d = creerDonneesDemo(id, pays);
    const dev = d.commerce.devise;
    const pas = dev === 'FCFA' || dev === 'GNF' ? 0 : 2;
    const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.011, `${msg} : ${a} ≠ ${b}`);
    const refs = [new Date(), new Date(Date.now() - 86400000 * 3), new Date(Date.now() - 86400000 * 40), new Date(Date.now() - 86400000 * 200)];
    for (const type of PERIODES_RAPPORT) {
      for (const ref of refs) {
        const r = construireRapport(d, type, ref);
        const ca = valeur(r, 'ca');
        const tot = (id2, cle) => tableau(r, id2).lignes.reduce((s, l) => s + (l[cle] || 0), 0);
        proche(tot('evolution', 'ventes'), ca, `${id} ${type} évolution`);
        proche(tot('paiements', 'total'), ca, `${id} ${type} paiements`);
        proche(tot('vendeurs', 'total'), ca, `${id} ${type} vendeurs`);
        proche(tableau(r, 'ventes').lignes.filter((l) => !l.annulee).reduce((s, l) => s + l.total, 0), ca, `${id} ${type} ventes`);
        proche(tot('paiements', 'recu'), valeur(r, 'recu'), `${id} ${type} total reçu`);
        proche(tot('depenses', 'montant'), valeur(r, 'depenses'), `${id} ${type} dépenses`);
        proche(tot('evolution', 'tickets'), valeur(r, 'tickets'), `${id} ${type} tickets`);
        proche(valeur(r, 'solde'), ca - valeur(r, 'depenses'), `${id} ${type} solde`);
        // Même résultat que le tableau de bord pour la période en cours
        if (ref === refs[0]) {
          const stats = calculerStats(d.ventes, type, new Date(), d.depenses);
          const rEnCours = construireRapport(d, type, new Date());
          proche(valeur(rEnCours, 'ca'), stats.total, `${id} ${type} CA = tableau de bord`);
          assert.equal(valeur(rEnCours, 'tickets'), stats.nb);
        }
        assert.ok(Number.isFinite(ca) && ca >= 0);
        void pas;
      }
    }
  }
});
