// ------------------------------------------------------------
// MODÈLES utilisés à la création d'un commerce :
// types de commerce, pays (devise + paiements), catégories de départ.
// ------------------------------------------------------------

// Mode de paiement spécial : la vente est notée dans le carnet du client
export const CREDIT = 'Crédit';

// Types de commerce.
//  gereStock : scan code-barres + suivi du stock
//  tables    : commandes ouvertes par table + ticket cuisine
export const TYPES_COMMERCE = [
  { id: 'restaurant', nom: 'Restaurant / maquis', emoji: '🍽️', description: 'Tables, ticket cuisine, plats avec options', gereStock: false, tables: true },
  { id: 'epicerie', nom: 'Épicerie / supérette', emoji: '🛒', description: 'Code-barres, stock, carnet de crédit', gereStock: true, tables: false },
  { id: 'autre', nom: 'Autre commerce', emoji: '🏪', description: 'Boutique, quincaillerie, cosmétiques…', gereStock: true, tables: false },
];

export function typeCommerce(id) {
  return TYPES_COMMERCE.find((t) => t.id === id) || TYPES_COMMERCE[0];
}

// Pays proposés : la devise, les modes de paiement et l'indicatif
// téléphonique (pour WhatsApp) en découlent. "ville" sert aux démos.
export const PAYS = [
  { id: 'MA', nom: 'Maroc', devise: 'MAD', indicatif: '212', ville: 'Casablanca', paiements: ['Espèces', 'Carte'] },
  { id: 'CI', nom: 'Côte d’Ivoire', devise: 'FCFA', indicatif: '225', ville: 'Abidjan', paiements: ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Carte'] },
  { id: 'SN', nom: 'Sénégal', devise: 'FCFA', indicatif: '221', ville: 'Dakar', paiements: ['Espèces', 'Wave', 'Orange Money', 'Free Money', 'Carte'] },
  { id: 'ML', nom: 'Mali', devise: 'FCFA', indicatif: '223', ville: 'Bamako', paiements: ['Espèces', 'Orange Money', 'Moov Money', 'Carte'] },
  { id: 'BF', nom: 'Burkina Faso', devise: 'FCFA', indicatif: '226', ville: 'Ouagadougou', paiements: ['Espèces', 'Orange Money', 'Moov Money', 'Carte'] },
  { id: 'BJ', nom: 'Bénin', devise: 'FCFA', indicatif: '229', ville: 'Cotonou', paiements: ['Espèces', 'MTN MoMo', 'Moov Money', 'Carte'] },
  { id: 'TG', nom: 'Togo', devise: 'FCFA', indicatif: '228', ville: 'Lomé', paiements: ['Espèces', 'Flooz', 'T-Money', 'Carte'] },
  { id: 'NE', nom: 'Niger', devise: 'FCFA', indicatif: '227', ville: 'Niamey', paiements: ['Espèces', 'Airtel Money', 'Moov Money', 'Carte'] },
  { id: 'GN', nom: 'Guinée', devise: 'GNF', indicatif: '224', ville: 'Conakry', paiements: ['Espèces', 'Orange Money', 'MTN MoMo', 'Carte'] },
  { id: 'CM', nom: 'Cameroun', devise: 'FCFA', indicatif: '237', ville: 'Douala', paiements: ['Espèces', 'Orange Money', 'MTN MoMo', 'Carte'] },
  { id: 'GA', nom: 'Gabon', devise: 'FCFA', indicatif: '241', ville: 'Libreville', paiements: ['Espèces', 'Airtel Money', 'Moov Money', 'Carte'] },
  { id: 'CG', nom: 'Congo', devise: 'FCFA', indicatif: '242', ville: 'Brazzaville', paiements: ['Espèces', 'MTN MoMo', 'Airtel Money', 'Carte'] },
  { id: 'FR', nom: 'France', devise: 'EUR', indicatif: '33', ville: 'Paris', paiements: ['Espèces', 'Carte', 'Ticket resto'] },
  { id: 'BE', nom: 'Belgique', devise: 'EUR', indicatif: '32', ville: 'Bruxelles', paiements: ['Espèces', 'Carte', 'Payconiq'] },
  { id: 'CA', nom: 'Canada', devise: 'CAD', indicatif: '1', ville: 'Montréal', paiements: ['Espèces', 'Carte', 'Interac'] },
  { id: 'XX', nom: 'Autre pays (dollar US)', devise: 'USD', indicatif: '', ville: '', paiements: ['Espèces', 'Carte', 'Mobile money'] },
];

export function paysParId(id) {
  return PAYS.find((p) => p.id === id) || PAYS[0];
}

// Pays deviné à partir de la langue du navigateur (fr-CI -> Côte d'Ivoire)
export function paysDuNavigateur() {
  if (typeof navigator === 'undefined') return 'MA';
  const region = (navigator.language || '').split('-')[1]?.toUpperCase();
  return PAYS.some((p) => p.id === region) ? region : 'MA';
}

// Clé d'identification d'un numéro : ses 9 derniers chiffres.
// "06 12 34 56 78", "+212 6 12 34 56 78" et "00212612345678" donnent la même clé.
export function cleTelephone(telephone) {
  const chiffres = String(telephone || '').replace(/\D/g, '');
  return chiffres.length >= 8 ? chiffres.slice(-9) : '';
}

// Numéro au format international pour WhatsApp : "06 12 34 56 78" -> "212612345678"
export function numeroWhatsApp(telephone, paysId) {
  let n = String(telephone || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n.slice(1);
  if (n.startsWith('00')) return n.slice(2);
  const ind = paysParId(paysId).indicatif;
  if (ind && n.startsWith(ind) && n.length > 9) return n;
  if (n.startsWith('0') && !['CI', 'BJ', 'TG'].includes(paysId)) n = n.slice(1); // 0 de tête national
  return (ind || '') + n;
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

// Tables proposées à un nouveau restaurant
export const TABLES_DEPART = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'À emporter'];

export const CATEGORIES_DEPENSES = ['Achats / marchandises', 'Gaz / charbon', 'Transport', 'Salaires', 'Loyer / électricité', 'Autre'];

export const COULEURS = ['vert', 'safran', 'terre', 'bleu', 'prune'];
