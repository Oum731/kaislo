// ------------------------------------------------------------
// TARIFS KAISLO : une formule par métier.
// Chaque formule comprend 1 poste (point d'impression) avec jusqu'à 5 vendeurs,
// plus le gérant. Au-delà de 5 vendeurs, il faut un poste de plus.
//
// Les mêmes valeurs existent côté serveur (api/lib/tarifs.php) : à garder identiques.
// L'équipe Amorac peut modifier les prix dans l'espace Amorac → Tarifs.
// MAD et FCFA : grille officielle. EUR, CAD, USD, GNF : conversions arrondies (à confirmer).
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
export function prixAbonnement({ formule, devise, postes = 1, mois = 1, fondateur = false, regles = REGLES_TARIFS }) {
  const base = formule?.prix?.[devise] ?? 0;
  const supplement = Math.max(0, postes - 1) * (formule?.prixPoste?.[devise] ?? 0);
  const coefRemise = fondateur ? 1 - (regles.remiseFondateur || 0) / 100 : 1;
  const parMois = arrondir((base + supplement) * coefRemise, devise);
  const moisFactures = mois === 12 ? 12 - (regles.moisOffertsAnnuel || 0) : mois;
  return { base, supplement, remise: fondateur ? regles.remiseFondateur : 0, parMois, total: arrondir(parMois * moisFactures, devise) };
}

// Arrondi lisible : unité pour MAD/EUR/CAD/USD, centaine pour FCFA, millier pour GNF
function arrondir(montant, devise) {
  const pas = devise === 'GNF' ? 1000 : devise === 'FCFA' ? 100 : 1;
  return Math.round(montant / pas) * pas;
}
