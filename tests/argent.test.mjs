// Tests des calculs d'argent : lignes de vente, remises, clôture de caisse, crédit, abonnement, téléphone.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrondir, formatNombre } from '../src/lib/utils/format.js';
import { creerLigne, sousTotal, montantRemise, coutVente, choixComplets } from '../src/lib/donnees/vente.js';
import { calculerCloture, debutCloture } from '../src/lib/donnees/cloture.js';
import { soldeClient, totalCreditEnCours } from '../src/lib/donnees/credit.js';
import { prixAbonnement, FORMULES } from '../src/lib/donnees/tarifs.js';
import { normaliserTelephone } from '../src/lib/donnees/telephone.js';
import { construireTicketCloture } from '../src/lib/impression/ticket.js';

// ---------- Arrondis ----------
test('arrondi : pas de centimes en FCFA, 2 décimales en MAD/EUR', () => {
  assert.equal(arrondir(0.1 + 0.2, 'EUR'), 0.3);
  assert.equal(arrondir(1234.6, 'FCFA'), 1235);
  assert.equal(arrondir(12.345, 'MAD'), 12.35);
  assert.equal(arrondir(undefined, 'FCFA'), 0);
});

test('formatNombre : espaces normales (imprimante thermique)', () => {
  assert.equal(formatNombre(12500, 'FCFA'), '12 500');
  assert.ok(!/[  ]/.test(formatNombre(1234567, 'FCFA')));
});

// ---------- Lignes de vente ----------
const attieke = {
  id: 'p1', nom: 'Attiéké', prix: 2000, promo: null, prixAchat: 800,
  groupes: [
    { id: 'g1', nom: 'Viande', type: 'unique', obligatoire: true, options: [{ id: 'o1', nom: 'Poisson', prix: 500 }, { id: 'o2', nom: 'Poulet', prix: 1000 }] },
    { id: 'g2', nom: 'Extras', type: 'multiple', obligatoire: false, options: [{ id: 'o3', nom: 'Alloco', prix: 300 }] },
  ],
};

test('ligne : options à choix unique dans le nom, multiples en détail, prix cumulés', () => {
  const l = creerLigne(attieke, { g1: ['o2'], g2: ['o3'] }, 3, 'FCFA');
  assert.equal(l.nom, 'Attiéké – Poulet');
  assert.deepEqual(l.details, ['+ Alloco']);
  assert.equal(l.prixUnitaire, 3300);
  assert.equal(l.total, 9900);
  assert.equal(l.coutUnitaire, 800);
});

test('ligne : le prix promo remplace le prix, le prix normal est gardé pour le ticket', () => {
  const l = creerLigne({ ...attieke, promo: 1500, groupes: [] }, {}, 2, 'FCFA');
  assert.equal(l.prixUnitaire, 1500);
  assert.equal(l.prixNormal, 2000);
  assert.equal(l.total, 3000);
});

test('ligne : une promo supérieure au prix est ignorée', () => {
  assert.equal(creerLigne({ ...attieke, promo: 2500, groupes: [] }, {}, 1, 'FCFA').prixUnitaire, 2000);
});

test('choix obligatoire : refusé tant que rien n’est choisi', () => {
  assert.equal(choixComplets(attieke, {}), false);
  assert.equal(choixComplets(attieke, { g1: ['o1'] }), true);
});

// ---------- Remises ----------
test('remise : pourcentage, montant, plafonds', () => {
  assert.equal(montantRemise({ type: 'pourcent', valeur: 10 }, 5000, 'FCFA'), 500);
  assert.equal(montantRemise({ type: 'pourcent', valeur: 150 }, 5000, 'FCFA'), 5000); // jamais plus de 100 %
  assert.equal(montantRemise({ type: 'montant', valeur: 9999 }, 5000, 'FCFA'), 5000); // jamais plus que le total
  assert.equal(montantRemise({ type: 'montant', valeur: -5 }, 5000, 'FCFA'), 0);
  assert.equal(montantRemise(null, 5000, 'FCFA'), 0);
});

test('sous-total et coût d’achat', () => {
  const l1 = creerLigne(attieke, { g1: ['o1'] }, 2, 'FCFA');
  const l2 = creerLigne({ ...attieke, prixAchat: 0, groupes: [] }, {}, 1, 'FCFA');
  assert.equal(sousTotal([l1, l2], 'FCFA'), 5000 + 2000);
  assert.equal(coutVente({ lignes: [l1, l2] }), 1600); // la ligne sans prix d'achat n'est pas comptée
  assert.equal(coutVente({ lignes: [l2] }), null);
});

