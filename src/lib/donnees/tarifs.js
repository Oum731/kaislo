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

export const FORMULES = [
  {
    id: 'proximite', nom: 'Commerce de proximité', famille: 'Commerce de proximité',
    types: ['epicerie', 'boutique', 'telephonie', 'librairie', 'beaute', 'autre'],
    prix: { MAD: 149, FCFA: 9000, EUR: 14, CAD: 21, USD: 15, GNF: 135000 },
    prixPoste: { MAD: 49, FCFA: 3000, EUR: 5, CAD: 7, USD: 5, GNF: 45000 },
  },
  {
    id: 'maquis', nom: 'Maquis et boulangerie', famille: 'Restauration et boissons',
    types: ['maquis', 'boulangerie'],
    prix: { MAD: 169, FCFA: 10000, EUR: 16, CAD: 24, USD: 17, GNF: 150000 },
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
    prix: { MAD: 269, FCFA: 16000, EUR: 25, CAD: 37, USD: 27, GNF: 240000 },
    prixPoste: { MAD: 89, FCFA: 5000, EUR: 8, CAD: 12, USD: 9, GNF: 75000 },
  },
  {
    id: 'pro', nom: 'Pharmacie et commerce de gros', famille: 'Commerces professionnels',
    types: ['pharmacie', 'grossiste'],
    prix: { MAD: 319, FCFA: 19000, EUR: 29, CAD: 44, USD: 32, GNF: 285000 },
    prixPoste: { MAD: 89, FCFA: 5000, EUR: 8, CAD: 12, USD: 9, GNF: 75000 },
  },
];

// Règles communes (modifiables dans l'espace Amorac → Tarifs)
export const REGLES_TARIFS = {
  moisOffertsAnnuel: 2, // paiement annuel : 12 mois pour le prix de 10
  remiseFondateur: 20, // % de remise à vie
  placesFondateur: 20, // pour les 20 premiers clients
  remiseParrain: 10, // % de remise pour un client inscrit avec un code parrain (par rapport au prix catalogue)
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
export function prixAbonnement({ formule, devise, postes = 1, mois = 1, fondateur = false, regles = REGLES_TARIFS, mode = 'base' }) {
  const catalogue = mode === 'catalogue';
  const base = catalogue ? prixCatalogue(formule?.prix?.[devise] ?? 0, devise, regles.remiseParrain) : (formule?.prix?.[devise] ?? 0);
  const prixPoste = catalogue ? prixCatalogue(formule?.prixPoste?.[devise] ?? 0, devise, regles.remiseParrain) : (formule?.prixPoste?.[devise] ?? 0);
  const supplement = Math.max(0, postes - 1) * prixPoste;
  const coefRemise = fondateur ? 1 - (regles.remiseFondateur || 0) / 100 : 1;
  const parMois = arrondir((base + supplement) * coefRemise, devise);
  const moisFactures = mois === 12 ? 12 - (regles.moisOffertsAnnuel || 0) : mois;
  return { base, supplement, remise: fondateur ? regles.remiseFondateur : 0, parMois, total: arrondir(parMois * moisFactures, devise) };
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
