// ------------------------------------------------------------
// MODÈLES utilisés à la création d'un commerce :
// types de commerce, pays (devise + paiements), catégories de départ.
// ------------------------------------------------------------
import { normaliserTelephone } from './telephone.js';

// Mode de paiement spécial : la vente est notée dans le carnet du client
export const CREDIT = 'Crédit';

// Types d'activité : chacun a ses catégories de départ, son unité habituelle,
// et le stock et/ou les tables activés par défaut (modifiables dans Réglages).
//  gereStock : scan code-barres + suivi du stock et inventaire
//  tables    : commandes ouvertes par table + ticket cuisine
//  unite     : unité proposée pour les nouveaux articles
export const TYPES_COMMERCE = [
  { id: 'restaurant', nom: 'Restaurant', icone: 'cuisine', description: 'Tables, ticket cuisine, plats avec accompagnements', gereStock: false, tables: true, unite: 'portion' },
  { id: 'maquis', nom: 'Maquis / snack / fast-food', icone: 'caisse', description: 'Service rapide, grillades, boissons', gereStock: true, tables: true, unite: 'portion' },
  { id: 'bar', nom: 'Bar / café / lounge', icone: 'tables', description: 'Tables, boissons, stock des bouteilles', gereStock: true, tables: true, unite: 'bouteille' },
  { id: 'boulangerie', nom: 'Boulangerie / pâtisserie', icone: 'etoile', description: 'Pains, viennoiseries, gâteaux sur commande', gereStock: true, tables: false, unite: 'pièce' },
  { id: 'epicerie', nom: 'Épicerie / supérette / alimentation', icone: 'caisse', description: 'Code-barres, stock, carnet de crédit', gereStock: true, tables: false, unite: 'pièce' },
  { id: 'grossiste', nom: 'Grossiste / dépôt / distributeur', icone: 'stock', description: 'Cartons, sacs, gros volumes, crédit clients', gereStock: true, tables: false, unite: 'carton' },
  { id: 'boutique', nom: 'Boutique de vêtements / chaussures', icone: 'produits', description: 'Tailles, couleurs, stock par article', gereStock: true, tables: false, unite: 'pièce' },
  { id: 'quincaillerie', nom: 'Quincaillerie / matériaux', icone: 'reglages', description: 'Outillage, au mètre ou au kilo, gros stock', gereStock: true, tables: false, unite: 'pièce' },
  { id: 'pharmacie', nom: 'Pharmacie / parapharmacie', icone: 'bouclier', description: 'Médicaments, hygiène, alertes de rupture', gereStock: true, tables: false, unite: 'boîte' },
  { id: 'beaute', nom: 'Cosmétiques / beauté / salon', icone: 'photo', description: 'Produits de beauté et prestations', gereStock: true, tables: false, unite: 'pièce' },
  { id: 'telephonie', nom: 'Téléphonie / électronique', icone: 'telephone', description: 'Téléphones, accessoires, crédit, réparations', gereStock: true, tables: false, unite: 'pièce' },
  { id: 'librairie', nom: 'Librairie / papeterie', icone: 'carnet', description: 'Livres, fournitures scolaires et de bureau', gereStock: true, tables: false, unite: 'pièce' },
  { id: 'autre', nom: 'Autre commerce ou service', icone: 'menu', description: 'Tout ce qui se vend ou se stocke', gereStock: true, tables: false, unite: 'pièce' },
];

// Unités de mesure des articles (stock et inventaire, au détail ou en gros)
export const UNITES = ['pièce', 'kg', 'g', 'litre', 'mètre', 'carton', 'sac', 'paquet', 'boîte', 'bouteille', 'portion', 'lot', 'prestation'];