// ---------- Clôture de caisse ----------
const jour = (h, m = 0) => new Date(2026, 9, 4, h, m).toISOString();
const vente = (id, total, paiement, h, extra = {}) => ({
  id, total, paiement, date: jour(h), remise: 0, annulee: false,
  lignes: [{ produitNom: 'Attiéké', nom: 'Attiéké', quantite: 1, total }], ...extra,
});

function donneesJour() {
  return {
    commerce: { devise: 'FCFA', modesPaiement: ['Espèces', 'Wave', 'Orange Money'] },
    ventes: [
      vente('v1', 5000, 'Espèces', 9),
      vente('v2', 3000, 'Wave', 10),
      vente('v3', 2000, 'Orange Money', 11),
      vente('v4', 4000, 'Espèces', 12),
      vente('v5', 7000, 'Crédit', 13, { clientId: 'c1' }),
      vente('v6', 9999, 'Espèces', 14, { annulee: true }), // annulée : ne compte nulle part
      vente('v7', 1000, 'Espèces', 8, { date: new Date(2026, 9, 3, 20).toISOString() }), // la veille
    ],
    remboursements: [
      { id: 'r1', clientId: 'c1', montant: 1500, mode: 'Wave', date: jour(15) },
      { id: 'r2', clientId: 'c1', montant: 500, mode: 'Espèces', date: jour(16) },
    ],
    depenses: [
      { id: 'd1', montant: 700, depuisCaisse: true, date: jour(12) },
      { id: 'd2', montant: 5000, depuisCaisse: false, date: jour(12) }, // payée hors caisse : sans effet sur les espèces
    ],
    clients: [{ id: 'c1', nom: 'Awa' }],
  };
}
const periode = [new Date(2026, 9, 4, 0, 0), new Date(2026, 9, 4, 23, 0)];

test('clôture : total vendu, totaux par mode (Espèces, Wave, OM, Crédit), annulées exclues', () => {
  const c = calculerCloture(donneesJour(), ...periode, 10000);
  assert.equal(c.nbVentes, 5);
  assert.equal(c.nbAnnulees, 1);
  assert.equal(c.totalVentes, 5000 + 3000 + 2000 + 4000 + 7000);
  const total = (m) => c.parPaiement.find((p) => p.mode === m).total;
  assert.equal(total('Espèces'), 9000);
  assert.equal(total('Wave'), 3000);
  assert.equal(total('Orange Money'), 2000);
  assert.equal(total('Crédit'), 7000);
  assert.equal(c.parPaiement.reduce((s, p) => s + p.total, 0), c.totalVentes); // les modes font bien le total vendu
});

test('clôture : ce que le vendeur a reçu par mode, crédits remboursés inclus, crédit exclu', () => {
  const c = calculerCloture(donneesJour(), ...periode, 10000);
  const recu = (m) => c.parPaiement.find((p) => p.mode === m).recu;
  assert.equal(recu('Espèces'), 9000 + 500);
  assert.equal(recu('Wave'), 3000 + 1500);
  assert.equal(recu('Orange Money'), 2000);
  assert.equal(recu('Crédit'), 0);
  assert.equal(c.totalRecu, 9500 + 4500 + 2000);
});

test('clôture : espèces attendues = fond + ventes espèces + remboursements espèces − dépenses de la caisse', () => {
  const c = calculerCloture(donneesJour(), ...periode, 10000);
  assert.equal(c.attendu, 10000 + 9000 + 500 - 700);
});

test('clôture : total vendu par article', () => {
  const c = calculerCloture(donneesJour(), ...periode, 0);
  assert.equal(c.nbArticles, 5);
  assert.equal(c.parArticle.find((a) => a.nom === 'Attiéké').total, c.totalVentes);
});

test('clôture : le mode Crédit n’apparaît que s’il y a eu des ventes à crédit', () => {
  const d = donneesJour();
  d.ventes = d.ventes.filter((v) => v.paiement !== 'Crédit');
  assert.ok(!calculerCloture(d, ...periode, 0).parPaiement.some((p) => p.mode === 'Crédit'));
});

test('début de clôture : dernière clôture du jour, sinon minuit', () => {
  const maintenant = new Date(2026, 9, 4, 18, 0);
  assert.equal(debutCloture([], maintenant).getHours(), 0);
  assert.equal(debutCloture([{ date: jour(12) }, { date: jour(15) }], maintenant).getHours(), 15);
});

