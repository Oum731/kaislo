// ------------------------------------------------------------
// TARIFS KAISLO : une formule par métier.
// Chaque formule comprend 1 poste (point d'impression) avec jusqu'à 5 vendeurs,
// plus le gérant. Au-delà de 5 vendeurs, il faut un poste de plus.
//
// Les mêmes valeurs existent côté serveur (api/lib/tarifs.php) : à garder identiques.
// L'équipe Amorac peut modifier les prix dans l'espace Amorac → Tarifs.
// MAD et FCFA : grille officielle. EUR, CAD, USD, GNF : conversions arrondies (à confirmer).
//
// Les prix de la grille sont ceux des clients inscrits AVEC un code parrain (les tarifs actuels, inchangés).
// Les nouveaux clients SANS code paient le prix catalogue = prix ÷ (1 − remise parrain), arrondi au pas supérieur :
// le code donne ainsi une vraie remise sans baisser les tarifs actuels. Les commerces inscrits avant
// REGLES_TARIFS.catalogueDepuis gardent leur prix actuel. Même calcul côté serveur (api/lib/tarifs.php).
// ------------------------------------------------------------

export const VENDEURS_PAR_POSTE = 5;

// Taux de change de la grille : combien d'unités de chaque devise pour 1 euro (le FCFA est fixe : 655,957).
// Changer un prix dans une devise recalcule les autres avec ces taux (espace Amorac → Tarifs).
export const TAUX_CHANGE = { EUR: 1, FCFA: 655.957, MAD: 10.8, CAD: 1.5, USD: 1.1, GNF: 9840 };

/**
 * Arrondi « prix » d'une devise : MAD terminé par 9 (149, 169…), FCFA à 500, GNF à 5 000, euro/CAD/USD à l'unité.
 */
export function arrondiPrix(montant, devise) {
  if (!(montant > 0)) return 0;
  if (devise === 'MAD') return Math.max(9, Math.ceil((montant - 0.5) / 10) * 10 - 1);
  const pas = { FCFA: 500, GNF: 5000 }[devise] || 1;
  return Math.max(pas, Math.round(montant / pas) * pas);
}

/** Convertit un montant d'une devise à une autre (via l'euro) avec l'arrondi « prix » de la devise d'arrivée. */
export function convertirPrix(montant, depuis, vers, taux = TAUX_CHANGE) {
  if (depuis === vers) return montant;
  const t = { ...TAUX_CHANGE, ...taux };
  return arrondiPrix((montant / t[depuis]) * t[vers], vers);
}

/** Tous les prix d'une grille à partir d'un montant dans une devise ; la devise saisie garde sa valeur exacte. */
export function prixTouteDevise(montant, devise, devises, taux = TAUX_CHANGE) {
  const r = {};
  for (const d of devises) r[d] = d === devise ? montant : convertirPrix(montant, devise, d, taux);
  return r;
}

export const FORMULES = [
  {
    id: 'epicerie', nom: 'Épicerie', famille: 'Commerce de proximité',
    types: ['epicerie'],
    prix: { MAD: 199, FCFA: 12000, EUR: 18, CAD: 27, USD: 20, GNF: 180000 },
    prixPoste: { MAD: 49, FCFA: 3000, EUR: 5, CAD: 7, USD: 5, GNF: 45000 },
  },
  {
    id: 'proximite', nom: 'Commerce de proximité', famille: 'Commerce de proximité',
    types: ['boutique', 'telephonie', 'librairie', 'beaute', 'autre'],
    prix: { MAD: 149, FCFA: 9000, EUR: 14, CAD: 21, USD: 15, GNF: 135000 },
    prixPoste: { MAD: 49, FCFA: 3000, EUR: 5, CAD: 7, USD: 5, GNF: 45000 },
  },
  {
    id: 'maquis', nom: 'Maquis et boulangerie', famille: 'Restauration et boissons',
    types: ['maquis', 'boulangerie'],
    prix: { MAD: 169, FCFA: 10000, EUR: 15, CAD: 23, USD: 17, GNF: 150000 },
    prixPoste: { MAD: 69, FCFA: 4000, EUR: 6, CAD: 9, USD: 7, GNF: 60000 },
  },
  {
    id: 'restaurant', nom: 'Restaurant et bar', famille: 'Restauration et boissons',
    types: ['restaurant', 'bar'],
    prix: { MAD: 199, FCFA: 12000, EUR: 18, CAD: 27, USD: 20, GNF: 180000 },
    prixPoste: { MAD: 69, FCFA: 4000, EUR: 6, CAD: 9, USD: 7, GNF: 60000 },
  },
  {
    id: 'quincaillerie', nom: 'Quincaillerie', famille: 'Commerces professionnels',
    types: ['quincaillerie'],
    prix: { MAD: 269, FCFA: 16000, EUR: 24, CAD: 37, USD: 27, GNF: 240000 },
    prixPoste: { MAD: 89, FCFA: 5000, EUR: 8, CAD: 11, USD: 8, GNF: 75000 },
  },
  {
    id: 'pro', nom: 'Commerce de gros', famille: 'Commerces professionnels',
    types: ['grossiste', 'pharmacie'], // « pharmacie » : anciens commerces seulement (plus proposé à l'inscription)
    prix: { MAD: 319, FCFA: 19000, EUR: 29, CAD: 43, USD: 32, GNF: 285000 },
    prixPoste: { MAD: 89, FCFA: 5000, EUR: 8, CAD: 11, USD: 8, GNF: 75000 },
  },
];