export function typeCommerce(id) {
  return TYPES_COMMERCE.find((t) => t.id === id) || TYPES_COMMERCE.find((t) => t.id === 'autre');
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

// Clé LOCALE d'un numéro (démos et comptes gardés dans l'appareil) : ses 9 derniers chiffres.
// Les comptes en ligne utilisent le format international (voir telephone.js).
// "06 12 34 56 78", "+212 6 12 34 56 78" et "00212612345678" donnent la même clé.
export function cleTelephone(telephone) {
  const chiffres = String(telephone || '').replace(/\D/g, '');
  return chiffres.length >= 8 ? chiffres.slice(-9) : '';
}

// Numéro au format international pour WhatsApp : « 06 12 34 56 78 » (Maroc) -> « 212612345678 »
export function numeroWhatsApp(telephone, paysId) {
  const n = normaliserTelephone(telephone, paysId);
  return n.ok ? n.e164.slice(1) : String(telephone || '').replace(/\D/g, '');
}

// Catégories créées automatiquement (le gérant peut les modifier ensuite)
export const CATEGORIES_DEPART = {
  restaurant: [
    { nom: 'Plats', couleur: 'vert' },
    { nom: 'Grillades', couleur: 'terre' },
    { nom: 'Boissons', couleur: 'bleu' },
    { nom: 'Desserts', couleur: 'safran' },
  ],
  maquis: [
    { nom: 'Plats', couleur: 'vert' },
    { nom: 'Grillades', couleur: 'terre' },
    { nom: 'Accompagnements', couleur: 'safran' },
    { nom: 'Boissons', couleur: 'bleu' },
  ],
  bar: [
    { nom: 'Bières', couleur: 'safran' },
    { nom: 'Sodas et jus', couleur: 'bleu' },
    { nom: 'Vins et alcools', couleur: 'prune' },
    { nom: 'Cocktails', couleur: 'terre' },
    { nom: 'Grignotage', couleur: 'vert' },
  ],
  boulangerie: [
    { nom: 'Pains', couleur: 'safran' },
    { nom: 'Viennoiseries', couleur: 'terre' },
    { nom: 'Pâtisseries', couleur: 'prune' },
    { nom: 'Boissons', couleur: 'bleu' },
  ],
  epicerie: [
    { nom: 'Épicerie', couleur: 'safran' },
    { nom: 'Boissons', couleur: 'bleu' },
    { nom: 'Produits laitiers', couleur: 'vert' },
    { nom: 'Hygiène', couleur: 'prune' },
    { nom: 'Fruits & légumes', couleur: 'terre' },
  ],
  grossiste: [
    { nom: 'Alimentaire', couleur: 'safran' },
    { nom: 'Boissons', couleur: 'bleu' },
    { nom: 'Hygiène et entretien', couleur: 'prune' },
    { nom: 'Divers', couleur: 'vert' },
  ],
  boutique: [
    { nom: 'Femmes', couleur: 'prune' },
    { nom: 'Hommes', couleur: 'bleu' },
    { nom: 'Enfants', couleur: 'safran' },
    { nom: 'Chaussures', couleur: 'terre' },
    { nom: 'Accessoires', couleur: 'vert' },
  ],
  quincaillerie: [
    { nom: 'Outillage', couleur: 'terre' },
    { nom: 'Plomberie', couleur: 'bleu' },
    { nom: 'Électricité', couleur: 'safran' },
    { nom: 'Peinture', couleur: 'prune' },
    { nom: 'Matériaux', couleur: 'vert' },
  ],
  pharmacie: [
    { nom: 'Médicaments', couleur: 'vert' },
    { nom: 'Hygiène', couleur: 'bleu' },
    { nom: 'Bébé', couleur: 'safran' },
    { nom: 'Parapharmacie', couleur: 'prune' },
  ],
  beaute: [
    { nom: 'Soins', couleur: 'vert' },
    { nom: 'Cheveux', couleur: 'terre' },
    { nom: 'Maquillage', couleur: 'prune' },
    { nom: 'Prestations', couleur: 'safran' },
  ],
  telephonie: [
    { nom: 'Téléphones', couleur: 'bleu' },
    { nom: 'Accessoires', couleur: 'vert' },
    { nom: 'Crédit et forfaits', couleur: 'safran' },
    { nom: 'Réparations', couleur: 'terre' },
  ],
  librairie: [
    { nom: 'Livres', couleur: 'terre' },
    { nom: 'Fournitures scolaires', couleur: 'safran' },
    { nom: 'Bureau', couleur: 'bleu' },
    { nom: 'Impression et photocopie', couleur: 'vert' },
  ],
  autre: [
    { nom: 'Articles', couleur: 'vert' },
    { nom: 'Accessoires', couleur: 'bleu' },
    { nom: 'Services', couleur: 'safran' },
  ],
};

// Tables proposées à un nouveau restaurant
export const TABLES_DEPART = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'À emporter'];

export const CATEGORIES_DEPENSES = ['Achats / marchandises', 'Gaz / charbon', 'Transport', 'Salaires', 'Loyer / électricité', 'Autre'];

export const COULEURS = ['vert', 'safran', 'terre', 'bleu', 'prune'];
