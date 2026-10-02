// ------------------------------------------------------------
// MODÈLES utilisés à la création d'un commerce :
// types de commerce, pays (devise + paiements), catégories de départ.
// ------------------------------------------------------------

// Types de commerce. "gereStock" = scan code-barres + suivi du stock.
export const TYPES_COMMERCE = [
  { id: 'restaurant', nom: 'Restaurant / maquis', emoji: '🍽️', description: 'Plats, boissons, accompagnements', gereStock: false },
  { id: 'epicerie', nom: 'Épicerie / supérette', emoji: '🛒', description: 'Code-barres, stock, alertes de rupture', gereStock: true },
  { id: 'autre', nom: 'Autre commerce', emoji: '🏪', description: 'Boutique, quincaillerie, cosmétiques…', gereStock: true },
];

export function typeCommerce(id) {
  return TYPES_COMMERCE.find((t) => t.id === id) || TYPES_COMMERCE[0];
}

// Pays proposés : la devise et les modes de paiement en découlent
export const PAYS = [
  { id: 'CI', nom: 'Côte d’Ivoire', devise: 'FCFA', paiements: ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Carte'] },
  { id: 'SN', nom: 'Sénégal', devise: 'FCFA', paiements: ['Espèces', 'Wave', 'Orange Money', 'Free Money', 'Carte'] },
  { id: 'MA', nom: 'Maroc', devise: 'MAD', paiements: ['Espèces', 'Carte'] },
  { id: 'ML', nom: 'Mali', devise: 'FCFA', paiements: ['Espèces', 'Orange Money', 'Moov Money', 'Carte'] },
  { id: 'BF', nom: 'Burkina Faso', devise: 'FCFA', paiements: ['Espèces', 'Orange Money', 'Moov Money', 'Carte'] },
  { id: 'BJ', nom: 'Bénin', devise: 'FCFA', paiements: ['Espèces', 'MTN MoMo', 'Moov Money', 'Carte'] },
  { id: 'TG', nom: 'Togo', devise: 'FCFA', paiements: ['Espèces', 'Flooz', 'T-Money', 'Carte'] },
  { id: 'CM', nom: 'Cameroun', devise: 'FCFA', paiements: ['Espèces', 'Orange Money', 'MTN MoMo', 'Carte'] },
];

export function paysParId(id) {
  return PAYS.find((p) => p.id === id) || PAYS[0];
}

// Catégories créées automatiquement (le gérant peut les modifier ensuite)
export const CATEGORIES_DEPART = {
  restaurant: [
    { nom: 'Plats', couleur: 'vert' },
    { nom: 'Grillades', couleur: 'terre' },
    { nom: 'Boissons', couleur: 'bleu' },
    { nom: 'Desserts', couleur: 'safran' },
  ],
  epicerie: [
    { nom: 'Épicerie', couleur: 'safran' },
    { nom: 'Boissons', couleur: 'bleu' },
    { nom: 'Produits laitiers', couleur: 'vert' },
    { nom: 'Hygiène', couleur: 'prune' },
    { nom: 'Fruits & légumes', couleur: 'terre' },
  ],
  autre: [
    { nom: 'Articles', couleur: 'vert' },
    { nom: 'Accessoires', couleur: 'bleu' },
  ],
};