test('ticket de fermeture : un total par mode et le total reçu', () => {
  const c = { ...calculerCloture(donneesJour(), ...periode, 10000), utilisateurNom: 'Awa', compte: 18800, ecart: 0 };
  const texte = construireTicketCloture(c, { nom: 'Amorac', devise: 'FCFA' }, 80).map((l) => l.texte).join('\n');
  for (const mot of ['Espèces', 'Wave', 'Orange Money', 'Crédit', 'TOTAL REÇU']) assert.ok(texte.includes(mot), mot + ' absent du ticket');
  assert.ok(texte.includes('16 000'), 'total reçu absent'); // 9500 + 4500 + 2000
});

// ---------- Carnet de crédit ----------
test('crédit : solde = achats à crédit − remboursements, jamais négatif, annulées ignorées', () => {
  const d = donneesJour();
  assert.equal(soldeClient(d, 'c1'), 7000 - 1500 - 500);
  assert.equal(totalCreditEnCours(d), 5000);
  d.remboursements.push({ id: 'r3', clientId: 'c1', montant: 99999, mode: 'Espèces', date: jour(17) });
  assert.equal(soldeClient(d, 'c1'), 0);
});

// ---------- Abonnement Kaislo ----------
test('abonnement : prix de base, postes en plus, 12 mois = 2 offerts, tarif fondateur −20 %', () => {
  const formule = FORMULES[0];
  const devise = 'FCFA';
  const base = formule.prix[devise];
  const poste = formule.prixPoste[devise];
  assert.equal(prixAbonnement({ formule, devise }).parMois, base);
  assert.equal(prixAbonnement({ formule, devise, postes: 3 }).parMois, base + 2 * poste);
  assert.equal(prixAbonnement({ formule, devise, mois: 3 }).total, base * 3);
  assert.equal(prixAbonnement({ formule, devise, mois: 12 }).total, base * 10);
  assert.equal(prixAbonnement({ formule, devise, fondateur: true }).parMois, arrondir(base * 0.8, devise));
  assert.equal(prixAbonnement({ formule: null, devise }).total, 0);
});

// ---------- Téléphone ----------
test('téléphone : format international, refus des numéros vides ou invalides', () => {
  const ok = normaliserTelephone('07 12 34 56 78', 'CI');
  assert.equal(ok.ok, true);
  assert.ok(ok.e164.startsWith('+225'));
  assert.equal(normaliserTelephone('+225 07 12 34 56 78', 'CI').e164, ok.e164); // même numéro, écrit autrement
  assert.equal(normaliserTelephone('', 'CI').ok, false);
  assert.equal(normaliserTelephone('12', 'CI').ok, false);
});

test('prix catalogue : le code parrain ne baisse jamais les tarifs actuels', async () => {
  const { FORMULES, REGLES_TARIFS, prixCatalogue, prixAbonnement, modeTarif, remiseCodeParrain } = await import('../src/lib/donnees/tarifs.js');
  for (const f of FORMULES) {
    for (const devise of Object.keys(f.prix)) {
      for (const montant of [f.prix[devise], f.prixPoste[devise]]) {
        const cat = prixCatalogue(montant, devise);
        assert.ok(cat >= montant, `${f.id} ${devise} : le catalogue ne peut pas être sous le tarif actuel`);
        // Après la remise du code, le client paie au moins le tarif actuel : on ne perd rien
        assert.ok(cat * (1 - REGLES_TARIFS.remiseParrain / 100) >= montant - 0.01, `${f.id} ${devise} : ${cat} avec remise < ${montant}`);
      }
      assert.ok(remiseCodeParrain(f, devise) >= 8 && remiseCodeParrain(f, devise) <= 15, `${f.id} ${devise} : remise affichée raisonnable`);
    }
  }
  const f = FORMULES.find((x) => x.id === 'proximite');
  assert.equal(prixAbonnement({ formule: f, devise: 'FCFA' }).parMois, 9000); // avec code : tarif actuel
  assert.equal(prixAbonnement({ formule: f, devise: 'FCFA', mode: 'catalogue' }).parMois, 10000);
  assert.equal(prixAbonnement({ formule: f, devise: 'FCFA', postes: 2, mode: 'catalogue' }).parMois, 10000 + 3500);
  // Mode : code parrain ou inscription avant la date → tarif actuel
  assert.equal(modeTarif({ commercialId: 'co1', creeLe: '2027-01-01T00:00:00Z' }), 'base');
  assert.equal(modeTarif({ commercialId: null, creeLe: '2026-10-05T10:00:00Z' }), 'base');
  assert.equal(modeTarif({ commercialId: null, creeLe: '2026-10-06T00:00:01Z' }), 'catalogue');
  assert.equal(modeTarif({ commercialId: null, creeLe: '2027-01-01T00:00:00Z' }, { ...REGLES_TARIFS, catalogueActif: false }), 'base');
});