// Règles communes (modifiables dans l'espace Amorac → Tarifs)
export const REGLES_TARIFS = {
  taux: TAUX_CHANGE, // devises pour 1 euro : une modification de prix dans une devise recalcule les autres
  moisOffertsAnnuel: 2, // paiement annuel : 12 mois pour le prix de 10
  remiseFondateur: 20, // % de remise à vie
  placesFondateur: 20, // pour les 20 premiers clients
  remiseParrain: 10, // % de remise pour un client inscrit avec un code parrain (par rapport au prix catalogue)
  remiseMultiCommerce: 10, // % de remise sur le 2e commerce et les suivants d'un même gérant (une activité = un abonnement)
  catalogueActif: true, // prix catalogue pour les nouveaux clients sans code
  catalogueDepuis: '2026-10-06', // les commerces inscrits avant cette date gardent leur prix actuel
};

// Formule correspondant à l'activité du commerce
export function formuleDuType(typeId, formules = FORMULES) {
  return formules.find((f) => f.types?.includes(typeId)) || formules.find((f) => f.id === 'proximite') || formules[0];
}

/**
 * Prix d'un abonnement.
 * postes : nombre total de postes (1 inclus) · mois : 1, 3, 6 ou 12 (12 = 2 mois offerts)
 * Renvoie { parMois, total, base, supplement, remise } dans la devise demandée.
 */
export function prixAbonnement({ formule, devise, postes = 1, mois = 1, fondateur = false, regles = REGLES_TARIFS, mode = 'base', multi = false }) {
  const catalogue = mode === 'catalogue';
  const base = catalogue ? prixCatalogue(formule?.prix?.[devise] ?? 0, devise, regles.remiseParrain) : (formule?.prix?.[devise] ?? 0);
  const prixPoste = catalogue ? prixCatalogue(formule?.prixPoste?.[devise] ?? 0, devise, regles.remiseParrain) : (formule?.prixPoste?.[devise] ?? 0);
  const supplement = Math.max(0, postes - 1) * prixPoste;
  // La remise du 2e commerce et suivants s'ajoute à la remise fondateur
  const coefRemise = (fondateur ? 1 - (regles.remiseFondateur || 0) / 100 : 1) * (multi ? 1 - (regles.remiseMultiCommerce || 0) / 100 : 1);
  const parMois = arrondir((base + supplement) * coefRemise, devise);
  const moisFactures = mois === 12 ? 12 - (regles.moisOffertsAnnuel || 0) : mois;
  return { base, supplement, remise: fondateur ? regles.remiseFondateur : 0, parMois, total: arrondir(parMois * moisFactures, devise) };
}

/**
 * Les jours offerts (parrainage) comptent dans le mois : le client ne paie que les jours restants (30 jours par mois).
 * Identique à prixApresJoursOfferts (api/lib/tarifs.php). Renvoie { deduits, joursPayes, montant }.
 */
export function prixApresJoursOfferts(total, mois, joursOfferts, devise) {
  const jours = mois * 30;
  const deduits = Math.max(0, Math.min(Number(joursOfferts) || 0, jours - 1));
  return { deduits, joursPayes: jours - deduits, montant: deduits ? arrondir(total * (jours - deduits) / jours, devise) : total };
}

/** Prix catalogue d'un montant de la grille : montant ÷ (1 − remise parrain), arrondi au pas supérieur. */
export function prixCatalogue(montant, devise, remise = REGLES_TARIFS.remiseParrain) {
  if (!(montant > 0) || !(remise > 0)) return montant || 0;
  const pas = { GNF: 5000, FCFA: 500, MAD: 5 }[devise] || 1;
  return Math.ceil(montant / (1 - remise / 100) / pas - 1e-9) * pas;
}

/** « catalogue » pour un nouveau client sans code parrain, « base » avec un code (ou inscrit avant la date de début). */
export function modeTarif({ commercialId, creeLe }, regles = REGLES_TARIFS) {
  if (!regles.catalogueActif || commercialId) return 'base';
  return String(creeLe || '').slice(0, 10) >= regles.catalogueDepuis ? 'catalogue' : 'base';
}

/** Le prix catalogue est-il en vigueur aujourd'hui pour un nouveau client ? (affichage des prix publics) */
export function catalogueEnVigueur(regles = REGLES_TARIFS, date = new Date()) {
  return !!regles.catalogueActif && date.toISOString().slice(0, 10) >= regles.catalogueDepuis;
}

/** Remise réelle (%) obtenue avec un code parrain, pour une formule et une devise. */
export function remiseCodeParrain(formule, devise, regles = REGLES_TARIFS) {
  const base = formule?.prix?.[devise] ?? 0;
  const cat = prixCatalogue(base, devise, regles.remiseParrain);
  return cat > 0 ? Math.round((1 - base / cat) * 100) : 0;
}

// Arrondi lisible : unité pour MAD/EUR/CAD/USD, centaine pour FCFA, millier pour GNF
function arrondir(montant, devise) {
  const pas = devise === 'GNF' ? 1000 : devise === 'FCFA' ? 100 : 1;
  return Math.round(montant / pas) * pas;
}
