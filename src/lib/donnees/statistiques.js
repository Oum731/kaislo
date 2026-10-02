// ------------------------------------------------------------
import { coutVente } from './vente.js';
// Calcul des statistiques de ventes pour une période donnée.
// (Dans la vraie app, ce calcul sera fait par le serveur.)
// ------------------------------------------------------------

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

// Début de la période contenant "ref"
function debutPeriode(periode, ref) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  if (periode === 'semaine') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi
  if (periode === 'mois') d.setDate(1);
  if (periode === 'annee') d.setMonth(0, 1);
  return d;
}

// Début de la période précédente
function debutPrecedente(periode, debut) {
  const d = new Date(debut);
  if (periode === 'jour') d.setDate(d.getDate() - 1);
  if (periode === 'semaine') d.setDate(d.getDate() - 7);
  if (periode === 'mois') d.setMonth(d.getMonth() - 1);
  if (periode === 'annee') d.setFullYear(d.getFullYear() - 1);
  return d;
}

// Prépare les barres vides du graphique
function barresVides(periode, debut) {
  if (periode === 'jour') {
    return Array.from({ length: 17 }, (_, i) => ({ label: i + 7 + 'h', long: `${i + 7}h – ${i + 8}h`, valeur: 0 }));
  }
  if (periode === 'semaine') return JOURS.map((j) => ({ label: j, long: j, valeur: 0 }));
  if (periode === 'mois') {
    const nbJours = new Date(debut.getFullYear(), debut.getMonth() + 1, 0).getDate();
    return Array.from({ length: nbJours }, (_, i) => ({
      label: String(i + 1),
      long: `${i + 1} ${MOIS[debut.getMonth()].toLowerCase()}`,
      valeur: 0,
    }));
  }
  return MOIS.map((m) => ({ label: m.slice(0, 1), long: m, valeur: 0 }));
}

function indexBarre(periode, d) {
  if (periode === 'jour') return Math.min(16, Math.max(0, d.getHours() - 7));
  if (periode === 'semaine') return (d.getDay() + 6) % 7;
  if (periode === 'mois') return d.getDate() - 1;
  return d.getMonth();
}

// Additionne dans un dictionnaire puis trie par montant décroissant
function classer(map) {
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function cumuler(map, cle, nom, total, quantite = 1, cout = null) {
  const e = map.get(cle) || { nom, total: 0, quantite: 0, cout: 0, coutConnu: false };
  e.total += total;
  e.quantite += quantite;
  if (cout !== null) {
    e.cout += cout;
    e.coutConnu = true;
  }
  map.set(cle, e);
}

/**
 * periode : 'jour' | 'semaine' | 'mois' | 'annee'
 * Les ventes annulées sont ignorées.
 */
export function calculerStats(ventes, periode, maintenant = new Date(), depenses = []) {
  const debut = debutPeriode(periode, maintenant);
  const debutPrec = debutPrecedente(periode, debut);
  // On compare à la période précédente, au même moment (ex : lundi→mercredi 14h vs lundi→mercredi 14h)
  const finPrec = new Date(debutPrec.getTime() + (maintenant - debut));

  const barres = barresVides(periode, debut);
  const produits = new Map();
  const vendeurs = new Map();
  const paiements = new Map();
  let total = 0, nb = 0, totalPrec = 0;
  let marge = 0, margeConnue = false, remises = 0, aCredit = 0;

  for (const v of ventes) {
    if (v.annulee) continue;
    const d = new Date(v.date);
    if (d >= debutPrec && d < finPrec) totalPrec += v.total;
    if (d < debut || d > maintenant) continue;

    total += v.total;
    nb++;
    barres[indexBarre(periode, d)].valeur += v.total;
    cumuler(vendeurs, v.vendeurId, v.vendeurNom, v.total);
    cumuler(paiements, v.paiement, v.paiement, v.total);
    remises += v.remise || 0;
    if (v.paiement === 'Crédit') aCredit += v.total;
    // Marge brute = prix de vente − prix d'achat (si le prix d'achat est connu)
    const cout = coutVente(v);
    if (cout !== null) {
      marge += v.total - cout;
      margeConnue = true;
    }
    for (const l of v.lignes) {
      const coutLigne = l.coutUnitaire !== null && l.coutUnitaire !== undefined ? l.coutUnitaire * l.quantite : null;
      cumuler(produits, l.produitId, l.produitNom || l.nom.split(' – ')[0], l.total, l.quantite, coutLigne);
    }
  }

  // Dépenses de la période (les plus récentes d'abord)
  const depensesPeriode = depenses
    .filter((x) => {
      const d = new Date(x.date);
      return d >= debut && d <= maintenant;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalDepenses = depensesPeriode.reduce((s, x) => s + x.montant, 0);

  return {
    total,
    totalDepenses,
    depenses: depensesPeriode,
    solde: total - totalDepenses, // avant les autres charges éventuelles
    nb,
    marge: margeConnue ? marge : null,
    tauxMarge: margeConnue && total ? Math.round((marge / total) * 100) : null,
    remises,
    aCredit,
    panierMoyen: nb ? total / nb : 0,
    totalPrec,
    variation: totalPrec > 0 ? Math.round(((total - totalPrec) / totalPrec) * 100) : null,
    barres,
    produits: classer(produits),
    vendeurs: classer(vendeurs),
    paiements: classer(paiements),
  };
}

export const LIBELLES_PERIODE = {
  jour: { titre: "Aujourd'hui", prec: 'hier à la même heure' },
  semaine: { titre: 'Cette semaine', prec: 'la semaine dernière' },
  mois: { titre: 'Ce mois-ci', prec: 'le mois dernier' },
  annee: { titre: 'Cette année', prec: "l'an dernier" },
};
